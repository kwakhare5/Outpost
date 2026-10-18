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


@pytest.mark.asyncio
async def test_in_flight_transfers_and_pos_survive_rebuild_from_db(db_session: AsyncSession) -> None:
    """In-flight transfers and POs survive in-memory cache clear and engine rebuild from DB."""
    from backend.services.simulation.transfer import dispatch_transfer, get_active_transfers
    from backend.services.simulation.supplier import create_purchase_order, get_active_pos
    from backend.services.simulation.scenarios import clear_simulation_states
    from backend.api.simulations import _engines, _get_or_restore_engine

    engine = SimulationEngine(seed=42, historical_days=1)
    sim = await engine.initialize(db_session)

    # Pick an active batch with sufficient unexpired quantity
    now_naive = engine.clock.now.replace(tzinfo=None) if engine.clock.now.tzinfo else engine.clock.now
    active_batch = (await db_session.execute(
        select(Batch).where(
            Batch.quantity >= 5,
            Batch.expires_at > now_naive,
        )
    )).scalars().first()
    assert active_batch is not None

    source_store_id = active_batch.store_id
    product_id = active_batch.product_id

    stores = (await db_session.execute(select(Store).where(Store.store_id != source_store_id))).scalars().all()
    dest_store_id = stores[0].store_id
    supp = (await db_session.execute(select(Supplier).limit(1))).scalar_one()

    # Dispatch transfer and create purchase order
    created_transfer = await dispatch_transfer(
        db=db_session,
        source_store_id=source_store_id,
        destination_store_id=dest_store_id,
        product_id=product_id,
        quantity=5,
        current_time=engine.clock.now,
        sim_id=sim.simulation_id,
    )
    created_po = await create_purchase_order(
        db=db_session,
        supplier_id=supp.supplier_id,
        store_id=source_store_id,
        product_id=product_id,
        quantity=10,
        current_time=engine.clock.now,
        sim_id=sim.simulation_id,
    )
    await db_session.commit()

    # Verify active before restart
    initial_transfers_count = len(get_active_transfers(sim.simulation_id))
    initial_pos_count = len(get_active_pos(sim.simulation_id))
    assert initial_transfers_count >= 1
    assert initial_pos_count >= 1

    # Simulate process restart by clearing in-memory state and engine cache
    clear_simulation_states()
    _engines.clear()

    # Verify memory is wiped
    assert len(get_active_transfers(sim.simulation_id)) == 0
    assert len(get_active_pos(sim.simulation_id)) == 0

    # Reconstitute engine and state from DB
    restored_engine = await _get_or_restore_engine(db_session, sim.simulation_id)
    assert restored_engine is not None

    # Verify both transfers and POs are restored accurately
    restored_transfers = get_active_transfers(sim.simulation_id)
    restored_pos = get_active_pos(sim.simulation_id)

    assert len(restored_transfers) == initial_transfers_count
    assert any(
        t.transfer_id == created_transfer.transfer_id and t.quantity == 5 and t.source_store_id == source_store_id
        for t in restored_transfers
    )

    assert len(restored_pos) == initial_pos_count
    assert any(
        p.po_id == created_po.po_id and p.quantity == 10 and p.supplier_id == supp.supplier_id
        for p in restored_pos
    )


def test_two_simulations_hold_different_scenarios_independently() -> None:
    """Two simulations maintain their active scenarios independently without crosstalk."""
    from backend.services.simulation.scenarios import (
        set_current_scenario,
        get_current_scenario_config,
        clear_simulation_states,
    )

    clear_simulation_states()
    sim_id_1 = uuid.uuid4()
    sim_id_2 = uuid.uuid4()

    set_current_scenario("demand_spike", sim_id=sim_id_1)
    set_current_scenario("network_imbalance", sim_id=sim_id_2)

    cfg1 = get_current_scenario_config(sim_id_1)
    cfg2 = get_current_scenario_config(sim_id_2)

    assert cfg1.name == "demand_spike"
    assert cfg2.name == "network_imbalance"
    assert cfg1.demand_multiplier_by_category != cfg2.demand_multiplier_by_category
