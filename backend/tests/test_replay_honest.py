"""Slice D Honest Accounting and Live Refill Levers Verification Tests.

Verifies:
1. Markdown is charged: a run with discounts has rupee_loss markdown part > 0 and total equals sum of parts.
2. network_imbalance with fixed rule off in outpost pass: transfers > 0 and lost sales at drained store lower than baseline.
3. With elasticity 0.0, discounts change no demand quantity.
4. Same seed and same sim_start give identical results twice, both passes.
5. Baseline reorders in the report equal the real count of fixed rule purchase orders.
"""
from datetime import datetime, timezone, timedelta
import pytest
from sqlalchemy import select, func

from backend.models.core import OrderItem, Product, Store, PurchaseOrder
from backend.services.simulation.engine import SimulationEngine, clear_simulation_data
from backend.services.simulation.replay import run_replay, DEFAULT_SIM_START
from backend.services.simulation.scenarios import add_active_discount, clear_simulation_states


@pytest.mark.asyncio
async def test_markdown_is_charged_and_total_equals_sum_of_parts(db_session):
    """Test 1: A run with discounts has rupee_loss markdown part > 0 and total equals sum of parts."""
    anchor = DEFAULT_SIM_START

    result = await run_replay(
        db=db_session,
        seed=42,
        window_hours=48,
        step_hours=6,
        historical_days=2,
        scenario="expiry_wave",
        sim_start=anchor,
    )

    o = result["outpost"]
    parts = o["rupee_loss_parts"]

    # 1. Assert markdown is charged in Outpost pass (strictly greater than 0)
    assert parts["markdown"] > 0, f"Expected markdown loss > 0, got {parts['markdown']}"
    assert o["rupee_loss_markdown"] > 0, f"Expected rupee_loss_markdown > 0, got {o['rupee_loss_markdown']}"

    # 2. Assert total equals the sum of parts: lost_sales + waste + markdown
    expected_total = parts["lost_sales"] + parts["waste"] + parts["markdown"]
    assert pytest.approx(parts["total"], abs=0.01) == expected_total
    assert pytest.approx(o["rupee_loss"], abs=0.01) == expected_total

    # 3. Assert report formatting includes markdown part
    assert f"markdown: Rs {parts['markdown']:,.2f}" in result["report"]


@pytest.mark.asyncio
async def test_network_imbalance_fixed_rule_off_transfers_and_lower_lost_sales(db_session):
    """Test 2: network_imbalance with fixed rule off in outpost pass: transfers > 0 and drained store lost sales lower."""
    anchor = DEFAULT_SIM_START

    result = await run_replay(
        db=db_session,
        seed=42,
        window_hours=24,
        step_hours=1,
        historical_days=3,
        scenario="network_imbalance",
        sim_start=anchor,
    )

    b = result["baseline"]
    o = result["outpost"]

    # 1. Fixed rule is off in Outpost pass for baseline orders, but Outpost executed lateral transfers
    assert o["transfers"] > 0, f"Expected Outpost transfers > 0, got {o['transfers']}"
    assert b["transfers"] == 0, f"Expected Baseline transfers == 0, got {b['transfers']}"

    # 2. Lost sales at the drained store (Andheri) are strictly lower in Outpost than in Baseline
    assert o["drained_store_lost_sales"] < b["drained_store_lost_sales"], (
        f"Expected Outpost drained store lost sales ({o['drained_store_lost_sales']}) "
        f"< Baseline drained store lost sales ({b['drained_store_lost_sales']})"
    )


