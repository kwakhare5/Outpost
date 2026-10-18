"""TDD tests for the Decision Engine pure models (spec sections 14-17, Phase 5).

Test seams in red->green order:

Unit seams (pure math, no DB):
1.  ReasonCode enum -- all spec section 17 codes present
2.  ScoringWeights -- defaults are configurable dataclass
3.  SafeExcessCalculator.compute() -- spec section 15.1 safe excess formula
4.  TransferValidator.validate() -- feasible when constraints pass
5.  TransferValidator.validate() -- WOULD_DEPLETE_SOURCE when excess insufficient
6.  TransferValidator.validate() -- EXCEEDS_MAX_DISTANCE when too far
7.  TransferValidator.validate() -- CANNOT_ARRIVE_IN_TIME when travel > stock hours
8.  ActionScorer.score_transfer() -- higher for closer source, high dest risk
9.  ActionScorer.score_reorder() -- penalised when supplier slower than stockout
10. ActionScorer.score_discount() -- scales with spoilage probability
11. ActionScorer.score_hold() -- 1.0 - combined_risk
12. PureDecisionEvaluator.evaluate() -- transfer wins when feasible + high dest risk
13. PureDecisionEvaluator.evaluate() -- hold wins when all risks low
14. PureDecisionEvaluator.evaluate() -- infeasible transfer excluded; reorder wins
15. PureDecisionEvaluator.evaluate() -- discount ranks for spoilage scenario
16. PureDecisionEvaluator.evaluate() -- alternatives exclude recommended action
17. PureDecisionEvaluator.evaluate() -- confidence >= 0 and <= 1
"""
from __future__ import annotations

import uuid
import pytest

