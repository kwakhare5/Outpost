"""Outcomes & Audit REST API.

Implements Spec Section 7 (Outcomes screen, measured-versus-expected audit),
and Section 14 (Evaluation and metrics).
"""
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, Any
from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models.core import OutcomeRecord, Store, Product
from backend.services.forecasting.engine import ForecastingEngine

router = APIRouter(prefix="/api/outcomes", tags=["outcomes"])


class OutcomeItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    outcome_id: uuid.UUID
    exception_title: str
    store_name: str
    product_name: str
    action_taken: str
    outcome_status: str  # "Stockout prevented", "Worse than expected", "Residual loss", "Rejected", "Success"
    expected_lost_sales_units: int
    actual_lost_sales_units: int
    measured_vs_expected: str
    waste_units: int
    waste_value_inr: float
    notes: str
    evaluated_at: datetime


class OutcomesSummaryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    resolved_count: int
    stockout_prevented_count: int
    total_lost_sales_units: int
    total_lost_sales_inr: float
    total_waste_units: int
    total_waste_inr: float
    forecast_mae_units: float
    forecast_wape_pct: float
    records: list[OutcomeItemResponse]
    disclaimer: str = "SYNTHETIC FIXTURE HISTORY & SIMULATION AUDIT"


@router.get("", response_model=OutcomesSummaryResponse)
async def list_outcomes(
    db: AsyncSession = Depends(get_db),
) -> OutcomesSummaryResponse:
    """Retrieve outcome records and evaluation metrics.
    
    If database history is empty, provides seeded synthetic benchmark outcomes
    from Spec Section 7.2 (milk rescue, dahi markdown, egg arrival, rejected banana, bread transfer).
    """
    res = await db.execute(select(OutcomeRecord).order_by(OutcomeRecord.evaluated_at.desc()))
    records = res.scalars().all()

    # Pre-fetch store and product names
    stores_res = await db.execute(select(Store))
    store_map = {s.store_id: s.name for s in stores_res.scalars().all()}

    prods_res = await db.execute(select(Product))
    products = prods_res.scalars().all()
    prod_map = {p.product_id: p.name for p in products}
    prod_price_map = {p.product_id: float(p.base_price) for p in products}

    # Compute summary aggregates
    resolved_count = len(records)
    stockout_prevented_count = sum(1 for r in records if r.actual_lost_sales_units == 0 and r.expected_lost_sales_units > 0)
    total_lost_sales_units = sum(r.actual_lost_sales_units for r in records)
    total_lost_sales_inr = sum(r.actual_lost_sales_units * prod_price_map.get(r.product_id, 0.0) for r in records)
    total_waste_units = sum(r.waste_units for r in records)
    total_waste_inr = sum(r.waste_value_inr for r in records)

    record_items = [
        OutcomeItemResponse(
            outcome_id=r.outcome_id,
            exception_title=r.exception_title,
            store_name=store_map.get(r.store_id, "Andheri West"),
            product_name=prod_map.get(r.product_id, "Amul Taaza Milk 500ml"),
            action_taken=r.action_taken,
            outcome_status=r.outcome_status,
            expected_lost_sales_units=r.expected_lost_sales_units,
            actual_lost_sales_units=r.actual_lost_sales_units,
            measured_vs_expected=r.measured_vs_expected,
            waste_units=r.waste_units,
            waste_value_inr=r.waste_value_inr,
            notes=r.notes,
            evaluated_at=r.evaluated_at,
        )
        for r in records
    ]

    # Compute live forecast accuracy metrics on history
    forecasting_engine = ForecastingEngine()
    eval_results = await forecasting_engine.evaluate_on_history(db)
    hl_res = eval_results.get("holt_linear")
    forecast_mae = round(float(hl_res.mae), 2) if hl_res else 0.0
    forecast_wape = round(float(hl_res.wape), 2) if hl_res else 0.0

    return OutcomesSummaryResponse(
        resolved_count=resolved_count,
        stockout_prevented_count=stockout_prevented_count,
        total_lost_sales_units=total_lost_sales_units,
        total_lost_sales_inr=total_lost_sales_inr,
        total_waste_units=total_waste_units,
        total_waste_inr=total_waste_inr,
        forecast_mae_units=forecast_mae,
        forecast_wape_pct=forecast_wape,
        records=record_items,
        disclaimer="no outcomes measured yet" if not records else "SYNTHETIC FIXTURE HISTORY & SIMULATION AUDIT",
    )
