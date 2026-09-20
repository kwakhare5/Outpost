"""Deterministic tests for Sales Accounting & Demand Rate Tables (Spec §4).

Verifies:
1. Category x hour block x weekday demand rate table values.
2. Full fulfillment reconciliation: requested == fulfilled + lost (lost == 0).
3. Partial fulfillment reconciliation: requested == fulfilled + lost (fulfilled > 0, lost > 0).
4. Complete stockout reconciliation: requested == fulfilled + lost (fulfilled == 0, lost == requested).
5. Conservation of demand and mass across inventory batches and sales accounting.
"""
import uuid
import pytest
from datetime import datetime, timezone, timedelta
from sqlalchemy import select

from backend.models.core import Store, Product, Batch, Inventory, Order, OrderItem
from backend.models.enums import StoreStatus, ProductCategory, OrderStatus
from backend.services.simulation.engine import (
    SimulationEngine,
    get_demand_rate_multiplier,
    CATEGORY_HOUR_BLOCK_RATES,
)


def test_demand_rate_table_multipliers():
    """Verify that the demand rate table correctly modulates demand by hour block and weekday."""
    # Morning peak (08:00) vs Night lull (03:00) on a Monday (weekday=0)
    morning_dairy = get_demand_rate_multiplier("dairy", hour=8, weekday=0)
    night_dairy = get_demand_rate_multiplier("dairy", hour=3, weekday=0)
    assert morning_dairy > night_dairy
    assert morning_dairy == 1.8
    assert night_dairy == 0.25

    # Weekend effect: Sunday (weekday=6) vs Tuesday (weekday=1) at evening peak (19:00)
    weekend_produce = get_demand_rate_multiplier("produce", hour=19, weekday=6)
    weekday_produce = get_demand_rate_multiplier("produce", hour=19, weekday=1)
    assert weekend_produce > weekday_produce
    assert weekend_produce == pytest.approx(1.7 * 1.35, rel=1e-3)
    assert weekday_produce == 1.7


@pytest.mark.asyncio
async def test_full_fulfillment_sales_accounting(db_session):
    """When on-hand stock exceeds requested quantity, fulfilled == requested and lost == 0."""
    engine = SimulationEngine(seed=42, historical_days=0)
    store_id = uuid.uuid4()
    product_id = uuid.uuid4()

    # Seed 50 units in batch
    batch = Batch(
        batch_id=uuid.uuid4(),
        store_id=store_id,
        product_id=product_id,
        quantity=50,
        received_at=datetime.now(timezone.utc),
        expires_at=datetime.now(timezone.utc) + timedelta(days=5),
    )
    inv = Inventory(id=uuid.uuid4(), store_id=store_id, product_id=product_id, quantity=50)
    db_session.add(batch)
    db_session.add(inv)
    await db_session.flush()

    # Request 12 units
    requested_qty = 12
    fulfilled, lost = await engine._deduct_inventory(db_session, store_id, product_id, requested_qty)

    # Reconcile equation
    assert fulfilled == 12
    assert lost == 0
    assert requested_qty == fulfilled + lost

    # Inventory must accurately reflect remaining 38 units
    await db_session.refresh(inv)
    await db_session.refresh(batch)
    assert inv.quantity == 38
    assert batch.quantity == 38


@pytest.mark.asyncio
async def test_partial_fulfillment_sales_accounting(db_session):
    """When on-hand stock is insufficient, fulfills available stock and marks remaining as lost."""
    engine = SimulationEngine(seed=42, historical_days=0)
    store_id = uuid.uuid4()
    product_id = uuid.uuid4()

    # Seed only 7 units in batch
    batch = Batch(
        batch_id=uuid.uuid4(),
        store_id=store_id,
        product_id=product_id,
        quantity=7,
        received_at=datetime.now(timezone.utc),
        expires_at=datetime.now(timezone.utc) + timedelta(days=5),
    )
    inv = Inventory(id=uuid.uuid4(), store_id=store_id, product_id=product_id, quantity=7)
    db_session.add(batch)
    db_session.add(inv)
    await db_session.flush()

    # Customer orders 20 units
    requested_qty = 20
    fulfilled, lost = await engine._deduct_inventory(db_session, store_id, product_id, requested_qty)

    # Invariant: requested == fulfilled + lost
    assert fulfilled == 7
    assert lost == 13
    assert requested_qty == fulfilled + lost

    # Stock is exhausted to zero (not negative)
    await db_session.refresh(inv)
    await db_session.refresh(batch)
    assert inv.quantity == 0
    assert batch.quantity == 0


@pytest.mark.asyncio
async def test_complete_stockout_sales_accounting(db_session):
    """When on-hand stock is 0, fulfillment is 0 and 100% of requested demand is recorded as lost."""
    engine = SimulationEngine(seed=42, historical_days=0)
    store_id = uuid.uuid4()
    product_id = uuid.uuid4()

    inv = Inventory(id=uuid.uuid4(), store_id=store_id, product_id=product_id, quantity=0)
    db_session.add(inv)
    await db_session.flush()

    # Customer orders 15 units
    requested_qty = 15
    fulfilled, lost = await engine._deduct_inventory(db_session, store_id, product_id, requested_qty)

    # Invariant: requested == fulfilled + lost
    assert fulfilled == 0
    assert lost == 15
    assert requested_qty == fulfilled + lost

    await db_session.refresh(inv)
    assert inv.quantity == 0


@pytest.mark.asyncio
async def test_end_to_end_order_generation_sales_accounting_reconciliation(db_session):
    """Advance simulation and verify that every generated OrderItem strictly reconciles."""
    engine = SimulationEngine(seed=123, historical_days=2)
    sim = await engine.initialize(db_session)
    await db_session.commit()

    # Advance time by 6 hours to generate active customer orders
    await engine.advance_time(db_session, sim.simulation_id, hours=6)
    await db_session.commit()

    items_res = await db_session.execute(select(OrderItem))
    order_items = items_res.scalars().all()

    assert len(order_items) > 0

    for item in order_items:
        # Mandatory invariant: requested == fulfilled + lost
        assert item.requested_quantity == item.fulfilled_quantity + item.lost_quantity
        # Completed sales equals fulfilled quantity (never unfulfilled requested demand)
        assert item.quantity == item.fulfilled_quantity
        assert item.fulfilled_quantity >= 0
        assert item.lost_quantity >= 0
        assert item.requested_quantity > 0
