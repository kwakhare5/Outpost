"""Metrics calculation for Outpost simulation (Spec Section 5).

Computes the four canonical metrics:
- Lost sales units: sum of OrderItem.lost_quantity in the window.
- Waste units: units recorded in WASTE_EXPIRED events in the window.
- Rupee loss: (lost sales units + waste units) * Product.base_price, summed per product.
- Availability percent: total fulfilled_quantity / total requested_quantity in the window.

Rupee price assumption from Spec Section 5 is included on the metric object and printed
wherever rupee numbers are displayed.
"""
from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import datetime
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.core import Order, OrderItem, Event, Product


RUPEE_PRICE_ASSUMPTION = (
    "Prices are synthetic catalog prices from seed_data.py. "
    "The catalog and scale assumptions were calibrated to public reporting on Indian quick commerce: "
    "CNBC-TV18 (January 2026) reported gross margins of roughly 15 to 18 percent of order value, "
    "an average order value around Rs 695, and waste around 1 percent of order value. "
    "These are assumptions for a synthetic world, not measurements of a real business."
)


@dataclass
class SimulationMetrics:
    lost_sales_units: int
    waste_units: int
    rupee_loss: float
    availability_pct: float
    rupee_price_assumption: str = RUPEE_PRICE_ASSUMPTION
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    total_requested_units: int = 0
    total_fulfilled_units: int = 0

    def to_dict(self) -> dict:
        return {
            "lost_sales_units": self.lost_sales_units,
            "waste_units": self.waste_units,
            "rupee_loss": round(self.rupee_loss, 2),
            "availability_pct": round(self.availability_pct, 2),
            "rupee_price_assumption": self.rupee_price_assumption,
            "start_time": self.start_time.isoformat() if self.start_time else None,
            "end_time": self.end_time.isoformat() if self.end_time else None,
            "total_requested_units": self.total_requested_units,
            "total_fulfilled_units": self.total_fulfilled_units,
        }

    def format_report(self) -> str:
        return (
            f"Lost Sales Units: {self.lost_sales_units}\n"
            f"Waste Units:      {self.waste_units}\n"
            f"Rupee Loss:       Rs {self.rupee_loss:,.2f}\n"
            f"Availability:     {self.availability_pct:.2f}%\n"
            f"Assumption:       {self.rupee_price_assumption}"
        )


def _to_naive_utc(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    return dt.replace(tzinfo=None) if dt.tzinfo else dt


async def compute_simulation_metrics(
    db: AsyncSession,
    start_time: datetime | None = None,
    end_time: datetime | None = None,
    simulation_id: uuid.UUID | None = None,
) -> SimulationMetrics:
    """Compute the four canonical metrics for a given time window."""
    naive_start = _to_naive_utc(start_time)
    naive_end = _to_naive_utc(end_time)

    # 1. Fetch all products and their base prices
    prods_res = await db.execute(select(Product))
    products = prods_res.scalars().all()
    price_by_product: dict[uuid.UUID, float] = {
        p.product_id: float(p.base_price) for p in products
    }

    # 2. Query Order + OrderItem in window
    order_stmt = select(OrderItem).join(Order, OrderItem.order_id == Order.order_id)
    if naive_start is not None:
        order_stmt = order_stmt.where(Order.created_at >= naive_start)
    if naive_end is not None:
        order_stmt = order_stmt.where(Order.created_at <= naive_end)

    order_items_res = await db.execute(order_stmt)
    order_items = order_items_res.scalars().all()

    lost_units_by_product: dict[uuid.UUID, int] = {}
    total_lost_units = 0
    total_requested_units = 0
    total_fulfilled_units = 0

    for item in order_items:
        lost = item.lost_quantity
        req = item.requested_quantity
        ful = item.fulfilled_quantity
        total_lost_units += lost
        total_requested_units += req
        total_fulfilled_units += ful
        lost_units_by_product[item.product_id] = lost_units_by_product.get(item.product_id, 0) + lost

    # Availability percent: fulfilled / requested
    if total_requested_units > 0:
        availability_pct = (total_fulfilled_units / total_requested_units) * 100.0
    else:
        availability_pct = 100.0

    # 3. Query WASTE_EXPIRED events in window
    event_stmt = select(Event).where(Event.event_type == "WASTE_EXPIRED")
    if naive_start is not None:
        event_stmt = event_stmt.where(Event.timestamp >= naive_start)
    if naive_end is not None:
        event_stmt = event_stmt.where(Event.timestamp <= naive_end)

    events_res = await db.execute(event_stmt)
    waste_events = events_res.scalars().all()

    waste_units_by_product: dict[uuid.UUID, int] = {}
    total_waste_units = 0

    for ev in waste_events:
        payload = ev.payload or {}
        units = int(payload.get("units", 0))
        prod_id_str = payload.get("product_id")
        if units > 0:
            total_waste_units += units
            if prod_id_str:
                try:
                    p_uuid = uuid.UUID(str(prod_id_str))
                except ValueError:
                    p_uuid = None
                if p_uuid:
                    waste_units_by_product[p_uuid] = waste_units_by_product.get(p_uuid, 0) + units

    # 4. Rupee loss: ((lost plus waste units) times Product.base_price per product)
    total_rupee_loss = 0.0
    all_product_ids = set(price_by_product.keys()) | set(lost_units_by_product.keys()) | set(waste_units_by_product.keys())
    for pid in all_product_ids:
        unit_price = price_by_product.get(pid, 0.0)
        p_lost = lost_units_by_product.get(pid, 0)
        p_waste = waste_units_by_product.get(pid, 0)
        total_rupee_loss += (p_lost + p_waste) * unit_price

    return SimulationMetrics(
        lost_sales_units=total_lost_units,
        waste_units=total_waste_units,
        rupee_loss=round(total_rupee_loss, 2),
        availability_pct=round(availability_pct, 2),
        rupee_price_assumption=RUPEE_PRICE_ASSUMPTION,
        start_time=start_time,
        end_time=end_time,
        total_requested_units=total_requested_units,
        total_fulfilled_units=total_fulfilled_units,
    )
