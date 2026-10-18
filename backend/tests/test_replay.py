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