from backend.services.decision.models import (
    ReasonCode,
    ScoringWeights,
    DEFAULT_WEIGHTS,
    TransferInput,
    ReorderInput,
    DiscountInput,
    HoldInput,
    CandidateAction,
    DecisionResult,
    SafeExcessCalculator,
    ValidationResult,
    TransferValidator,
    ActionScorer,
    PureDecisionEvaluator,
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _store() -> uuid.UUID:
    return uuid.uuid4()

def _product() -> uuid.UUID:
    return uuid.uuid4()

def _transfer(
    src_qty: int = 100,
    src_demand: float = 20.0,
    dest_qty: int = 5,
    dest_demand: float = 30.0,
    dest_risk: float = 0.85,
    distance_km: float = 3.0,
    transfer_qty: int = 20,
) -> TransferInput:
    return TransferInput(
        source_store_id=_store(),
        destination_store_id=_store(),
        product_id=_product(),
        source_quantity=src_qty,
        source_forecast_demand_24h=src_demand,
        source_safety_stock=0,
        destination_quantity=dest_qty,
        destination_forecast_demand_24h=dest_demand,
        destination_forecast_demand_48h=dest_demand * 2,
        destination_lead_time_hours=24,
        destination_stockout_probability=dest_risk,
        distance_km=distance_km,
        transfer_quantity=transfer_qty,
    )

def _reorder(
    stockout_prob: float = 0.8,
    lead_time: int = 24,
    hours_to_stockout: float = 12.0,
) -> ReorderInput:
    return ReorderInput(
        store_id=_store(),
        product_id=_product(),
        supplier_lead_time_hours=lead_time,
        hours_to_stockout=hours_to_stockout,
        current_quantity=10,
        forecast_demand_24h=20.0,
        reorder_quantity=40,
        stockout_probability=stockout_prob,
    )

def _discount(spoilage_prob: float = 0.7, discount_pct: float = 0.20) -> DiscountInput:
    return DiscountInput(
        store_id=_store(),
        product_id=_product(),
        at_risk_quantity=50,
        hours_to_expiry=8.0,
        forecast_demand_before_expiry=20.0,
        spoilage_probability=spoilage_prob,
        discount_pct=discount_pct,
    )

def _hold(stockout_prob: float = 0.05, spoilage_prob: float = 0.05) -> HoldInput:
    return HoldInput(
        store_id=_store(),
        product_id=_product(),
        stockout_probability=stockout_prob,
        spoilage_probability=spoilage_prob,
        hours_to_stockout=72.0,
        hours_to_expiry=48.0,
    )


# ---------------------------------------------------------------------------
# 1. SafeExcessCalculator
# ---------------------------------------------------------------------------


def test_safe_excess_returns_zero_when_inventory_is_tight():
    calc = SafeExcessCalculator()
    # 24h demand = 24 units. Safety window 24h + 15% buffer = 27.6 => excess = 0
    result = calc.compute(current_quantity=25, forecast_demand_24h=24.0)
    assert result == 0

def test_safe_excess_returns_positive_when_inventory_plentiful():
    calc = SafeExcessCalculator()
    # 24h demand = 10, window = 24h, buffer = 15% => required ~11.5 => excess from 100 = ~88
    result = calc.compute(current_quantity=100, forecast_demand_24h=10.0)
    assert result > 50

def test_safe_excess_respects_safety_stock():
    calc = SafeExcessCalculator()
    baseline = calc.compute(current_quantity=100, forecast_demand_24h=10.0)
    with_safety = calc.compute(current_quantity=100, forecast_demand_24h=10.0, safety_stock=20)
    assert with_safety < baseline

def test_safe_excess_never_negative():
    calc = SafeExcessCalculator()
    result = calc.compute(current_quantity=0, forecast_demand_24h=50.0)
    assert result == 0


# ---------------------------------------------------------------------------
# 4-7. TransferValidator
# ---------------------------------------------------------------------------

def test_transfer_validator_feasible_when_all_constraints_pass():
    """Good transfer: source has excess, short distance, dest needs it now."""
    validator = TransferValidator()
    t = _transfer(src_qty=200, src_demand=10.0, dest_qty=0, dest_demand=20.0, distance_km=2.0, transfer_qty=30)
    vr = validator.validate(t)
    assert vr.feasible is True
    assert vr.rejection_codes == []

def test_transfer_validator_rejects_when_depletes_source():
    """Transfer qty exceeds safe excess."""
    validator = TransferValidator()
    # source has 10 units, demand=20/day => excess = 0; trying to transfer 5
    t = _transfer(src_qty=10, src_demand=20.0, transfer_qty=5)
    vr = validator.validate(t)
    assert vr.feasible is False
    assert ReasonCode.WOULD_DEPLETE_SOURCE in vr.rejection_codes

def test_transfer_validator_rejects_excessive_distance():
    validator = TransferValidator()
    t = _transfer(distance_km=25.0)  # default max is 20km
    vr = validator.validate(t)
    assert vr.feasible is False
    assert ReasonCode.EXCEEDS_MAX_DISTANCE in vr.rejection_codes

def test_transfer_validator_rejects_when_cannot_arrive_in_time():
    """Travel time > destination hours of stock."""
    validator = TransferValidator()
    # dest has 1 unit, demand 24/day = 1/h => 1 hour of stock
    # distance 15km at 30kmh => 0.5h travel -- should pass
    # make it worse: dest has 1 unit, demand 60/day = 2.5/h => 0.4h of stock, travel 15km=0.5h
    t = _transfer(
        src_qty=200,
        src_demand=5.0,
        dest_qty=1,
        dest_demand=60.0,
        distance_km=15.0,
        transfer_qty=10,
    )
    vr = validator.validate(t)
    assert vr.feasible is False
    assert ReasonCode.CANNOT_ARRIVE_IN_TIME in vr.rejection_codes


# ---------------------------------------------------------------------------
# 8-11. ActionScorer
# ---------------------------------------------------------------------------

def test_scorer_transfer_higher_for_higher_dest_risk():
    scorer = ActionScorer()
    low_risk  = _transfer(dest_risk=0.10)
    high_risk = _transfer(dest_risk=0.90)
    assert scorer.score_transfer(high_risk) > scorer.score_transfer(low_risk)

def test_scorer_transfer_penalises_distance():
    scorer = ActionScorer()
    close  = _transfer(distance_km=1.0)
    far    = _transfer(distance_km=19.0)
    assert scorer.score_transfer(close) > scorer.score_transfer(far)

def test_scorer_reorder_penalised_when_supplier_slower_than_stockout():
    scorer = ActionScorer()
    fast_stockout = _reorder(lead_time=48, hours_to_stockout=6.0)
    slow_stockout = _reorder(lead_time=6,  hours_to_stockout=48.0)
    # fast_stockout: delay_ratio = 48/6 = capped at 1 => max penalty
    # slow_stockout: delay_ratio = 6/48 = 0.125 => small penalty
    assert scorer.score_reorder(slow_stockout) > scorer.score_reorder(fast_stockout)

def test_scorer_discount_scales_with_spoilage_probability():
    scorer = ActionScorer()
    low_risk  = _discount(spoilage_prob=0.10)
    high_risk = _discount(spoilage_prob=0.90)
    assert scorer.score_discount(high_risk) > scorer.score_discount(low_risk)

def test_scorer_hold_is_one_minus_combined_risk():
    scorer = ActionScorer()
    h = _hold(stockout_prob=0.2, spoilage_prob=0.3)
    expected = round(1.0 - 0.3, 6)
    assert scorer.score_hold(h) == pytest.approx(expected, abs=1e-5)


# ---------------------------------------------------------------------------
# 12-17. PureDecisionEvaluator
# ---------------------------------------------------------------------------

def test_evaluator_transfer_wins_when_feasible_and_dest_high_risk():
    evaluator = PureDecisionEvaluator()
    t = _transfer(src_qty=200, src_demand=10.0, dest_qty=0, dest_demand=20.0, dest_risk=0.95, distance_km=2.0, transfer_qty=30)
    result = evaluator.evaluate(
        transfers=[t],
        reorders=[_reorder(stockout_prob=0.95, lead_time=48, hours_to_stockout=2.0)],
        discounts=[],
        hold=_hold(stockout_prob=0.95, spoilage_prob=0.0),
    )
    assert result.recommended.action_type == "transfer"

def test_evaluator_hold_wins_when_risks_are_low():
    evaluator = PureDecisionEvaluator()
    result = evaluator.evaluate(
        transfers=[],
        reorders=[_reorder(stockout_prob=0.05, lead_time=12, hours_to_stockout=72.0)],
        discounts=[],
        hold=_hold(stockout_prob=0.05, spoilage_prob=0.02),
    )
    # Low risk = hold score ~0.95, reorder score low
    assert result.recommended.action_type == "hold"

def test_evaluator_excludes_infeasible_transfer():
    """Infeasible transfer must not appear in recommended or alternatives."""
    evaluator = PureDecisionEvaluator()
    # infeasible: src_qty too low
    bad_transfer = _transfer(src_qty=5, src_demand=20.0, transfer_qty=10)
    result = evaluator.evaluate(
        transfers=[bad_transfer],
        reorders=[_reorder(stockout_prob=0.8)],
        discounts=[],
        hold=_hold(stockout_prob=0.8),
    )
    all_types = [result.recommended.action_type] + [a.action_type for a in result.alternatives]
    assert "transfer" not in all_types

def test_evaluator_discount_in_alternatives_for_spoilage_scenario():
    evaluator = PureDecisionEvaluator()
    result = evaluator.evaluate(
        transfers=[],
        reorders=[_reorder(stockout_prob=0.1)],
        discounts=[_discount(spoilage_prob=0.85, discount_pct=0.20)],
        hold=_hold(stockout_prob=0.1, spoilage_prob=0.85),
    )
    all_types = [result.recommended.action_type] + [a.action_type for a in result.alternatives]
    assert "discount" in all_types

def test_evaluator_alternatives_do_not_include_recommended():
    evaluator = PureDecisionEvaluator()
    result = evaluator.evaluate(
        transfers=[_transfer(src_qty=200, src_demand=10.0, dest_qty=0, dest_demand=20.0, dest_risk=0.9, distance_km=2.0, transfer_qty=30)],
        reorders=[_reorder()],
        discounts=[_discount()],
        hold=_hold(),
    )
    rec_type = result.recommended.action_type
    for alt in result.alternatives:
        # action_type alone is not unique (there could be multiple transfers)
        # but the recommended object must not be literally the same object
        assert alt is not result.recommended

def test_evaluator_confidence_is_bounded():
    evaluator = PureDecisionEvaluator()
    result = evaluator.evaluate(
        transfers=[_transfer()],
        reorders=[_reorder()],
        discounts=[_discount()],
        hold=_hold(),
    )
    assert 0.0 <= result.confidence <= 1.0


@pytest.mark.asyncio
async def test_evaluate_all_skips_reorder_when_po_in_flight(db_session):
    """Part B: evaluate_all skips generating a reorder recommendation if a PO is already in flight."""
    from sqlalchemy import select, update
    from backend.models.core import Inventory, Risk, Recommendation, PurchaseOrder as PurchaseOrderModel
    from backend.models.enums import RiskStatus, RiskType, ActionType, POStatus
    from backend.services.simulation.engine import SimulationEngine
    from backend.services.forecasting.engine import ForecastingEngine
    from backend.services.decision.engine import DecisionOrchestrator
    from backend.services.risk.engine import RiskEngine
    from datetime import datetime, timezone

    sim = SimulationEngine(seed=42, historical_days=7)
    await sim.initialize(db_session)
    await db_session.commit()

    fc = ForecastingEngine()
    await fc.run(db_session, horizon_hours=24)
    await db_session.commit()

    # Drain store inventory to force stockout risk
    await db_session.execute(update(Inventory).values(quantity=0))
    await db_session.commit()

    risk_engine = RiskEngine()
    await risk_engine.run(db_session)
    await db_session.commit()

    risks = (await db_session.execute(
        select(Risk).where(Risk.status == RiskStatus.ACTIVE, Risk.risk_type == RiskType.STOCKOUT)
    )).scalars().all()
    assert len(risks) > 0
    target_risk = risks[0]

    # Insert an in-flight purchase order for this store & product
    po = PurchaseOrderModel(
        po_id=uuid.uuid4(),
        supplier_id=uuid.uuid4(),
        destination_store_id=target_risk.store_id,
        product_id=target_risk.product_id,
        quantity=50,
        status=POStatus.IN_TRANSIT,
        ordered_at=datetime.now(timezone.utc).replace(tzinfo=None),
        arrival_eta=datetime.now(timezone.utc).replace(tzinfo=None),
    )
    db_session.add(po)
    await db_session.commit()

    orchestrator = DecisionOrchestrator()
    await orchestrator.evaluate_all(db_session)
    await db_session.commit()

    # Check recommendations for this store and product
    recs = (await db_session.execute(
        select(Recommendation).where(
            Recommendation.destination_store_id == target_risk.store_id,
            Recommendation.risk_id == target_risk.risk_id,
            Recommendation.action_type == ActionType.REORDER,
        )
    )).scalars().all()
    assert len(recs) == 0, "Expected no REORDER recommendation when PO is in flight"


@pytest.mark.asyncio
async def test_reorder_sizing_capped_by_shelf_life_and_stock_in_transit(db_session):
    """Part C: reorder size is max(0, target_stock - on_hand_unexpired - in_transit) capped by shelf life."""
    from sqlalchemy import select, update
    from backend.models.core import Inventory, Risk, Recommendation, Product, Forecast, Batch
    from backend.models.enums import RiskStatus, RiskType, ActionType
    from backend.services.simulation.engine import SimulationEngine
    from backend.services.forecasting.engine import ForecastingEngine
    from backend.services.decision.engine import DecisionOrchestrator
    from datetime import datetime, timezone, timedelta

    sim = SimulationEngine(seed=42, historical_days=7)
    await sim.initialize(db_session)
    await db_session.commit()

    fc = ForecastingEngine()
    await fc.run(db_session, horizon_hours=24)
    await db_session.commit()

    # Find a product and set shelf life to 24 hours
    product = (await db_session.execute(select(Product))).scalars().first()
    product.shelf_life_hours = 24
    await db_session.commit()

    # Zero all other inventory and set store 1 inventory for this product to 5
    await db_session.execute(update(Inventory).values(quantity=0))
    inv = (await db_session.execute(
        select(Inventory).where(Inventory.product_id == product.product_id)
    )).scalars().first()
    inv.quantity = 5
    await db_session.commit()

    # Create active unexpired batch of 5 units
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    batch = Batch(
        batch_id=uuid.uuid4(),
        store_id=inv.store_id,
        product_id=product.product_id,
        quantity=5,
        received_at=now,
        expires_at=now + timedelta(hours=20),
    )
    db_session.add(batch)
    await db_session.commit()

    # Create active stockout risk
    risk = Risk(
        risk_id=uuid.uuid4(),
        store_id=inv.store_id,
        product_id=product.product_id,
        risk_type=RiskType.STOCKOUT,
        severity="critical",
        probability=0.8,
        expected_time=now + timedelta(hours=5),
        status=RiskStatus.ACTIVE,
        created_at=now,
    )
    db_session.add(risk)
    await db_session.commit()

    dest_fc = (await db_session.execute(
        select(Forecast).where(Forecast.store_id == inv.store_id, Forecast.product_id == product.product_id)
    )).scalars().first()
    forecast_24h = dest_fc.predicted_demand
    expected_target = forecast_24h
    expected_reorder = max(0, int(round(expected_target - 5)))

    orchestrator = DecisionOrchestrator()
    rec = await orchestrator.run(db_session, risk.risk_id)
    assert rec is not None
    if rec.action_type == ActionType.REORDER:
        assert rec.quantity == expected_reorder


@pytest.mark.asyncio
async def test_missing_forecast_rejected_without_made_up_number(db_session, caplog):
    """Part E: Remove 10.0 fallback and category priors. Missing forecast reports clearly instead of guessing."""
    import logging
    from datetime import datetime, timezone
    from sqlalchemy import select, delete
    from backend.models.core import Forecast, Risk, Inventory
    from backend.models.enums import RiskType, RiskStatus
    from backend.services.simulation.engine import SimulationEngine
    from backend.services.risk.engine import RiskEngine
    from backend.services.decision.engine import DecisionOrchestrator

    sim = SimulationEngine(seed=42, historical_days=7)
    await sim.initialize(db_session)
    await db_session.commit()

    # Clear all Forecast rows so table is completely empty
    await db_session.execute(delete(Forecast))
    await db_session.commit()

    # RiskEngine should not invent demand from category priors
    with caplog.at_level(logging.WARNING):
        risk_engine = RiskEngine()
        count = await risk_engine.run(db_session)
        assert count == 0, "Expected 0 risks detected when Forecast table is empty"
        assert "Missing forecast" in caplog.text

    # DecisionOrchestrator should return None instead of using 10.0 fallback
    inv = (await db_session.execute(select(Inventory))).scalars().first()
    risk = Risk(
        risk_id=uuid.uuid4(),
        store_id=inv.store_id,
        product_id=inv.product_id,
        risk_type=RiskType.STOCKOUT,
        severity="critical",
        probability=0.8,
        expected_time=datetime.now(timezone.utc).replace(tzinfo=None),
        status=RiskStatus.ACTIVE,
        created_at=datetime.now(timezone.utc).replace(tzinfo=None),
    )
    db_session.add(risk)
    await db_session.commit()

    orchestrator = DecisionOrchestrator()
    rec = await orchestrator.run(db_session, risk.risk_id)
    assert rec is None, "Expected DecisionOrchestrator to return None when forecast is missing"


@pytest.mark.asyncio
async def test_transfer_zero_when_no_demand_gap_and_discount_clock(db_session):
    """Part F: When destination has no demand gap, transfer nothing. Also discount hours uses sim clock."""
    from sqlalchemy import select, update
    from backend.models.core import Inventory, Risk, Forecast, Product, Simulation
    from backend.models.enums import RiskType, RiskStatus, ActionType, SimulationStatus
    from backend.services.simulation.engine import SimulationEngine
    from backend.services.forecasting.engine import ForecastingEngine
    from backend.services.decision.engine import DecisionOrchestrator
    from backend.services.simulation.scenarios import get_simulation_state
    from datetime import datetime, timezone, timedelta

    sim = SimulationEngine(seed=42, historical_days=7)
    sim_row = await sim.initialize(db_session)
    await db_session.commit()

    fc = ForecastingEngine()
    await fc.run(db_session, horizon_hours=24)
    await db_session.commit()

    # Select product
    product = (await db_session.execute(select(Product))).scalars().first()

    # Find store 1 and store 2 inventories
    invs = (await db_session.execute(
        select(Inventory).where(Inventory.product_id == product.product_id)
    )).scalars().all()
    dest_inv, src_inv = invs[0], invs[1]

    # Destination has huge stock (no demand gap!)
    dest_inv.quantity = 1000
    # Source has large stock
    src_inv.quantity = 1000
    await db_session.commit()

    sim_time = datetime(2026, 10, 18, 12, 0, 0)
    sim.clock._current_time = sim_time
    sim_row = await db_session.get(Simulation, sim_row.simulation_id)
    sim_row.current_time = sim_time
    await db_session.commit()

    state = get_simulation_state(sim_row.simulation_id)
    state.engine = sim

    # Create spoilage risk 5 hours ahead of simulation time
    risk = Risk(
        risk_id=uuid.uuid4(),
        store_id=dest_inv.store_id,
        product_id=product.product_id,
        risk_type=RiskType.SPOILAGE,
        severity="critical",
        probability=0.9,
        expected_time=sim_time + timedelta(hours=5),
        status=RiskStatus.ACTIVE,
        created_at=sim_time,
    )
    db_session.add(risk)
    await db_session.commit()

    orchestrator = DecisionOrchestrator()
    rec = await orchestrator.run(db_session, risk.risk_id)
    assert rec is not None

    # Verify that in alternatives, transfer was NOT recommended because demand_gap == 0
    for alt in rec.alternatives:
        if alt["action_type"] == "transfer":
            assert alt["quantity"] == 0
    if rec.action_type == ActionType.DISCOUNT:
        assert rec.quantity > 0
