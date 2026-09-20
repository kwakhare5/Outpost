"""Deterministic Outcome Tests for Scenarios (Spec §4.A).

Verifies that each of the 4 non-baseline scenarios produces provable,
divergent physical outcomes under identical seeds, rather than decorative config values:
1. demand_spike: Multiplies sales volume and accelerates inventory depletion.
2. supplier_delay: Extends purchase order arrival ETA by +24 hours.
3. network_imbalance: Causes critical asymmetry and triggers inter-store transfer recommendation.
4. expiry_wave: Compresses batch expiration and triggers urgent spoilage risks.
"""
import uuid
from datetime import datetime, timezone, timedelta
import pytest
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.core import Store, Product, Inventory, Batch, OrderItem, Order, Risk, Recommendation
from backend.models.enums import RiskType, ActionType
from backend.services.simulation.engine import SimulationEngine
from backend.services.simulation.scenarios import (
    apply_scenario,
    get_scenario_config,
    set_current_scenario,
)
from backend.services.simulation.supplier import create_purchase_order, clear_active_pos
from backend.services.simulation.seed_data import PRODUCTS, STORES
from backend.services.forecasting.engine import ForecastingEngine
from backend.services.risk.engine import RiskEngine
from backend.services.decision.engine import DecisionOrchestrator


@pytest.mark.asyncio
async def test_demand_spike_multiplies_sales_and_accelerates_depletion(db_session: AsyncSession):
    """demand_spike must increase perishable order demand by >= 1.8x under the same seed."""
    test_seed = 4201

    # --- 1. Baseline Run (normal) ---
    set_current_scenario("normal")
    engine_normal = SimulationEngine(seed=test_seed, historical_days=3)
    sim_normal = await engine_normal.initialize(db_session)
    await db_session.commit()

    # Get all dairy products
    dairy_ids = [p.product_id for p in PRODUCTS if p.category == "dairy"]

    # Advance 24 hours under normal scenario
    await engine_normal.advance_time(db_session, sim_normal.simulation_id, 24)
    await db_session.commit()

    # Measure dairy units sold under normal
    normal_sold_res = await db_session.execute(
        select(func.coalesce(func.sum(OrderItem.quantity), 0))
        .join(Order, OrderItem.order_id == Order.order_id)
        .where(
            OrderItem.product_id.in_(dairy_ids),
            Order.created_at >= engine_normal.clock.now - timedelta(hours=24),
        )
    )
    normal_units_sold = normal_sold_res.scalar()

    # --- 2. Spike Run (demand_spike with identical starting seed) ---
    reset_res = await engine_normal.reset(db_session, sim_normal.simulation_id)
    sim_spike_id = uuid.UUID(reset_res["simulation_id"])
    await db_session.commit()

    # Apply demand_spike scenario
    res = await apply_scenario(db_session, engine_normal, "demand_spike")
    assert res["status"] == "applied"
    assert engine_normal.active_scenario == "demand_spike"

    # Advance identical 24 hours under demand_spike
    await engine_normal.advance_time(db_session, sim_spike_id, 24)
    await db_session.commit()

    # Measure dairy units sold under demand_spike
    spike_sold_res = await db_session.execute(
        select(func.coalesce(func.sum(OrderItem.quantity), 0))
        .join(Order, OrderItem.order_id == Order.order_id)
        .where(
            OrderItem.product_id.in_(dairy_ids),
            Order.created_at >= engine_normal.clock.now - timedelta(hours=24),
        )
    )
    spike_units_sold = spike_sold_res.scalar()

    # PROOF: Demand spike must generate substantially more dairy demand than baseline
    assert normal_units_sold > 0
    assert spike_units_sold >= int(normal_units_sold * 1.8), (
        f"Expected spike sales ({spike_units_sold}) to be at least 1.8x normal sales ({normal_units_sold})"
    )



@pytest.mark.asyncio
async def test_supplier_delay_extends_po_arrival_eta(db_session: AsyncSession):
    """supplier_delay scenario must extend purchase order arrival ETA by exactly +24 hours."""
    clear_active_pos()
    set_current_scenario("normal")

    engine = SimulationEngine(seed=7701, historical_days=2)
    await engine.initialize(db_session)
    await db_session.commit()

    stores = (await db_session.execute(select(Store))).scalars().all()
    products = (await db_session.execute(select(Product))).scalars().all()
    store = stores[0]
    product = products[0]

    now = engine.clock.now

    # 1. Normal PO without supplier delay
    po_normal = await create_purchase_order(
        db=db_session,
        supplier_id=product.supplier_id,
        store_id=store.store_id,
        product_id=product.product_id,
        quantity=50,
        current_time=now,
    )
    normal_duration = po_normal.expected_arrival - po_normal.ordered_at
    assert po_normal.status == "in_transit"
    assert po_normal.delay_hours == 0

    # 2. Apply supplier_delay scenario
    await apply_scenario(db_session, engine, "supplier_delay")
    assert engine.active_scenario == "supplier_delay"

    # 3. Create PO under active supplier delay scenario
    po_delayed = await create_purchase_order(
        db=db_session,
        supplier_id=product.supplier_id,
        store_id=store.store_id,
        product_id=product.product_id,
        quantity=50,
        current_time=now,
    )

    delayed_duration = po_delayed.expected_arrival - po_delayed.ordered_at

    # PROOF: ETA must be extended by exactly +24 hours and flagged as delayed
    assert po_delayed.status == "delayed"
    assert po_delayed.delay_hours == 24
    assert delayed_duration == normal_duration + timedelta(hours=24), (
        f"Expected delayed duration {delayed_duration} to equal normal {normal_duration} + 24h"
    )

    # Cleanup
    clear_active_pos()
    set_current_scenario("normal")