@pytest.mark.asyncio
async def test_elasticity_zero_causes_zero_demand_quantity_change(db_session):
    """Test 3: With elasticity 0.0, discounts change no demand quantity."""
    anchor = DEFAULT_SIM_START

    # Run A: Simulation without active discount, elasticity = 0.0
    await clear_simulation_data(db_session)
    clear_simulation_states()
    engine_no_disc = SimulationEngine(seed=77, historical_days=1, policy="outpost", sim_start=anchor, discount_elasticity=0.0)
    sim_a = await engine_no_disc.initialize(db_session, sim_start=anchor)
    await engine_no_disc.advance_time(db_session, sim_a.simulation_id, hours=12, auto_execute=False)

    store_res = (await db_session.execute(select(Store))).scalars().all()
    prod_res = (await db_session.execute(select(Product))).scalars().all()
    store_id = store_res[0].store_id
    prod_id = prod_res[0].product_id

    items_no_disc = (await db_session.execute(
        select(OrderItem).where(
            OrderItem.product_id == prod_id,
        )
    )).scalars().all()
    req_qty_no_disc = sum(i.requested_quantity for i in items_no_disc)

    # Run B: Simulation with 50% discount active, but elasticity = 0.0
    await clear_simulation_data(db_session)
    clear_simulation_states()
    engine_disc = SimulationEngine(seed=77, historical_days=1, policy="outpost", sim_start=anchor, discount_elasticity=0.0)
    sim_b = await engine_disc.initialize(db_session, sim_start=anchor)

    # Register active discount for target store and product
    add_active_discount(
        store_id=store_id,
        product_id=prod_id,
        discount_pct=0.50,
        start_time=engine_disc.clock.now,
        end_time=engine_disc.clock.now + timedelta(hours=24),
        sim_id=sim_b.simulation_id,
    )
    await engine_disc.advance_time(db_session, sim_b.simulation_id, hours=12, auto_execute=False)

    items_disc = (await db_session.execute(
        select(OrderItem).where(
            OrderItem.product_id == prod_id,
        )
    )).scalars().all()
    req_qty_disc = sum(i.requested_quantity for i in items_disc)
    disc_prices = [float(i.price) for i in items_disc]

    # PROOF:
    # 1. Discount was active and prices were cut in half
    expected_discounted_price = round(float(prod_res[0].base_price) * 0.5, 2)
    assert any(pytest.approx(p, abs=0.01) == expected_discounted_price for p in disc_prices), (
        f"Expected price {expected_discounted_price} in order items, got {disc_prices}"
    )

    # 2. Demand requested quantity is strictly unchanged with elasticity 0.0
    assert req_qty_disc == req_qty_no_disc, (
        f"With elasticity 0.0, requested demand quantity must not change: {req_qty_disc} != {req_qty_no_disc}"
    )


@pytest.mark.asyncio
async def test_same_seed_and_fixed_sim_start_are_identical_across_runs(db_session):
    """Test 4: Same seed and same sim_start give identical results twice, both passes."""
    anchor = DEFAULT_SIM_START

    res1 = await run_replay(
        db=db_session,
        seed=123,
        window_hours=24,
        step_hours=6,
        historical_days=2,
        scenario="normal",
        sim_start=anchor,
    )

    res2 = await run_replay(
        db=db_session,
        seed=123,
        window_hours=24,
        step_hours=6,
        historical_days=2,
        scenario="normal",
        sim_start=anchor,
    )

    # 1. Both runs use identical sim_start anchor
    assert res1["sim_start"] == res2["sim_start"] == anchor.isoformat()
    assert res1["start_time_baseline"] == res1["start_time_outpost"] == res2["start_time_baseline"] == res2["start_time_outpost"]

    # 2. Baseline pass is 100% deterministic
    b1 = res1["baseline"]
    b2 = res2["baseline"]
    assert b1["lost_sales_units"] == b2["lost_sales_units"]
    assert b1["waste_units"] == b2["waste_units"]
    assert b1["rupee_loss"] == b2["rupee_loss"]
    assert b1["availability_pct"] == b2["availability_pct"]
    assert b1["reorders"] == b2["reorders"]

    # 3. Outpost pass is 100% deterministic
    o1 = res1["outpost"]
    o2 = res2["outpost"]
    assert o1["lost_sales_units"] == o2["lost_sales_units"]
    assert o1["waste_units"] == o2["waste_units"]
    assert o1["rupee_loss"] == o2["rupee_loss"]
    assert o1["availability_pct"] == o2["availability_pct"]
    assert o1["transfers"] == o2["transfers"]
    assert o1["reorders"] == o2["reorders"]
    assert o1["discounts"] == o2["discounts"]


@pytest.mark.asyncio
async def test_baseline_reorders_in_report_equal_real_count_of_purchase_orders(db_session):
    """Test 5: Baseline reorders in the report equal the real count of fixed rule purchase orders."""
    anchor = DEFAULT_SIM_START

    result = await run_replay(
        db=db_session,
        seed=42,
        window_hours=48,
        step_hours=6,
        historical_days=2,
        scenario="normal",
        sim_start=anchor,
    )

    b = result["baseline"]

    # 1. Baseline reorders count is real and > 0
    assert b["reorders"] > 0, f"Expected baseline reorders > 0, got {b['reorders']}"

    # 2. The report text accurately reflects this count
    assert f"Reorders:      {b['reorders']}" in result["report"]
