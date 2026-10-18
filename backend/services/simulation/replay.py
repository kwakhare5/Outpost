"""Sequential same-seed replay (Spec Section 3 Decisions 1, 2, 8, 9; Spec Section 5; Phase 2 Step 5 & 6).

Runs two passes with the exact same seed:
1. Baseline policy: fixed reorder rule only, zero transfers, zero discounts, zero agent loop.
2. Outpost policy: autonomous risk scan, decision recommendations, approval, and execution loop.

Records a RunRecord for each pass and returns both rows and their deltas.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.core import RunRecord, Simulation
from backend.services.metrics import compute_simulation_metrics, RUPEE_PRICE_ASSUMPTION
from backend.services.simulation.engine import SimulationEngine
from backend.services.simulation.scenarios import get_or_create_simulation_state


DETERMINISTIC_NOTE = (
    "Because seeding is deterministic (uuid5 ids, seeded rng, reset clears registries), "
    "both runs face the same world and the same order stream."
)


def format_replay_report(result: dict[str, Any]) -> str:
    """Format plain-text before/after comparison report per Spec Section 5 and Phase 2 Step 6."""
    b = result["baseline"]
    o = result["outpost"]
    d = result["deltas"]

    return (
        f"================================================================================\n"
        f"OUTPOST SEQUENTIAL SAME-SEED REPLAY REPORT\n"
        f"================================================================================\n"
        f"Seed:            {result['seed']}\n"
        f"Window:          {result['window_hours']} hours\n"
        f"Environment:     {result['deterministic_note']}\n\n"
        f"--- RUN RECORDS ---\n"
        f"Baseline Run:\n"
        f"  Run ID:        {b['run_id']}\n"
        f"  Policy:        {b['policy']}\n"
        f"  Lost Sales:    {b['lost_sales_units']} units\n"
        f"  Waste:         {b['waste_units']} units\n"
        f"  Rupee Loss:    Rs {b['rupee_loss']:,.2f}\n"
        f"  Availability:  {b['availability_pct']:.2f}%\n\n"
        f"Outpost Run:\n"
        f"  Run ID:        {o['run_id']}\n"
        f"  Policy:        {o['policy']}\n"
        f"  Lost Sales:    {o['lost_sales_units']} units\n"
        f"  Waste:         {o['waste_units']} units\n"
        f"  Rupee Loss:    Rs {o['rupee_loss']:,.2f}\n"
        f"  Availability:  {o['availability_pct']:.2f}%\n\n"
        f"--- DELTAS (Outpost minus Baseline) ---\n"
        f"  Lost Sales Delta:    {d['lost_sales_units_delta']:+d} units\n"
        f"  Waste Delta:         {d['waste_units_delta']:+d} units\n"
        f"  Rupee Loss Delta:    Rs {d['rupee_loss_delta']:+,.2f}\n"
        f"  Availability Delta:  {d['availability_pct_delta']:+.2f}%\n\n"
        f"--- RUPEE PRICE ASSUMPTION ---\n"
        f"  {result['rupee_price_assumption']}\n"
        f"================================================================================"
    )


async def run_replay(
    db: AsyncSession,
    seed: int = 42,
    window_hours: int = 168,
    step_hours: int = 1,
    historical_days: int = 7,
) -> dict[str, Any]:
    """Execute sequential same-seed replay comparing baseline vs outpost policies.
    
    Returns dictionary with baseline record, outpost record, deltas, and formatted report.
    """
    if step_hours <= 0:
        step_hours = 1

    # =========================================================================
    # PASS 1: Baseline Policy (Fixed reorder rule only)
    # =========================================================================
    engine = SimulationEngine(seed=seed, historical_days=historical_days, policy="baseline")
    sim_baseline = await engine.initialize(db, policy="baseline")
    from backend.services.forecasting.engine import ForecastingEngine
    fc_engine = ForecastingEngine()
    await fc_engine.run(db, horizons=[6, 12, 24, 48])
    await db.commit()

    start_time_baseline = engine.clock.now

    hours_left = window_hours
    while hours_left > 0:
        step = min(hours_left, step_hours)
        await engine.advance_time(db, sim_baseline.simulation_id, hours=step, auto_execute=False)
        hours_left -= step

    end_time_baseline = engine.clock.now
    metrics_baseline = await compute_simulation_metrics(
        db,
        start_time=start_time_baseline,
        end_time=end_time_baseline,
    )

    baseline_record = RunRecord(
        run_id=uuid.uuid4(),
        simulation_id=sim_baseline.simulation_id,
        seed=seed,
        policy="baseline",
        window_hours=window_hours,
        lost_sales_units=metrics_baseline.lost_sales_units,
        waste_units=metrics_baseline.waste_units,
        rupee_loss=metrics_baseline.rupee_loss,
        availability_pct=metrics_baseline.availability_pct,
        created_at=datetime.now(timezone.utc).replace(tzinfo=None),
    )
    db.add(baseline_record)
    await db.commit()

    # =========================================================================
    # RESET: Clear generated data and registries
    # =========================================================================
    await engine.reset(db, sim_baseline.simulation_id)
    await fc_engine.run(db, horizons=[6, 12, 24, 48])
    await db.commit()

    # =========================================================================
    # PASS 2: Outpost Policy (Full risk, decision, approval, and execution loop)
    # =========================================================================
    engine.policy = "outpost"
    state = get_or_create_simulation_state(engine.simulation_id)
    state.policy = "outpost"
    sim_outpost = await db.get(Simulation, engine.simulation_id)
    if sim_outpost:
        sim_outpost.configuration["policy"] = "outpost"
        await db.commit()

    start_time_outpost = engine.clock.now

    hours_left = window_hours
    while hours_left > 0:
        step = min(hours_left, step_hours)
        await engine.advance_time(db, engine.simulation_id, hours=step, auto_execute=True)
        hours_left -= step

    end_time_outpost = engine.clock.now
    metrics_outpost = await compute_simulation_metrics(
        db,
        start_time=start_time_outpost,
        end_time=end_time_outpost,
    )

    outpost_record = RunRecord(
        run_id=uuid.uuid4(),
        simulation_id=engine.simulation_id,
        seed=seed,
        policy="outpost",
        window_hours=window_hours,
        lost_sales_units=metrics_outpost.lost_sales_units,
        waste_units=metrics_outpost.waste_units,
        rupee_loss=metrics_outpost.rupee_loss,
        availability_pct=metrics_outpost.availability_pct,
        created_at=datetime.now(timezone.utc).replace(tzinfo=None),
    )
    db.add(outpost_record)
    await db.commit()

    # =========================================================================
    # Compute Deltas (Outpost minus Baseline)
    # =========================================================================
    deltas = {
        "lost_sales_units_delta": outpost_record.lost_sales_units - baseline_record.lost_sales_units,
        "waste_units_delta": outpost_record.waste_units - baseline_record.waste_units,
        "rupee_loss_delta": round(outpost_record.rupee_loss - baseline_record.rupee_loss, 2),
        "availability_pct_delta": round(outpost_record.availability_pct - baseline_record.availability_pct, 2),
    }

    result = {
        "seed": seed,
        "window_hours": window_hours,
        "deterministic_note": DETERMINISTIC_NOTE,
        "rupee_price_assumption": RUPEE_PRICE_ASSUMPTION,
        "baseline": {
            "run_id": str(baseline_record.run_id),
            "simulation_id": str(baseline_record.simulation_id),
            "policy": baseline_record.policy,
            "lost_sales_units": baseline_record.lost_sales_units,
            "waste_units": baseline_record.waste_units,
            "rupee_loss": baseline_record.rupee_loss,
            "availability_pct": baseline_record.availability_pct,
            "created_at": baseline_record.created_at.isoformat() if baseline_record.created_at else None,
        },
        "outpost": {
            "run_id": str(outpost_record.run_id),
            "simulation_id": str(outpost_record.simulation_id),
            "policy": outpost_record.policy,
            "lost_sales_units": outpost_record.lost_sales_units,
            "waste_units": outpost_record.waste_units,
            "rupee_loss": outpost_record.rupee_loss,
            "availability_pct": outpost_record.availability_pct,
            "created_at": outpost_record.created_at.isoformat() if outpost_record.created_at else None,
        },
        "deltas": deltas,
    }

    result["report"] = format_replay_report(result)
    return result


async def main():
    """CLI runner for standalone replay."""
    from backend.config import settings
    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
    from backend.database import Base
    import backend.models  # ensure models registered
    from pathlib import Path

    engine = None
    try:
        candidate_engine = create_async_engine(settings.DATABASE_URL, echo=False)
        async with candidate_engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        engine = candidate_engine
    except Exception:
        db_path = Path(__file__).resolve().parent.parent.parent / "test.db"
        db_url = f"sqlite+aiosqlite:///{db_path.as_posix()}"
        engine = create_async_engine(db_url, echo=False)
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as session:
        result = await run_replay(session, seed=42, window_hours=168, step_hours=1, historical_days=7)
        print(result["report"])
    await engine.dispose()


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())