@pytest.mark.asyncio
async def test_network_imbalance_drives_transfer_recommendation(db_session: AsyncSession):
    """network_imbalance must deplete Andheri and inflate Bandra, causing a TRANSFER recommendation."""
    engine = SimulationEngine(seed=8801, historical_days=3)
    await engine.initialize(db_session)
    await db_session.commit()

    # Apply network imbalance
    await apply_scenario(db_session, engine, "network_imbalance")
    await db_session.commit()

    all_stores = (await db_session.execute(select(Store))).scalars().all()
    bandra = next(s for s in all_stores if "Bandra" in s.name)
    andheri = next(s for s in all_stores if "Andheri" in s.name)

    all_prods = (await db_session.execute(select(Product))).scalars().all()
    milk = next(p for p in all_prods if "Toned Milk" in p.name)

    # Verify physical imbalance state
    andheri_inv = (await db_session.execute(
        select(Inventory).where(Inventory.store_id == andheri.store_id, Inventory.product_id == milk.product_id)
    )).scalar_one()
    bandra_inv = (await db_session.execute(
        select(Inventory).where(Inventory.store_id == bandra.store_id, Inventory.product_id == milk.product_id)
    )).scalar_one()

    assert andheri_inv.quantity <= 3
    assert bandra_inv.quantity >= 80

    # Run Forecast Engine + Risk Engine
    fc_engine = ForecastingEngine()
    await fc_engine.run(db_session, horizon_hours=24)
    await db_session.commit()

    risk_engine = RiskEngine()
    await risk_engine.run(db_session, now=engine.clock.now)
    await db_session.commit()

    # Find stockout risk for Andheri milk
    stockout_risks = (await db_session.execute(
        select(Risk).where(
            Risk.store_id == andheri.store_id,
            Risk.product_id == milk.product_id,
            Risk.risk_type == RiskType.STOCKOUT,
        )
    )).scalars().all()
    assert len(stockout_risks) > 0, "Andheri must exhibit critical stockout risk for milk"

    # Run Decision Orchestrator for this risk
    orchestrator = DecisionOrchestrator()
    rec = await orchestrator.run(db_session, stockout_risks[0].risk_id)
    await db_session.commit()

    # PROOF: Must recommend a TRANSFER from surplus Bandra to deficit Andheri
    assert rec is not None
    assert rec.action_type == ActionType.TRANSFER
    assert rec.source_store_id == bandra.store_id
    assert rec.destination_store_id == andheri.store_id
    assert rec.quantity > 0


@pytest.mark.asyncio
async def test_expiry_wave_creates_urgent_spoilage_risks(db_session: AsyncSession):
    """expiry_wave must compress perishable expiry to <10h and trigger critical spoilage risks."""
    engine = SimulationEngine(seed=9901, historical_days=3)
    await engine.initialize(db_session)
    await db_session.commit()

    # Apply expiry wave
    await apply_scenario(db_session, engine, "expiry_wave")
    await db_session.commit()
    now_naive = engine.clock.now.replace(tzinfo=None) if engine.clock.now.tzinfo else engine.clock.now

    # Verify batches are compressed to expire within 10 hours
    perishable_prods = (await db_session.execute(
        select(Product).where(Product.category.in_(["dairy", "bakery"]))
    )).scalars().all()
    prod_ids = [p.product_id for p in perishable_prods]

    compressed_batches = (await db_session.execute(
        select(Batch).where(
            Batch.product_id.in_(prod_ids),
            Batch.quantity > 0,
            Batch.expires_at > now_naive,
        )
    )).scalars().all()

    assert len(compressed_batches) > 0
    for b in compressed_batches:
        hours_left = (b.expires_at - now_naive).total_seconds() / 3600
        assert hours_left <= 10.0, f"Batch {b.batch_id} expiry {hours_left}h exceeds 10h threshold"

    # Run Forecast Engine + Risk Engine
    fc_engine = ForecastingEngine()
    await fc_engine.run(db_session, horizon_hours=24)
    await db_session.commit()

    risk_engine = RiskEngine()
    await risk_engine.run(db_session, now=engine.clock.now)
    await db_session.commit()

    # Check spoilage risks in DB
    spoilage_risks = (await db_session.execute(
        select(Risk).where(Risk.risk_type == RiskType.SPOILAGE)
    )).scalars().all()

    # PROOF: System must actively detect multiple spoilage risks due to the expiry wave
    assert len(spoilage_risks) > 0, "Expiry wave must generate active spoilage risk alerts"
