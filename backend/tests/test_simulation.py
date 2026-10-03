"""TDD tests for the Outpost simulation engine."""
import uuid
from datetime import datetime, timezone

import pytest
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.core import (
    Store, Product, Customer, Supplier, Order, OrderItem,
    Inventory, Batch, Simulation, Event,
)
from backend.models.enums import SimulationStatus, StoreStatus
from backend.services.simulation.engine import SimulationEngine
from backend.services.simulation.seed_data import STORES, PRODUCTS, CUSTOMERS, SUPPLIERS


# ===== Integration Tests: SimulationEngine =====


@pytest.mark.asyncio
async def test_simulation_seed_integrity(db_session: AsyncSession) -> None:
    """SimulationEngine initialization creates all required entities, inventory mappings, and batches."""
    engine = SimulationEngine(seed=42, historical_days=7)
    await engine.initialize(db_session)

    stores = (await db_session.execute(select(func.count(Store.store_id)))).scalar()
    assert stores == len(STORES)

    suppliers = (await db_session.execute(select(func.count(Supplier.supplier_id)))).scalar()
    assert suppliers == len(SUPPLIERS)

    products = (await db_session.execute(select(func.count(Product.product_id)))).scalar()
    assert products == len(PRODUCTS)

    customers = (await db_session.execute(select(func.count(Customer.customer_id)))).scalar()
    assert customers == len(CUSTOMERS)

    inv_count = (await db_session.execute(select(func.count(Inventory.id)))).scalar()
    assert inv_count == len(STORES) * len(PRODUCTS)

    batch_count = (await db_session.execute(select(func.count(Batch.batch_id)))).scalar()
    assert batch_count >= len(STORES) * len(PRODUCTS)

    order_count = (await db_session.execute(select(func.count(Order.order_id)))).scalar()
    assert order_count > 0

    item_count = (await db_session.execute(select(func.count(OrderItem.id)))).scalar()
    assert item_count > 0


@pytest.mark.asyncio
async def test_inventory_non_negative(db_session: AsyncSession) -> None:
    """Inventory quantities should never be negative after orders."""
    engine = SimulationEngine(seed=42, historical_days=7)
    await engine.initialize(db_session)

    result = await db_session.execute(
        select(Inventory).where(Inventory.quantity < 0)
    )
    negative = result.scalars().all()
    assert len(negative) == 0, f'Found {len(negative)} negative inventory records'


@pytest.mark.asyncio
async def test_advance_time(db_session: AsyncSession) -> None:
    """Advancing time should create new orders and update simulation."""
    engine = SimulationEngine(seed=42, historical_days=7)
    sim = await engine.initialize(db_session)

    orders_before = (await db_session.execute(select(func.count(Order.order_id)))).scalar()

    result = await engine.advance_time(db_session, sim.simulation_id, 24)

    assert result['hours_advanced'] == 24
    assert 'orders_created' in result
    assert 'batches_expired' in result

    # Check simulation record was updated
    updated_sim = await db_session.get(Simulation, sim.simulation_id)
    assert updated_sim.status == SimulationStatus.RUNNING

