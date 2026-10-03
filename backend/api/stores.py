"""Stores REST API — spec §32.3.

Endpoints:
    GET /api/stores                          — list all dark stores
    GET /api/stores/{store_id}               — store details
    GET /api/stores/{store_id}/inventory     — inventory with batch breakdown
    GET /api/stores/{store_id}/forecasts     — forecasts scoped to a store
"""
from __future__ import annotations

import csv
import io
import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models.core import Store, Inventory, Batch, Product, Forecast, Risk
from backend.api.schemas import (
    StoreResponse,
    StoreDetailResponse,
    StoreInventoryResponse,
    InventoryItemResponse,
    BatchResponse,
    ForecastResponse,
    RiskResponse,
)

router = APIRouter(prefix="/api/stores", tags=["stores"])


def _naive_now() -> datetime:
    """Return current UTC time as a naive datetime (timezone stripped).

    SQLite stores datetimes as naive strings. Using naive now lets us compare
    against SQLite batch.expires_at values without a TypeError.
    """
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _hours_remaining(expires_at: datetime) -> float:
    """Compute hours remaining until expiry, handling naive/aware mismatch."""
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    # If expires_at is timezone-aware, strip it for comparison
    if expires_at.tzinfo is not None:
        expires_naive = expires_at.replace(tzinfo=None)
    else:
        expires_naive = expires_at
    delta = expires_naive - now
    return max(0.0, delta.total_seconds() / 3600)


@router.get("", response_model=list[StoreResponse])
async def list_stores(db: AsyncSession = Depends(get_db)) -> list[StoreResponse]:
    """List all 5 dark stores."""
    result = await db.execute(select(Store).order_by(Store.name))
    return result.scalars().all()


@router.get("/{store_id}", response_model=StoreDetailResponse)
async def get_store(store_id: uuid.UUID, db: AsyncSession = Depends(get_db)) -> StoreDetailResponse:
    """Get a single store by ID."""
    store = await db.get(Store, store_id)
    if store is None:
        raise HTTPException(status_code=404, detail="Store not found")
    return store


