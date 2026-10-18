"""Supplier Order & Lead-Time Simulation Service for Outpost.

Handles:
- Purchase order (PO) creation with realistic supplier lead times
- In-transit shipment tracking
- Supplier delivery delays and disruptions
- Delivery processing: receipt into new batches and inventory synchronization
"""
from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import datetime, timezone, timedelta
from typing import Any

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.core import Supplier, Store, Product, Inventory, Batch, Event, PurchaseOrder as PurchaseOrderModel
from backend.models.enums import POStatus
from backend.services.simulation.scenarios import get_current_scenario_config, get_simulation_state



@dataclass
class PurchaseOrder:
    po_id: uuid.UUID
    supplier_id: uuid.UUID
    store_id: uuid.UUID
    product_id: uuid.UUID
    quantity: int
    ordered_at: datetime
    expected_arrival: datetime
    status: str = 'in_transit'  # 'in_transit' | 'delayed' | 'delivered' | 'cancelled'
    delay_hours: int = 0


def get_active_pos(sim_id: str | uuid.UUID | None = None) -> list[PurchaseOrder]:
    """Retrieve all pending or in-transit supplier purchase orders."""
    state = get_simulation_state(sim_id)
    return [po for po in state.active_pos if po.status in ('in_transit', 'delayed')]


def clear_active_pos(sim_id: str | uuid.UUID | None = None) -> None:
    """Reset active purchase orders."""
    state = get_simulation_state(sim_id)
    state.active_pos.clear()


async def create_purchase_order(
    db: AsyncSession,
    supplier_id: uuid.UUID,
    store_id: uuid.UUID,
    product_id: uuid.UUID,
    quantity: int,
    current_time: datetime,
    delay_hours: int = 0,
    sim_id: str | uuid.UUID | None = None,
) -> PurchaseOrder:
    """Create a new supplier purchase order with expected arrival based on lead time."""
    if quantity <= 0:
        raise ValueError("Purchase order quantity must be positive")

    supplier = await db.get(Supplier, supplier_id)
    if not supplier:
        raise ValueError(f"Supplier {supplier_id} not found")

    scenario_delay = get_current_scenario_config(sim_id).supplier_lead_time_delay_hours
    effective_delay = delay_hours if delay_hours > 0 else scenario_delay
    total_lead_time = supplier.lead_time_hours + effective_delay
    expected_arrival = current_time + timedelta(hours=total_lead_time)

    po = PurchaseOrder(
        po_id=uuid.uuid4(),
        supplier_id=supplier_id,
        store_id=store_id,
        product_id=product_id,
        quantity=quantity,
        ordered_at=current_time,
        expected_arrival=expected_arrival,
        status='delayed' if effective_delay > 0 else 'in_transit',
        delay_hours=effective_delay,
    )
    state = get_simulation_state(sim_id)
    state.active_pos.append(po)

    # Persist PurchaseOrder ORM model in DB
    po_row = PurchaseOrderModel(
        po_id=po.po_id,
        supplier_id=supplier_id,
        destination_store_id=store_id,
        product_id=product_id,
        quantity=quantity,
        status=POStatus.IN_TRANSIT,
        ordered_at=current_time.replace(tzinfo=None) if current_time.tzinfo else current_time,
        arrival_eta=expected_arrival.replace(tzinfo=None) if expected_arrival.tzinfo else expected_arrival,
    )
    db.add(po_row)

    # Record event
    event = Event(
        event_id=uuid.uuid4(),
        event_type='PURCHASE_ORDER_PLACED',
        timestamp=current_time,
        entity_type='purchase_order',
        entity_id=po.po_id,
        payload={
            'supplier_id': str(supplier_id),
            'store_id': str(store_id),
            'product_id': str(product_id),
            'quantity': quantity,
            'lead_time_hours': supplier.lead_time_hours,
            'expected_arrival': expected_arrival.isoformat(),
        },
    )
    db.add(event)
    await db.flush()

    return po


def apply_supplier_delay(po_id: uuid.UUID, additional_hours: int, sim_id: str | uuid.UUID | None = None) -> PurchaseOrder:
    """Apply an unexpected shipment delay to an existing purchase order."""
    state = get_simulation_state(sim_id)
    po = next((p for p in state.active_pos if p.po_id == po_id), None)
    if not po:
        raise ValueError(f"Purchase order {po_id} not found")

    po.delay_hours += additional_hours
    po.expected_arrival += timedelta(hours=additional_hours)
    po.status = 'delayed'
    return po


