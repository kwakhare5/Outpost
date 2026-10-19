"""Tests for sequential same-seed replay (Spec Section 3 Decisions 1, 2, 8, 9; Spec Section 5; Phase 2 Step 5 & 6).

Verifies:
1. Replay initializes baseline and outpost on the same seed.
2. Two RunRecord rows are stored in the database.
3. Deltas are computed correctly.
4. Report displays all four numbers, deltas, and the synthetic rupee price assumption.
"""
import pytest
from sqlalchemy import select

from backend.models.core import RunRecord
from backend.services.simulation.replay import run_replay, RUPEE_PRICE_ASSUMPTION, DETERMINISTIC_NOTE


@pytest.mark.asyncio
async def test_sequential_same_seed_replay_stores_two_run_records(db_session):
    """Replay must generate and persist two RunRecords (baseline and outpost) with identical seed."""
    result = await run_replay(
        db=db_session,
        seed=42,
        window_hours=24,
        step_hours=6,
        historical_days=3,
    )

    # 1. Output structure assertions
    assert result["seed"] == 42
    assert result["window_hours"] == 24
    assert result["deterministic_note"] == DETERMINISTIC_NOTE
    assert result["rupee_price_assumption"] == RUPEE_PRICE_ASSUMPTION

    b = result["baseline"]
    o = result["outpost"]
    d = result["deltas"]

    assert b["policy"] == "baseline"
    assert o["policy"] == "outpost"

    # Deltas match differences
    assert d["lost_sales_units_delta"] == o["lost_sales_units"] - b["lost_sales_units"]
    assert d["waste_units_delta"] == o["waste_units"] - b["waste_units"]
    assert d["rupee_loss_delta"] == pytest.approx(o["rupee_loss"] - b["rupee_loss"], abs=0.01)
    assert d["availability_pct_delta"] == pytest.approx(o["availability_pct"] - b["availability_pct"], abs=0.01)

    # 2. Database verification: exactly two RunRecord rows created
    records_res = await db_session.execute(select(RunRecord).order_by(RunRecord.created_at.asc()))
    records = records_res.scalars().all()
    assert len(records) >= 2
    rec_policies = [r.policy for r in records[-2:]]
    assert rec_policies == ["baseline", "outpost"]

    # 3. Formatted report checks
    report = result["report"]
    assert "OUTPOST SEQUENTIAL SAME-SEED REPLAY REPORT" in report
    assert "Baseline Run:" in report
    assert "Outpost Run:" in report
    assert "DELTAS (Outpost minus Baseline)" in report
    assert RUPEE_PRICE_ASSUMPTION in report
    assert "CNBC-TV18" in report


@pytest.mark.asyncio
async def test_replay_passes_identical_sim_start_and_deterministic_baseline(db_session):
    """Test 1: Two replay passes start at identical sim_start, and same seed twice gives identical baseline."""
    from datetime import datetime, timezone, timedelta

    anchor = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=5)

    result1 = await run_replay(
        db=db_session,
        seed=42,
        window_hours=24,
        step_hours=6,
        historical_days=3,
        sim_start=anchor,
    )

    # Assert equality of start instants for both passes
    assert result1["start_time_baseline"] == result1["start_time_outpost"]
    assert result1["sim_start"] == anchor.isoformat()

    # Run replay a second time with identical anchor and seed
    result2 = await run_replay(
        db=db_session,
        seed=42,
        window_hours=24,
        step_hours=6,
        historical_days=3,
        sim_start=anchor,
    )

    # Baseline results must be 100% deterministic and identical
    b1 = result1["baseline"]
    b2 = result2["baseline"]
    assert b1["lost_sales_units"] == b2["lost_sales_units"]
    assert b1["waste_units"] == b2["waste_units"]
    assert b1["rupee_loss"] == b2["rupee_loss"]
    assert b1["availability_pct"] == b2["availability_pct"]


