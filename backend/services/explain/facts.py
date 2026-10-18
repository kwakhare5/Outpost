"""Facts builder for recommendation explanations.

Reads ONLY real DB values and computes strictly grounded derived metrics.
Never introduces hardcoded heuristics, cost multipliers, or synthetic defaults.
"""
from __future__ import annotations

import math
import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.core import Batch, Forecast, Inventory, Product, Recommendation, Risk, Store, Supplier
from backend.models.enums import RiskType


async def build_facts(
    db: AsyncSession,
    rec: Recommendation | uuid.UUID | str,
) -> dict[str, Any]:
    """Extract factual inventory, risk, and action data from DB.

    Excluded per spec:
    - hours_to_expiry 48.0 in HoldInput
    - availability 0.95/0.80
    - Rs 15/km and Rs 25/unit cost constants
    - 5.0 km default distance
    - 48h demand assumption
    """
    if isinstance(rec, (str, uuid.UUID)):
        rec_id = uuid.UUID(str(rec))
        rec_obj = await db.get(Recommendation, rec_id)
        if rec_obj is None:
            raise ValueError(f"Recommendation {rec_id} not found")
        rec = rec_obj

    action_type = rec.action_type.value if hasattr(rec.action_type, "value") else str(rec.action_type).lower()
    quantity = int(rec.quantity)

    # 1. Risk
    risk: Risk | None = None
    if rec.risk_id:
        risk = await db.get(Risk, rec.risk_id)

    risk_probability = float(risk.probability) if risk and risk.probability is not None else None
    risk_severity = (
        risk.severity.value if risk and hasattr(risk.severity, "value")
        else (str(risk.severity).lower() if risk and risk.severity is not None else None)
    )
    product_id = risk.product_id if risk else None
    risk_store_id = risk.store_id if risk else None

    # 2. Product & Supplier
    product: Product | None = None
    supplier: Supplier | None = None
    if product_id:
        product = await db.get(Product, product_id)
        if product and product.supplier_id:
            supplier = await db.get(Supplier, product.supplier_id)

    product_name = product.name if product else "Unknown Product"
    supplier_lead_time_hours = int(supplier.lead_time_hours) if supplier and supplier.lead_time_hours is not None else None

    # 3. Stores
    dest_store_id = rec.destination_store_id or risk_store_id
    src_store_id = rec.source_store_id

    dest_store: Store | None = await db.get(Store, dest_store_id) if dest_store_id else None
    src_store: Store | None = await db.get(Store, src_store_id) if src_store_id else None

    destination_store_name = dest_store.name if dest_store else None
    source_store_name = src_store.name if src_store else None

    # 4. Destination Stock
    destination_stock: int | None = None
    if dest_store_id and product_id:
        inv_res = await db.execute(
            select(Inventory).where(
                Inventory.store_id == dest_store_id,
                Inventory.product_id == product_id,
            )
        )
        inv = inv_res.scalar_one_or_none()
        if inv and inv.quantity is not None:
            destination_stock = int(inv.quantity)

    # 5. Forecast predicted_demand
    predicted_demand: float | None = None
    if dest_store_id and product_id:
        fc_res = await db.execute(
            select(Forecast)
            .where(
                Forecast.store_id == dest_store_id,
                Forecast.product_id == product_id,
            )
            .order_by(Forecast.created_at.desc())
            .limit(1)
        )
        fc = fc_res.scalar_one_or_none()
        if fc and fc.predicted_demand is not None:
            predicted_demand = float(fc.predicted_demand)

    # 6. Hours to Stockout
    hours_to_stockout: float | None = None
    if destination_stock is not None and predicted_demand is not None and predicted_demand > 0:
        hourly_demand = predicted_demand / 24.0
        hours_to_stockout = round(destination_stock / hourly_demand, 1)
    elif risk and (risk.risk_type == RiskType.STOCKOUT or str(risk.risk_type).lower() == "stockout") and risk.expected_time:
        ref_time = rec.created_at or risk.created_at or datetime.now(timezone.utc).replace(tzinfo=None)
        ref = ref_time.replace(tzinfo=None) if hasattr(ref_time, "tzinfo") and ref_time.tzinfo else ref_time
        exp = risk.expected_time.replace(tzinfo=None) if hasattr(risk.expected_time, "tzinfo") and risk.expected_time.tzinfo else risk.expected_time
        hours_to_stockout = round(max(0.0, (exp - ref).total_seconds() / 3600.0), 1)

    # 7. Distance (only when both coordinates are real)
    distance_km: float | None = None
    if dest_store and src_store:
        d_lat = getattr(dest_store, "latitude", None)
        d_lon = getattr(dest_store, "longitude", None)
        s_lat = getattr(src_store, "latitude", None)
        s_lon = getattr(src_store, "longitude", None)
        if (
            d_lat is not None and d_lon is not None
            and s_lat is not None and s_lon is not None
            and (d_lat != 0.0 or d_lon != 0.0)
            and (s_lat != 0.0 or s_lon != 0.0)
        ):
            dlat = s_lat - d_lat
            dlon = s_lon - d_lon
            distance_km = round(math.sqrt(dlat**2 + dlon**2) * 111.0, 1)

    # 8. Batch Expiry Hours for discount / spoilage
    batch_expiry_hours: float | None = None
    is_spoilage = risk and (risk.risk_type == RiskType.SPOILAGE or str(risk.risk_type).lower() == "spoilage")
    if action_type == "discount" or is_spoilage:
        batch_store_id = src_store_id or dest_store_id
        if batch_store_id and product_id:
            batch_res = await db.execute(
                select(Batch)
                .where(
                    Batch.store_id == batch_store_id,
                    Batch.product_id == product_id,
                    Batch.quantity > 0,
                )
                .order_by(Batch.expires_at.asc())
                .limit(1)
            )
            earliest_batch = batch_res.scalar_one_or_none()
            ref_time = rec.created_at or (risk.created_at if risk else None) or datetime.now(timezone.utc).replace(tzinfo=None)
            ref = ref_time.replace(tzinfo=None) if hasattr(ref_time, "tzinfo") and ref_time.tzinfo else ref_time
            if earliest_batch and earliest_batch.expires_at:
                exp = earliest_batch.expires_at.replace(tzinfo=None) if hasattr(earliest_batch.expires_at, "tzinfo") and earliest_batch.expires_at.tzinfo else earliest_batch.expires_at
                batch_expiry_hours = round(max(0.0, (exp - ref).total_seconds() / 3600.0), 1)
            elif risk and risk.expected_time:
                exp = risk.expected_time.replace(tzinfo=None) if hasattr(risk.expected_time, "tzinfo") and risk.expected_time.tzinfo else risk.expected_time
                batch_expiry_hours = round(max(0.0, (exp - ref).total_seconds() / 3600.0), 1)

    return {
        "recommendation_id": str(rec.recommendation_id),
        "action_type": action_type,
        "quantity": quantity,
        "product_name": product_name,
        "destination_store_name": destination_store_name,
        "source_store_name": source_store_name,
        "destination_stock": destination_stock,
        "hours_to_stockout": hours_to_stockout,
        "risk_probability": risk_probability,
        "risk_severity": risk_severity,
        "predicted_demand": predicted_demand,
        "supplier_lead_time_hours": supplier_lead_time_hours,
        "distance_km": distance_km,
        "batch_expiry_hours": batch_expiry_hours,
    }