async def process_supplier_deliveries(
    db: AsyncSession,
    current_time: datetime,
    sim_id: str | uuid.UUID | None = None,
) -> list[PurchaseOrder]:
    """Process arriving supplier purchase orders and add newly received batches to inventory."""
    delivered: list[PurchaseOrder] = []
    current_naive = current_time.replace(tzinfo=None) if current_time.tzinfo else current_time
    state = get_simulation_state(sim_id)

    for po in list(state.active_pos):
        arr_naive = po.expected_arrival.replace(tzinfo=None) if po.expected_arrival.tzinfo else po.expected_arrival
        if po.status in ('in_transit', 'delayed') and current_naive >= arr_naive:
            # Get product shelf life
            product = await db.get(Product, po.product_id)
            shelf_life = product.shelf_life_hours if product else 72

            # Create fresh received batch
            new_batch = Batch(
                batch_id=uuid.uuid4(),
                store_id=po.store_id,
                product_id=po.product_id,
                quantity=po.quantity,
                received_at=current_naive,
                expires_at=current_naive + timedelta(hours=shelf_life),
            )
            db.add(new_batch)

            # Synchronize store inventory
            inv_res = await db.execute(
                select(Inventory).where(
                    Inventory.store_id == po.store_id,
                    Inventory.product_id == po.product_id,
                )
            )
            inv = inv_res.scalar_one_or_none()
            if inv:
                await db.flush()
                active_sum_res = await db.execute(
                    select(func.coalesce(func.sum(Batch.quantity), 0)).where(
                        Batch.store_id == po.store_id,
                        Batch.product_id == po.product_id,
                        Batch.quantity > 0,
                    )
                )
                inv.quantity = active_sum_res.scalar()

            po.status = 'delivered'
            delivered.append(po)

            po_row = await db.get(PurchaseOrderModel, po.po_id)
            if po_row:
                po_row.status = POStatus.RECEIVED
                po_row.confirmed_at = current_naive

            event = Event(
                event_id=uuid.uuid4(),
                event_type='PURCHASE_ORDER_DELIVERED',
                timestamp=current_time,
                entity_type='purchase_order',
                entity_id=po.po_id,
                payload={
                    'supplier_id': str(po.supplier_id),
                    'store_id': str(po.store_id),
                    'product_id': str(po.product_id),
                    'quantity': po.quantity,
                },
            )
            db.add(event)

    if delivered:
        await db.flush()

    return delivered


async def evaluate_reorder_policy(
    db: AsyncSession,
    current_time: datetime,
    sim_id: str | uuid.UUID | None = None,
) -> list[PurchaseOrder]:
    """Fixed reorder policy (Spec Section 3 Decision 1, Phase 1 Step 10).

    When a store-product's hours of stock at current demand falls below the supplier lead time,
    create a purchase order through create_purchase_order for daily velocity times lead time.
    """
    from backend.services.simulation.seed_data import STORES, PRODUCTS

    created_pos: list[PurchaseOrder] = []
    current_naive = current_time.replace(tzinfo=None) if current_time.tzinfo else current_time

    suppliers_res = await db.execute(select(Supplier))
    suppliers = suppliers_res.scalars().all()
    if not suppliers:
        return created_pos
    supplier_by_name = {s.name: s for s in suppliers}

    for store_seed in STORES:
        for prod_seed in PRODUCTS:
            supplier = supplier_by_name.get(prod_seed.supplier_name)
            if not supplier or supplier.lead_time_hours <= 0:
                continue

            daily_velocity = prod_seed.daily_demand_mean
            if daily_velocity <= 0:
                continue
            hourly_demand = daily_velocity / 24.0

            # Count unexpired active batches
            active_sum_res = await db.execute(
                select(func.coalesce(func.sum(Batch.quantity), 0)).where(
                    Batch.store_id == store_seed.store_id,
                    Batch.product_id == prod_seed.product_id,
                    Batch.quantity > 0,
                    Batch.expires_at > current_naive,
                )
            )
            on_hand_qty = active_sum_res.scalar() or 0

            # In-transit purchase orders for this store & product
            in_flight_pos = [
                po for po in get_active_pos(sim_id)
                if po.store_id == store_seed.store_id
                and po.product_id == prod_seed.product_id
                and po.status in ('in_transit', 'delayed')
            ]
            incoming_qty = sum(po.quantity for po in in_flight_pos)

            effective_stock = on_hand_qty + incoming_qty
            hours_of_stock = effective_stock / hourly_demand

            # When hours of stock at current demand falls below supplier lead time
            if hours_of_stock < supplier.lead_time_hours:
                reorder_qty = max(1, int(round(daily_velocity * (supplier.lead_time_hours / 24.0))))
                po = await create_purchase_order(
                    db=db,
                    supplier_id=supplier.supplier_id,
                    store_id=store_seed.store_id,
                    product_id=prod_seed.product_id,
                    quantity=reorder_qty,
                    current_time=current_time,
                    sim_id=sim_id,
                )
                created_pos.append(po)

    return created_pos