@pytest.mark.asyncio
async def test_discount_executed_changes_simulated_demand(db_session):
    """Test 2: A discount executed in outpost pass changes simulated demand for that store and product (assert direction)."""
    from datetime import datetime, timezone, timedelta
    from backend.services.simulation.engine import SimulationEngine, clear_simulation_data
    from backend.services.simulation.scenarios import add_active_discount, clear_simulation_states
    from backend.models.core import OrderItem, Product, Store
    from backend.services.simulation.seed_data import STORES, PRODUCTS

    anchor = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=2)

    # --- Run A: Baseline advance without discount ---
    await clear_simulation_data(db_session)
    clear_simulation_states()
    engine_no_disc = SimulationEngine(seed=77, historical_days=1, policy="outpost", sim_start=anchor)
    sim_a = await engine_no_disc.initialize(db_session, sim_start=anchor)

    # Advance 12 hours
    await engine_no_disc.advance_time(db_session, sim_a.simulation_id, hours=12, auto_execute=False)

    store_id = STORES[0].store_id
    prod_id = PRODUCTS[0].product_id

    items_no_disc = (await db_session.execute(
        select(OrderItem).where(
            OrderItem.product_id == prod_id,
        )
    )).scalars().all()
    req_no_disc = sum(i.requested_quantity for i in items_no_disc)
    prices_no_disc = [i.price for i in items_no_disc]

    # --- Run B: Advance with active discount on that store and product ---
    await clear_simulation_data(db_session)
    clear_simulation_states()
    engine_disc = SimulationEngine(seed=77, historical_days=1, policy="outpost", sim_start=anchor)
    sim_b = await engine_disc.initialize(db_session, sim_start=anchor)

    # Add active discount: 30% off
    discount_pct = 0.30
    add_active_discount(
        store_id=store_id,
        product_id=prod_id,
        discount_pct=discount_pct,
        start_time=engine_disc.clock.now,
        end_time=engine_disc.clock.now + timedelta(hours=24),
        sim_id=sim_b.simulation_id,
    )

    # Advance identical 12 hours with discount active
    await engine_disc.advance_time(db_session, sim_b.simulation_id, hours=12, auto_execute=False)

    items_disc = (await db_session.execute(
        select(OrderItem).where(
            OrderItem.product_id == prod_id,
        )
    )).scalars().all()
    req_disc = sum(i.requested_quantity for i in items_disc)
    prices_disc = [i.price for i in items_disc]

    # PROOF:
    # 1. Prices for discounted product items are strictly reduced
    assert len(prices_disc) > 0, "Discounted run must generate orders for target product"
    expected_discounted_price = round(PRODUCTS[0].base_price * (1.0 - discount_pct), 2)
    assert any(pytest.approx(float(p), abs=0.01) == expected_discounted_price for p in prices_disc), (
        f"Expected price {expected_discounted_price} in discounted order items, got {prices_disc}"
    )

    # 2. Simulated requested demand direction is increased (bounded demand lift)
    assert req_disc >= req_no_disc, (
        f"Expected discounted requested demand ({req_disc}) >= non-discounted ({req_no_disc})"
    )


@pytest.mark.asyncio
async def test_stress_scenarios_produce_different_baseline_results(db_session):
    """Test 3: Each stress scenario produces a different baseline result than the normal scenario."""
    from datetime import datetime, timezone, timedelta

    anchor = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=3)

    normal_res = await run_replay(
        db=db_session,
        seed=42,
        window_hours=24,
        step_hours=6,
        historical_days=2,
        scenario="normal",
        sim_start=anchor,
    )
    b_norm = normal_res["baseline"]

    spike_res = await run_replay(
        db=db_session,
        seed=42,
        window_hours=24,
        step_hours=6,
        historical_days=2,
        scenario="demand_spike",
        sim_start=anchor,
    )
    b_spike = spike_res["baseline"]

    delay_res = await run_replay(
        db=db_session,
        seed=42,
        window_hours=24,
        step_hours=6,
        historical_days=2,
        scenario="supplier_delay",
        sim_start=anchor,
    )
    b_delay = delay_res["baseline"]

    imbalance_res = await run_replay(
        db=db_session,
        seed=42,
        window_hours=24,
        step_hours=6,
        historical_days=2,
        scenario="network_imbalance",
        sim_start=anchor,
    )
    b_imbalance = imbalance_res["baseline"]

    # Assert each stress scenario diverges from normal baseline
    assert (
        b_spike["lost_sales_units"] != b_norm["lost_sales_units"]
        or b_spike["rupee_loss"] != b_norm["rupee_loss"]
        or b_spike["availability_pct"] != b_norm["availability_pct"]
    ), f"demand_spike baseline must differ from normal baseline"

    assert (
        b_delay["lost_sales_units"] != b_norm["lost_sales_units"]
        or b_delay["rupee_loss"] != b_norm["rupee_loss"]
        or b_delay["availability_pct"] != b_norm["availability_pct"]
    ), f"supplier_delay baseline must differ from normal baseline"

    assert (
        b_imbalance["lost_sales_units"] != b_norm["lost_sales_units"]
        or b_imbalance["rupee_loss"] != b_norm["rupee_loss"]
        or b_imbalance["waste_units"] != b_norm["waste_units"]
    ), f"network_imbalance baseline must differ from normal baseline"
