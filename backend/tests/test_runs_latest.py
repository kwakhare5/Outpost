"""Tests for GET /api/simulations/runs/latest endpoint."""
import uuid
from datetime import datetime, timezone
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.core import RunRecord


@pytest.mark.asyncio
async def test_runs_latest_empty_state(client: AsyncClient):
    """(c) No RunRecord rows gives the empty state."""
    res = await client.get("/api/simulations/runs/latest")
    assert res.status_code == 200
    data = res.json()
    assert data["has_runs"] is False
    assert data["baseline"] is None
    assert data["outpost"] is None
    assert data["deltas"] is None


@pytest.mark.asyncio
async def test_runs_latest_matching_pair_gives_correct_deltas(client: AsyncClient, db_session: AsyncSession):
    """(a) Matching pair gives correct deltas."""
    sim_id = uuid.uuid4()
    now = datetime.now(timezone.utc).replace(tzinfo=None)

    baseline = RunRecord(
        run_id=uuid.uuid4(),
        simulation_id=sim_id,
        seed=42,
        policy="baseline",
        window_hours=168,
        lost_sales_units=100,
        waste_units=20,
        rupee_loss=4000.0,
        availability_pct=85.0,
        created_at=now,
    )
    outpost = RunRecord(
        run_id=uuid.uuid4(),
        simulation_id=sim_id,
        seed=42,
        policy="outpost",
        window_hours=168,
        lost_sales_units=30,
        waste_units=25,
        rupee_loss=1500.0,
        availability_pct=95.0,
        created_at=now,
    )
    db_session.add(baseline)
    db_session.add(outpost)
    await db_session.commit()

    res = await client.get("/api/simulations/runs/latest")
    assert res.status_code == 200
    data = res.json()
    assert data["has_runs"] is True
    assert data["seed"] == 42
    assert data["window_hours"] == 168
    assert data["baseline"]["seed"] == 42
    assert data["outpost"]["seed"] == 42
    assert data["baseline"]["window_hours"] == 168
    assert data["outpost"]["window_hours"] == 168

    deltas = data["deltas"]
    assert deltas["lost_sales_units_delta"] == -70
    assert deltas["waste_units_delta"] == 5
    assert deltas["rupee_loss_delta"] == -2500.0
    assert deltas["availability_pct_delta"] == 10.0


@pytest.mark.asyncio
async def test_runs_latest_baseline_different_seed_not_paired(client: AsyncClient, db_session: AsyncSession):
    """(b) Baseline with a different seed is NOT paired."""
    sim_id = uuid.uuid4()
    now = datetime.now(timezone.utc).replace(tzinfo=None)

    # Baseline has seed 99, outpost has seed 42
    baseline = RunRecord(
        run_id=uuid.uuid4(),
        simulation_id=sim_id,
        seed=99,
        policy="baseline",
        window_hours=168,
        lost_sales_units=100,
        waste_units=20,
        rupee_loss=4000.0,
        availability_pct=85.0,
        created_at=now,
    )
    outpost = RunRecord(
        run_id=uuid.uuid4(),
        simulation_id=sim_id,
        seed=42,
        policy="outpost",
        window_hours=168,
        lost_sales_units=30,
        waste_units=25,
        rupee_loss=1500.0,
        availability_pct=95.0,
        created_at=now,
    )
    db_session.add(baseline)
    db_session.add(outpost)
    await db_session.commit()

    res = await client.get("/api/simulations/runs/latest")
    assert res.status_code == 200
    data = res.json()
    assert data["has_runs"] is False
    assert data["message"] == "No matching baseline run yet"
    assert data["baseline"] is None
    assert data["deltas"] is None
    assert data["outpost"]["seed"] == 42