@router.get("/{store_id}/inventory", response_model=StoreInventoryResponse)
async def get_store_inventory(
    store_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> StoreInventoryResponse:
    """Get inventory summary and active batch breakdown for a store."""
    store = await db.get(Store, store_id)
    if store is None:
        raise HTTPException(status_code=404, detail="Store not found")

    now = _naive_now()  # SQLite stores naive datetimes; use naive now for comparison

    # Inventory records
    inv_result = await db.execute(
        select(Inventory, Product)
        .join(Product, Inventory.product_id == Product.product_id)
        .where(Inventory.store_id == store_id)
        .order_by(Product.name)
    )
    inv_rows = inv_result.all()

    inventory_items = [
        InventoryItemResponse(
            product_id=row.Product.product_id,
            product_name=row.Product.name,
            category=row.Product.category.value if hasattr(row.Product.category, "value") else str(row.Product.category),
            quantity=row.Inventory.quantity,
            unit=row.Product.unit,
        )
        for row in inv_rows
    ]

    # Active (non-expired) batches
    batch_result = await db.execute(
        select(Batch)
        .where(Batch.store_id == store_id)
        .where(Batch.expires_at > now)
        .order_by(Batch.expires_at)
    )
    batch_rows = batch_result.scalars().all()

    batches = [
        BatchResponse(
            batch_id=b.batch_id,
            product_id=b.product_id,
            quantity=b.quantity,
            received_at=b.received_at,
            expires_at=b.expires_at,
            hours_remaining=_hours_remaining(b.expires_at),
        )
        for b in batch_rows
    ]

    return StoreInventoryResponse(
        store_id=store.store_id,
        store_name=store.name,
        inventory=inventory_items,
        batches=batches,
    )


@router.get("/{store_id}/forecasts", response_model=list[ForecastResponse])
async def get_store_forecasts(
    store_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> list[ForecastResponse]:
    """Get all forecasts for a given store, newest first."""
    store = await db.get(Store, store_id)
    if store is None:
        raise HTTPException(status_code=404, detail="Store not found")

    result = await db.execute(
        select(Forecast)
        .where(Forecast.store_id == store_id)
        .order_by(Forecast.created_at.desc())
    )
    return result.scalars().all()


@router.get("/{store_id}/risks", response_model=list[RiskResponse])
async def get_store_risks(
    store_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> list[RiskResponse]:
    """Get all risks for a given store, newest first."""
    store = await db.get(Store, store_id)
    if store is None:
        raise HTTPException(status_code=404, detail="Store not found")

    result = await db.execute(
        select(Risk)
        .where(Risk.store_id == store_id)
        .order_by(Risk.created_at.desc())
    )
    risks = result.scalars().all()
    return [
        RiskResponse(
            risk_id=r.risk_id,
            store_id=r.store_id,
            product_id=r.product_id,
            risk_type=r.risk_type.value if hasattr(r.risk_type, "value") else str(r.risk_type),
            severity=r.severity.value if hasattr(r.severity, "value") else str(r.severity),
            probability=r.probability,
            expected_time=r.expected_time,
            status=r.status.value if hasattr(r.status, "value") else str(r.status),
            created_at=r.created_at,
        )
        for r in risks
    ]


class CsvTextPayload(BaseModel):
    csv_text: str


class CsvUploadResponse(BaseModel):
    success: bool
    message: str
    total_stores: int
    total_stock: int
    stores: list[dict[str, Any]]
    recommendation: Optional[dict[str, Any]] = None


def _parse_and_evaluate_csv(content: str) -> CsvUploadResponse:
    reader = csv.DictReader(io.StringIO(content.strip()))
    stores = []

    for idx, row in enumerate(reader):
        clean_row = {k.strip().lower().replace(" ", "_"): v.strip() for k, v in row.items() if k}
        if not clean_row:
            continue

        code = clean_row.get("store_code") or clean_row.get("code") or f"ST-{idx+1:02d}"
        name = clean_row.get("store_name") or clean_row.get("name") or f"Store {code}"
        locality = clean_row.get("locality") or clean_row.get("location") or "Mumbai Metro"

        try:
            milk_units = max(0, int(float(clean_row.get("milk_units") or clean_row.get("units") or clean_row.get("stock") or 0)))
        except (ValueError, TypeError):
            milk_units = 0

        try:
            capacity = max(1, int(float(clean_row.get("capacity") or clean_row.get("max_capacity") or 50)))
        except (ValueError, TypeError):
            capacity = 50

        try:
            active_orders = max(0, int(float(clean_row.get("active_orders") or clean_row.get("orders") or clean_row.get("demand") or 10)))
        except (ValueError, TypeError):
            active_orders = 10

        burn_rate = max(0.5, active_orders / 4.0)
        stockout_hours = round(milk_units / burn_rate, 1)

        if stockout_hours < 5.0:
            status_type = "critical"
            status = f"Critical ({stockout_hours}h buffer)"
        elif milk_units > 35:
            status_type = "surplus"
            status = f"Surplus (+{max(0, milk_units - 25)} units safe)"
        else:
            status_type = "normal"
            status = "Normal"

        stores.append({
            "id": f"store-{code.lower()}",
            "code": code.upper(),
            "name": name,
            "locality": locality,
            "milkUnits": milk_units,
            "capacity": capacity,
            "status": status,
            "statusType": status_type,
            "nextExpiryHours": 40 + (idx * 2),
            "activeOrders": active_orders,
            "stockoutHours": stockout_hours,
        })

    if not stores:
        raise HTTPException(status_code=400, detail="No valid store rows found in CSV.")

    total_stock = sum(s["milkUnits"] for s in stores)

    # Solve best transfer recommendation
    critical_stores = [s for s in stores if s["statusType"] == "critical"]
    surplus_stores = [s for s in stores if s["statusType"] == "surplus" and s["milkUnits"] >= 20]

    recommendation = None
    if critical_stores and surplus_stores:
        dest = min(critical_stores, key=lambda s: s["stockoutHours"])
        source = max(surplus_stores, key=lambda s: s["milkUnits"])

        if source["id"] != dest["id"]:
            transfer_qty = min(20, source["milkUnits"] - 15)
            if transfer_qty > 0:
                recommendation = {
                    "id": f"REC-CSV-{uuid.uuid4().hex[:6].upper()}",
                    "sourceStoreId": source["id"],
                    "sourceStoreCode": source["code"],
                    "sourceStoreName": source["name"],
                    "sourcePreUnits": source["milkUnits"],
                    "sourcePostUnits": source["milkUnits"] - transfer_qty,
                    "destStoreId": dest["id"],
                    "destStoreCode": dest["code"],
                    "destStoreName": dest["name"],
                    "destPreUnits": dest["milkUnits"],
                    "destPostUnits": dest["milkUnits"] + transfer_qty,
                    "transferUnits": transfer_qty,
                    "corridor": f"{source['locality']} ➔ {dest['locality']} Express Van",
                    "etaMins": 22,
                    "vanId": "Van #MH-02",
                    "savingsInr": 1180,
                }

    return CsvUploadResponse(
        success=True,
        message=f"Successfully loaded {len(stores)} dark stores ({total_stock} total units).",
        total_stores=len(stores),
        total_stock=total_stock,
        stores=stores,
        recommendation=recommendation,
    )


@router.post("/upload-csv", response_model=CsvUploadResponse)
async def upload_stores_csv(file: UploadFile = File(...)) -> CsvUploadResponse:
    """Accept multipart CSV file upload, sanitize rows, and generate dynamic rebalance triage."""
    content_bytes = await file.read()
    content = content_bytes.decode("utf-8", errors="replace")
    return _parse_and_evaluate_csv(content)


@router.post("/upload-csv-text", response_model=CsvUploadResponse)
async def upload_stores_csv_text(payload: CsvTextPayload) -> CsvUploadResponse:
    """Accept raw CSV text in JSON body, sanitize rows, and generate dynamic rebalance triage."""
    return _parse_and_evaluate_csv(payload.csv_text)


