"""Tests for sequential replay idempotency and execution against pre-seeded databases.

Verifies:
1. Replay can be executed twice in a row on the same database without primary key / constraint errors.
2. Operational database table row counts match exactly after each replay run.
3. Replay succeeds on a database that was already seeded by another simulation.
"""
import pytest
from sqlalchemy import select, func

from backend.models.core import (
    Store, Supplier, Product, Customer,
    Order, OrderItem, Inventory, Batch,
    Forecast, Risk, Recommendation, Action,
    Shipment, PurchaseOrder, ReceiptConfirmation,
    OutcomeRecord, Simulation, RunRecord,
)
from backend.services.simulation.engine import SimulationEngine
from backend.services.simulation.replay import run_replay

OPERATIONAL_MODELS = [
    Store, Supplier, Product, Customer,
    Order, OrderItem, Inventory, Batch,
    Forecast, Risk, Recommendation, Action,
    Shipment, PurchaseOrder, ReceiptConfirmation,
    OutcomeRecord, Simulation,
]


async def get_model_counts(session) -> dict[str, int]:
    counts = {}
    for model in OPERATIONAL_MODELS:
        count = (await session.execute(select(func.count()).select_from(model))).scalar_one()
        counts[model.__name__] = count
    return counts


@pytest.mark.asyncio
async def test_replay_twice_in_a_row_matches_row_counts(db_session):
    """Running replay twice in a row on the same database must succeed and produce identical row counts."""
    # Run 1
    result1 = await run_replay(
        db=db_session,
        seed=42,
        window_hours=24,
        step_hours=6,
        historical_days=3,
    )
    counts1 = await get_model_counts(db_session)
    run_records_1 = (await db_session.execute(select(func.count()).select_from(RunRecord))).scalar_one()

    assert result1["baseline"]["policy"] == "baseline"
    assert result1["outpost"]["policy"] == "outpost"
    assert run_records_1 == 2

    # Run 2 on the same database session
    result2 = await run_replay(
        db=db_session,
        seed=42,
        window_hours=24,
        step_hours=6,
        historical_days=3,
    )
    counts2 = await get_model_counts(db_session)
    run_records_2 = (await db_session.execute(select(func.count()).select_from(RunRecord))).scalar_one()

    assert result2["baseline"]["policy"] == "baseline"
    assert result2["outpost"]["policy"] == "outpost"
    assert run_records_2 == 4

    # Row counts must match exactly between runs for all operational tables
    assert counts1 == counts2

    # Deterministic simulation results and deltas must match across runs
    assert result1["baseline"]["lost_sales_units"] == result2["baseline"]["lost_sales_units"]
    assert result1["baseline"]["waste_units"] == result2["baseline"]["waste_units"]
    assert result1["outpost"]["lost_sales_units"] == result2["outpost"]["lost_sales_units"]
    assert result1["outpost"]["waste_units"] == result2["outpost"]["waste_units"]
    assert result1["deltas"] == result2["deltas"]


@pytest.mark.asyncio
async def test_replay_on_already_seeded_database_succeeds(db_session):
    """Replay must succeed when invoked on a database that already contains seeded data."""
    # Seed the database beforehand with a different seed/simulation
    prior_engine = SimulationEngine(seed=99, historical_days=3, policy="outpost")
    await prior_engine.initialize(db_session)
    await db_session.commit()

    prior_counts = await get_model_counts(db_session)
    assert prior_counts["Store"] > 0
    assert prior_counts["Product"] > 0

    # Execute replay; must not raise UniqueViolationError or foreign key error
    result = await run_replay(
        db=db_session,
        seed=42,
        window_hours=24,
        step_hours=6,
        historical_days=3,
    )

    assert result["seed"] == 42
    assert result["baseline"]["policy"] == "baseline"
    assert result["outpost"]["policy"] == "outpost"
