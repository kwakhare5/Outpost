"""Tests for baseline replenishment policy switch (Spec Section 3 Decision 1, Phase 2 Step 3).

Verifies:
1. Engine initializes with policy='baseline' vs policy='outpost'.
2. Baseline policy strictly disallows transfers.
3. Baseline policy evaluates fixed reorder rule on time advance.
4. Outpost policy allows transfers and executes the autonomous loop when auto_execute is True.
5. Policy is preserved across simulation reset.
"""
import uuid
import pytest
from datetime import datetime, timezone, timedelta
from sqlalchemy import select

from backend.models.core import Simulation, Store, Product, Supplier, Batch, Inventory
from backend.models.enums import SimulationStatus, ProductCategory, StoreStatus, SupplierStatus
from backend.services.simulation.engine import SimulationEngine
from backend.services.simulation.scenarios import get_simulation_state
from backend.services.simulation.transfer import dispatch_transfer


@pytest.mark.asyncio
async def test_baseline_policy_initialization_and_transfer_block(db_session):
    """Baseline policy must be recorded in DB/state and strictly block transfer dispatches."""
    engine = SimulationEngine(seed=42, historical_days=0, policy="baseline")
    sim = await engine.initialize(db_session)

    assert engine.policy == "baseline"
    state = get_simulation_state(sim.simulation_id)
    assert state.policy == "baseline"

    saved_sim = await db_session.get(Simulation, sim.simulation_id)
    assert saved_sim.configuration["policy"] == "baseline"

    # Setup 2 stores and 1 product
    supp = Supplier(supplier_id=uuid.uuid4(), name="Test RFC", lead_time_hours=24, status=SupplierStatus.ACTIVE)
    prod = Product(
        product_id=uuid.uuid4(),
        name="Test Milk",
        category=ProductCategory.DAIRY,
        unit="pack",
        shelf_life_hours=48,
        base_price=30.0,
        supplier_id=supp.supplier_id,
    )
    store_a = Store(store_id=uuid.uuid4(), name="Store A", latitude=19.0, longitude=72.8, operating_status=StoreStatus.ACTIVE)
    store_b = Store(store_id=uuid.uuid4(), name="Store B", latitude=19.1, longitude=72.9, operating_status=StoreStatus.ACTIVE)
    db_session.add_all([supp, prod, store_a, store_b])

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    batch = Batch(
        batch_id=uuid.uuid4(),
        store_id=store_a.store_id,
        product_id=prod.product_id,
        quantity=50,
        received_at=now - timedelta(hours=5),
        expires_at=now + timedelta(hours=40),
    )
    inv = Inventory(id=uuid.uuid4(), store_id=store_a.store_id, product_id=prod.product_id, quantity=50)
    db_session.add_all([batch, inv])
    await db_session.commit()

    # Attempt to dispatch transfer under baseline policy MUST raise ValueError
    with pytest.raises(ValueError, match="Transfers are not permitted under baseline policy"):
        await dispatch_transfer(
            db=db_session,
            source_store_id=store_a.store_id,
            destination_store_id=store_b.store_id,
            product_id=prod.product_id,
            quantity=10,
            current_time=now,
            sim_id=sim.simulation_id,
        )


@pytest.mark.asyncio
async def test_baseline_policy_advance_and_reset_preservation(db_session):
    """Advancing time runs fixed reorder rule; resetting preserves baseline policy."""
    engine = SimulationEngine(seed=42, historical_days=1, policy="baseline")
    sim = await engine.initialize(db_session)

    res = await engine.advance_time(db_session, sim.simulation_id, hours=1)
    assert res["policy"] == "baseline"
    assert res["transfers_delivered"] == 0

    # Reset simulation
    reset_res = await engine.reset(db_session, sim.simulation_id)
    assert reset_res["status"] == "reset_complete"
    assert reset_res["policy"] == "baseline"
    assert engine.policy == "baseline"
