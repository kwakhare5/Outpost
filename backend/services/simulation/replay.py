"""Sequential same-seed replay (Spec Section 3 Decisions 1, 2, 8, 9; Spec Section 5; Phase 2 Step 5 & 6).

Runs two passes with the exact same seed:
1. Baseline policy: fixed reorder rule only, zero transfers, zero discounts, zero agent loop.
2. Outpost policy: autonomous risk scan, decision recommendations, approval, and execution loop.

Records a RunRecord for each pass and returns both rows and their deltas.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone, timedelta
from typing import Any, Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.core import RunRecord, Simulation
from backend.services.metrics import compute_simulation_metrics, RUPEE_PRICE_ASSUMPTION
from backend.services.simulation.engine import SimulationEngine, clear_simulation_data
from backend.services.simulation.scenarios import get_or_create_simulation_state


DETERMINISTIC_NOTE = (
    "Because seeding is deterministic (uuid5 ids, seeded rng, reset clears registries), "
    "both runs face the same world and the same order stream."
)


DEFAULT_SIM_START = datetime(2026, 1, 1, 12, 0, 0)


def format_replay_report(result: dict[str, Any]) -> str:
    """Format plain-text before/after comparison report per Spec Section 5 and Phase 2 Step 6."""
    b = result["baseline"]
    o = result["outpost"]
    d = result["deltas"]

    b_ls_r = b.get("rupee_loss_lost_sales", 0.0)
    b_w_r = b.get("rupee_loss_waste", 0.0)
    b_md_r = b.get("rupee_loss_markdown", 0.0)

    o_ls_r = o.get("rupee_loss_lost_sales", 0.0)
    o_w_r = o.get("rupee_loss_waste", 0.0)
    o_md_r = o.get("rupee_loss_markdown", 0.0)

    d_ls_r = d.get("rupee_loss_lost_sales_delta", 0.0)
    d_w_r = d.get("rupee_loss_waste_delta", 0.0)
    d_md_r = d.get("rupee_loss_markdown_delta", 0.0)

    return (
        f"================================================================================\n"
        f"OUTPOST SEQUENTIAL SAME-SEED REPLAY REPORT\n"
        f"================================================================================\n"
        f"Seed:            {result['seed']}\n"
        f"Scenario:        {result.get('scenario', 'normal')}\n"
        f"Sim Start:       {result.get('sim_start', 'N/A')}\n"
        f"Window:          {result['window_hours']} hours\n"
        f"Environment:     {result['deterministic_note']}\n\n"
        f"--- RUN RECORDS ---\n"
        f"Baseline Run:\n"
        f"  Run ID:        {b['run_id']}\n"
        f"  Policy:        {b['policy']}\n"
        f"  Lost Sales:    {b['lost_sales_units']} units\n"
        f"  Waste:         {b['waste_units']} units\n"
        f"  Rupee Loss:    Rs {b['rupee_loss']:,.2f} (lost sales: Rs {b_ls_r:,.2f}, waste: Rs {b_w_r:,.2f}, markdown: Rs {b_md_r:,.2f})\n"
        f"  Availability:  {b['availability_pct']:.2f}%\n"
        f"  Transfers:     {b.get('transfers', 0)}\n"
        f"  Reorders:      {b.get('reorders', 0)}\n"
        f"  Discounts:     {b.get('discounts', 0)}\n\n"
        f"Outpost Run:\n"
        f"  Run ID:        {o['run_id']}\n"
        f"  Policy:        {o['policy']}\n"
        f"  Lost Sales:    {o['lost_sales_units']} units\n"
        f"  Waste:         {o['waste_units']} units\n"
        f"  Rupee Loss:    Rs {o['rupee_loss']:,.2f} (lost sales: Rs {o_ls_r:,.2f}, waste: Rs {o_w_r:,.2f}, markdown: Rs {o_md_r:,.2f})\n"
        f"  Availability:  {o['availability_pct']:.2f}%\n"
        f"  Transfers:     {o.get('transfers', 0)}\n"
        f"  Reorders:      {o.get('reorders', 0)}\n"
        f"  Discounts:     {o.get('discounts', 0)}\n\n"
        f"--- DELTAS (Outpost minus Baseline) ---\n"
        f"  Lost Sales Delta:    {d['lost_sales_units_delta']:+d} units\n"
        f"  Waste Delta:         {d['waste_units_delta']:+d} units\n"
        f"  Rupee Loss Delta:    Rs {d['rupee_loss_delta']:+,.2f} (lost sales: Rs {d_ls_r:+,.2f}, waste: Rs {d_w_r:+,.2f}, markdown: Rs {d_md_r:+,.2f})\n"
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
    scenario: str = "normal",
    sim_start: datetime | None = None,
    discount_elasticity: float = 0.0,
) -> dict[str, Any]:
    """Execute sequential same-seed replay comparing baseline vs outpost policies.
    
    Returns dictionary with baseline record, outpost record, deltas, and formatted report.
    """
    if step_hours <= 0:
        step_hours = 1

    # Default to fixed anchor date for reproducibility across all runs
    if sim_start is None:
        anchor_start = DEFAULT_SIM_START
    else:
        anchor_start = sim_start.replace(tzinfo=None) if sim_start.tzinfo else sim_start

    # =========================================================================
    # PASS 1: Baseline Policy (Fixed reorder rule only)
    # =========================================================================
    await clear_simulation_data(db)
    from backend.services.simulation.scenarios import clear_simulation_states, apply_scenario, get_scenario_config
    clear_simulation_states()
    engine = SimulationEngine(
        seed=seed,
        historical_days=historical_days,
        policy="baseline",
        sim_start=anchor_start,
        discount_elasticity=discount_elasticity,
    )
    engine.active_scenario = scenario
    engine.active_scenario_config = get_scenario_config(scenario)
    sim_baseline = await engine.initialize(db, policy="baseline", sim_start=anchor_start)
    if scenario != "normal":
        await apply_scenario(db, engine, scenario)

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

    # Drained store metrics for spatial skew scenarios (e.g. network_imbalance)
    from backend.models.core import Store
    all_stores_b = (await db.execute(select(Store))).scalars().all()
    drained_store_b = next((s for s in all_stores_b if "Andheri" in s.name), None)
    metrics_baseline_drained = None
    if drained_store_b:
        metrics_baseline_drained = await compute_simulation_metrics(
            db,
            start_time=start_time_baseline,
            end_time=end_time_baseline,
            store_id=drained_store_b.store_id,
        )

    # Real count of baseline purchase orders generated by the fixed policy
    from backend.models.core import PurchaseOrder as PurchaseOrderModel
    baseline_reorders_res = await db.execute(select(func.count(PurchaseOrderModel.po_id)))
    baseline_reorders_count = baseline_reorders_res.scalar() or 0

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
    if scenario != "normal":
        await apply_scenario(db, engine, scenario)
    await fc_engine.run(db, horizons=[6, 12, 24, 48])
    await db.commit()

    # =========================================================================
    # PASS 2: Outpost Policy (Full risk, decision, approval, and execution loop)
    # =========================================================================
    engine.policy = "outpost"
    engine.discount_elasticity = discount_elasticity
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

    all_stores_o = (await db.execute(select(Store))).scalars().all()
    drained_store_o = next((s for s in all_stores_o if "Andheri" in s.name), None)
    metrics_outpost_drained = None
    if drained_store_o:
        metrics_outpost_drained = await compute_simulation_metrics(
            db,
            start_time=start_time_outpost,
            end_time=end_time_outpost,
            store_id=drained_store_o.store_id,
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

    # Count executed actions from database
    from backend.models.core import Action
    from backend.models.enums import ActionType, ActionStatus

    actions_res = await db.execute(
        select(Action.action_type, func.count())
        .where(Action.status.in_([ActionStatus.COMPLETED, ActionStatus.EXECUTING]))
        .group_by(Action.action_type)
    )
    action_counts = dict(actions_res.all())
    transfers_count = 0
    reorders_count = 0
    discounts_count = 0
    for at, cnt in action_counts.items():
        at_str = at.value if hasattr(at, "value") else str(at)
        if at_str.lower() == "transfer":
            transfers_count += cnt
        elif at_str.lower() == "reorder":
            reorders_count += cnt
        elif at_str.lower() == "discount":
            discounts_count += cnt

    # =========================================================================
    # Compute Deltas (Outpost minus Baseline)
    # =========================================================================
    deltas = {
        "lost_sales_units_delta": outpost_record.lost_sales_units - baseline_record.lost_sales_units,
        "waste_units_delta": outpost_record.waste_units - baseline_record.waste_units,
        "rupee_loss_delta": round(outpost_record.rupee_loss - baseline_record.rupee_loss, 2),
        "rupee_loss_lost_sales_delta": round(metrics_outpost.rupee_loss_lost_sales - metrics_baseline.rupee_loss_lost_sales, 2),
        "rupee_loss_waste_delta": round(metrics_outpost.rupee_loss_waste - metrics_baseline.rupee_loss_waste, 2),
        "rupee_loss_markdown_delta": round(metrics_outpost.rupee_loss_markdown - metrics_baseline.rupee_loss_markdown, 2),
        "availability_pct_delta": round(outpost_record.availability_pct - baseline_record.availability_pct, 2),
    }

    result = {
        "seed": seed,
        "scenario": scenario,
        "sim_start": anchor_start.isoformat(),
        "discount_elasticity": discount_elasticity,
        "start_time_baseline": start_time_baseline.isoformat(),
        "start_time_outpost": start_time_outpost.isoformat(),
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
            "rupee_loss_lost_sales": metrics_baseline.rupee_loss_lost_sales,
            "rupee_loss_waste": metrics_baseline.rupee_loss_waste,
            "rupee_loss_markdown": metrics_baseline.rupee_loss_markdown,
            "rupee_loss_parts": {
                "lost_sales": metrics_baseline.rupee_loss_lost_sales,
                "waste": metrics_baseline.rupee_loss_waste,
                "markdown": metrics_baseline.rupee_loss_markdown,
                "total": metrics_baseline.rupee_loss,
            },
            "availability_pct": baseline_record.availability_pct,
            "transfers": 0,
            "reorders": baseline_reorders_count,
            "discounts": 0,
            "drained_store_lost_sales": metrics_baseline_drained.lost_sales_units if metrics_baseline_drained else 0,
            "created_at": baseline_record.created_at.isoformat() if baseline_record.created_at else None,
        },
        "outpost": {
            "run_id": str(outpost_record.run_id),
            "simulation_id": str(outpost_record.simulation_id),
            "policy": outpost_record.policy,
            "lost_sales_units": outpost_record.lost_sales_units,
            "waste_units": outpost_record.waste_units,
            "rupee_loss": outpost_record.rupee_loss,
            "rupee_loss_lost_sales": metrics_outpost.rupee_loss_lost_sales,
            "rupee_loss_waste": metrics_outpost.rupee_loss_waste,
            "rupee_loss_markdown": metrics_outpost.rupee_loss_markdown,
            "rupee_loss_parts": {
                "lost_sales": metrics_outpost.rupee_loss_lost_sales,
                "waste": metrics_outpost.rupee_loss_waste,
                "markdown": metrics_outpost.rupee_loss_markdown,
                "total": metrics_outpost.rupee_loss,
            },
            "availability_pct": outpost_record.availability_pct,
            "transfers": transfers_count,
            "reorders": reorders_count,
            "discounts": discounts_count,
            "drained_store_lost_sales": metrics_outpost_drained.lost_sales_units if metrics_outpost_drained else 0,
            "created_at": outpost_record.created_at.isoformat() if outpost_record.created_at else None,
        },
        "deltas": deltas,
    }

    result["report"] = format_replay_report(result)
    return result


async def main():
    """CLI runner for standalone replay with configurable parameters."""
    import argparse
    from backend.config import settings
    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
    from backend.database import Base
    import backend.models  # ensure models registered
    from pathlib import Path

    parser = argparse.ArgumentParser(description="Outpost Sequential Same-Seed Replay")
    parser.add_argument("--seed", type=int, default=42, help="RNG seed")
    parser.add_argument("--window-hours", "--horizon", dest="window_hours", type=int, default=168, help="Replay horizon in hours")
    parser.add_argument("--step-hours", type=int, default=1, help="Advance step size in hours")
    parser.add_argument("--historical-days", type=int, default=7, help="Historical order days")
    parser.add_argument("--scenario", type=str, default="normal", help="Simulation scenario name")
    parser.add_argument("--sim-start", type=str, default=None, help="Fixed simulation anchor date (YYYY-MM-DDTHH:MM:SS)")
    parser.add_argument("--discount-elasticity", type=float, default=0.0, help="Demand elasticity for discounts")

    args = parser.parse_args()

    parsed_sim_start = None
    if args.sim_start:
        parsed_sim_start = datetime.fromisoformat(args.sim_start)

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
        result = await run_replay(
            session,
            seed=args.seed,
            window_hours=args.window_hours,
            step_hours=args.step_hours,
            historical_days=args.historical_days,
            scenario=args.scenario,
            sim_start=parsed_sim_start,
            discount_elasticity=args.discount_elasticity,
        )
        print(result["report"])
    await engine.dispose()


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())

