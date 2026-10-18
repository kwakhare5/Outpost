"""Operational Scenario Driver for Outpost (Phase 2).

Encapsulates the 5 canonical benchmark scenarios:
1. normal: Baseline controlled stochastic Poisson demand across all 5 stores.
2. demand_spike: 2.5x morning surge on perishables (dairy, bakery).
3. supplier_delay: +24h to +48h delay on supplier purchase orders.
4. expiry_wave: Compression of batch expiration dates creating near-term spoilage risk.
5. network_imbalance: Extreme spatial skew (excess in Bandra, critical deficit in Andheri).
"""
from __future__ import annotations

import json
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone, timedelta
from typing import Any

from sqlalchemy import select, func, update
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.core import Store, Product, Inventory, Batch, Event, Simulation
from backend.models.enums import SimulationStatus
from backend.services.simulation.seed_data import STORES, PRODUCTS

SCENARIO_NAMES = [
    'normal',
    'demand_spike',
    'supplier_delay',
    'expiry_wave',
    'network_imbalance',
]


@dataclass
class ScenarioConfig:
    name: str
    description: str
    demand_multiplier_by_category: dict[str, float] = field(default_factory=dict)
    supplier_lead_time_delay_hours: int = 0


_SCENARIO_CONFIGS: dict[str, ScenarioConfig] = {
    'normal': ScenarioConfig(
        name='normal',
        description='Standard operational baseline with controlled stochastic demand.',
        demand_multiplier_by_category={'dairy': 1.0, 'bakery': 1.0, 'produce': 1.0, 'staples': 1.0, 'packaged': 1.0},
        supplier_lead_time_delay_hours=0,
    ),
    'demand_spike': ScenarioConfig(
        name='demand_spike',
        description='Morning surge with +250% demand on dairy and bakery perishables.',
        demand_multiplier_by_category={'dairy': 3.5, 'bakery': 2.5, 'produce': 2.0, 'staples': 1.0, 'packaged': 1.1},
        supplier_lead_time_delay_hours=0,
    ),
    'supplier_delay': ScenarioConfig(
        name='supplier_delay',
        description='Supply chain disruption adding +24h delay to arriving supplier purchase orders.',
        demand_multiplier_by_category={'dairy': 1.0, 'bakery': 1.0, 'produce': 1.0, 'staples': 1.0, 'packaged': 1.0},
        supplier_lead_time_delay_hours=24,
    ),
    'expiry_wave': ScenarioConfig(
        name='expiry_wave',
        description='Perishable batches expiring within 6-12 hours with low baseline sell-through.',
        demand_multiplier_by_category={'dairy': 0.8, 'bakery': 0.8, 'produce': 0.7, 'staples': 1.0, 'packaged': 1.0},
        supplier_lead_time_delay_hours=0,
    ),
    'network_imbalance': ScenarioConfig(
        name='network_imbalance',
        description='Asymmetric spatial distribution with excess in Bandra and critical stockout risk in Andheri.',
        demand_multiplier_by_category={'dairy': 1.2, 'bakery': 1.1, 'produce': 1.0, 'staples': 1.0, 'packaged': 1.0},
        supplier_lead_time_delay_hours=0,
    ),
}


@dataclass
class SimulationState:
    simulation_id: uuid.UUID
    scenario: str = "normal"
    active_transfers: list[Any] = field(default_factory=list)
    active_pos: list[Any] = field(default_factory=list)
    engine: Any = None


_simulation_states: dict[str, SimulationState] = {}
_DEFAULT_SIM_ID = uuid.UUID("00000000-0000-0000-0000-000000000000")
_default_state = SimulationState(simulation_id=_DEFAULT_SIM_ID)


def get_simulation_state(sim_id: str | uuid.UUID | None = None) -> SimulationState:
    """Retrieve the SimulationState for a simulation ID, or default/active."""
    if sim_id is not None:
        key = str(sim_id)
        if key in _simulation_states:
            return _simulation_states[key]
        state = SimulationState(simulation_id=uuid.UUID(key) if isinstance(sim_id, str) else sim_id)
        _simulation_states[key] = state
        return state
    if _simulation_states:
        return next(reversed(list(_simulation_states.values())))
    return _default_state


def get_or_create_simulation_state(sim_id: str | uuid.UUID) -> SimulationState:
    """Get existing or create new SimulationState for a simulation ID."""
    key = str(sim_id)
    if key not in _simulation_states:
        _simulation_states[key] = SimulationState(
            simulation_id=uuid.UUID(key) if isinstance(sim_id, str) else sim_id
        )
    return _simulation_states[key]


def clear_simulation_states() -> None:
    """Clear all simulation states (used during reset / simulated process restart)."""
    _simulation_states.clear()
    _default_state.active_transfers.clear()
    _default_state.active_pos.clear()
    _default_state.scenario = "normal"
    _default_state.engine = None


async def get_active_simulation_id(db: AsyncSession) -> uuid.UUID:
    """Retrieve the ID of the active simulation from the database.

    Checks for a RUNNING simulation, or falls back to the most recent simulation.
    Raises RuntimeError if no active simulation exists in the database.
    """
    stmt = (
        select(Simulation.simulation_id)
        .where(Simulation.status == SimulationStatus.RUNNING)
        .order_by(Simulation.current_time.desc())
        .limit(1)
    )
    res = await db.execute(stmt)
    sim_id = res.scalar_one_or_none()
    if not sim_id:
        stmt_any = select(Simulation.simulation_id).order_by(Simulation.current_time.desc()).limit(1)
        res_any = await db.execute(stmt_any)
        sim_id = res_any.scalar_one_or_none()
    if not sim_id:
        raise RuntimeError("No active simulation found")
    return sim_id



async def restore_simulation_state_from_db(
    db: AsyncSession,
    sim_uuid: uuid.UUID,
    engine: Any = None,
) -> SimulationState:
    """Rebuild per-simulation state (scenario, in-flight vans, purchase orders) from database."""
    from backend.models.core import Shipment, PurchaseOrder as PurchaseOrderModel
    from backend.models.enums import ShipmentStatus, POStatus

    state = get_or_create_simulation_state(sim_uuid)
    if engine is not None:
        state.engine = engine

    # 1. Restore scenario
    sim = await db.get(Simulation, sim_uuid)
    if sim and sim.configuration and isinstance(sim.configuration, dict):
        saved_scenario = sim.configuration.get("scenario", "normal")
        state.scenario = saved_scenario
        if engine is not None:
            engine.active_scenario = saved_scenario
            engine.active_scenario_config = get_scenario_config(saved_scenario)

    # 2. Rebuild in-flight transfers (vans) from Shipment table
    shipments_res = await db.execute(
        select(Shipment).where(
            Shipment.status.in_([ShipmentStatus.IN_TRANSIT, ShipmentStatus.AWAITING_CONFIRMATION])
        )
    )
    shipments = shipments_res.scalars().all()

    from backend.services.simulation.transfer import InTransitTransfer

    state.active_transfers = []
    for s in shipments:
        batch_records = s.batch_records
        if isinstance(batch_records, str):
            try:
                batch_records = json.loads(batch_records)
            except Exception:
                batch_records = []
        elif not isinstance(batch_records, list):
            batch_records = []

        status_str = 'awaiting_confirmation' if (
            s.status == ShipmentStatus.AWAITING_CONFIRMATION or str(s.status) == 'awaiting_confirmation'
        ) else 'in_transit'

        state.active_transfers.append(
            InTransitTransfer(
                transfer_id=s.shipment_id,
                source_store_id=s.source_store_id,
                destination_store_id=s.destination_store_id,
                product_id=s.product_id,
                quantity=s.quantity,
                dispatched_at=s.dispatched_at,
                arrival_eta=s.arrival_eta,
                status=status_str,
                batch_records=batch_records,
                distance_km=s.distance_km,
                traffic_multiplier=s.traffic_multiplier,
            )
        )

    # 3. Rebuild in-flight purchase orders from PurchaseOrder table
    pos_res = await db.execute(
        select(PurchaseOrderModel).where(
            PurchaseOrderModel.status == POStatus.IN_TRANSIT
        )
    )
    po_rows = pos_res.scalars().all()

    from backend.services.simulation.supplier import PurchaseOrder

    state.active_pos = []
    for r in po_rows:
        po_status = 'delayed' if str(r.status) == 'delayed' else 'in_transit'
        state.active_pos.append(
            PurchaseOrder(
                po_id=r.po_id,
                supplier_id=r.supplier_id,
                store_id=r.destination_store_id,
                product_id=r.product_id,
                quantity=r.quantity,
                ordered_at=r.ordered_at,
                expected_arrival=r.arrival_eta,
                status=po_status,
            )
        )

    return state


def get_scenario_config(scenario_name: str) -> ScenarioConfig:
    """Retrieve scenario configuration parameters."""
    if scenario_name not in _SCENARIO_CONFIGS:
        raise ValueError(f"Unknown scenario '{scenario_name}'. Available: {SCENARIO_NAMES}")
    return _SCENARIO_CONFIGS[scenario_name]


def get_current_scenario_config(sim_id: str | uuid.UUID | None = None) -> ScenarioConfig:
    """Retrieve currently active scenario configuration parameters for a simulation."""
    state = get_simulation_state(sim_id)
    scenario_name = state.scenario if state else 'normal'
    return _SCENARIO_CONFIGS.get(scenario_name, _SCENARIO_CONFIGS['normal'])


def set_current_scenario(scenario_name: str, sim_id: str | uuid.UUID | None = None) -> ScenarioConfig:
    """Set the currently active scenario for a simulation and return its config."""
    if scenario_name not in _SCENARIO_CONFIGS:
        raise ValueError(f"Unknown scenario '{scenario_name}'. Available: {SCENARIO_NAMES}")
    state = get_simulation_state(sim_id)
    if state:
        state.scenario = scenario_name
    return _SCENARIO_CONFIGS[scenario_name]


async def apply_scenario(
    db: AsyncSession,
    engine: Any,
    scenario_name: str,
) -> dict[str, Any]:
    """Inject scenario conditions into the live simulation database."""
    sim_id = getattr(engine, 'simulation_id', None)
    config = set_current_scenario(scenario_name, sim_id=sim_id)
    if engine is not None:
        setattr(engine, 'active_scenario', scenario_name)
        setattr(engine, 'active_scenario_config', config)

    # Persist scenario to database simulation configuration
    if sim_id:
        sim = await db.get(Simulation, sim_id)
        if sim:
            cfg = dict(sim.configuration or {})
            cfg['scenario'] = scenario_name
            sim.configuration = cfg
            await db.flush()

    now = engine.clock.now if (engine and getattr(engine, 'clock', None)) else datetime.now(timezone.utc)
    now_naive = now.replace(tzinfo=None) if now.tzinfo else now

    if scenario_name == 'network_imbalance':
        # Drain Andheri milk to <= 4 units and inflate Bandra milk to >= 80 units
        all_stores = (await db.execute(select(Store))).scalars().all()
        bandra = next((s for s in all_stores if 'Bandra' in s.name), None)
        andheri = next((s for s in all_stores if 'Andheri' in s.name), None)

        all_prods = (await db.execute(select(Product))).scalars().all()
        milk = next((p for p in all_prods if 'Milk' in p.name), None)

        if bandra and andheri and milk:
            # Drain non-Bandra stores down to tight stock (3 units) and inflate Bandra to 85 units
            other_stores = [s for s in all_stores if s.store_id != bandra.store_id]
            for st in other_stores:
                st_batches = (await db.execute(
                    select(Batch).where(
                        Batch.store_id == st.store_id,
                        Batch.product_id == milk.product_id,
                        Batch.quantity > 0,
                    )
                )).scalars().all()
                for idx, b in enumerate(st_batches):
                    b.quantity = 3 if idx == 0 else 0
                st_inv = (await db.execute(
                    select(Inventory).where(Inventory.store_id == st.store_id, Inventory.product_id == milk.product_id)
                )).scalar_one_or_none()
                if st_inv:
                    st_inv.quantity = 3

            # Inflate Bandra active batches up to 85 units
            bandra_batches = (await db.execute(
                select(Batch).where(
                    Batch.store_id == bandra.store_id,
                    Batch.product_id == milk.product_id,
                    Batch.quantity > 0,
                )
            )).scalars().all()
            if bandra_batches:
                bandra_batches[0].quantity = 85
            else:
                db.add(Batch(
                    batch_id=uuid.uuid4(),
                    store_id=bandra.store_id,
                    product_id=milk.product_id,
                    quantity=85,
                    received_at=now_naive,
                    expires_at=now_naive + timedelta(hours=72),
                ))

            bandra_inv = (await db.execute(
                select(Inventory).where(Inventory.store_id == bandra.store_id, Inventory.product_id == milk.product_id)
            )).scalar_one_or_none()
            if bandra_inv:
                bandra_inv.quantity = 85

    elif scenario_name == 'expiry_wave':
        # Compress perishable batches to expire within 6 to 10 hours
        perishable_prods = (await db.execute(
            select(Product).where(Product.category.in_(['dairy', 'bakery']))
        )).scalars().all()
        prod_ids = [p.product_id for p in perishable_prods]

        batches = (await db.execute(
            select(Batch).where(
                Batch.product_id.in_(prod_ids),
                Batch.quantity > 0,
                Batch.expires_at > now_naive,
            )
        )).scalars().all()

        for idx, b in enumerate(batches):
            hours_left = 6 + (idx % 4)  # 6, 7, 8, 9 hours
            b.expires_at = now_naive + timedelta(hours=hours_left)

    # Record event
    event = Event(
        event_id=uuid.uuid4(),
        event_type='SCENARIO_APPLIED',
        timestamp=now,
        entity_type='scenario',
        entity_id=uuid.uuid4(),
        payload={
            'scenario': scenario_name,
            'description': config.description,
            'demand_multipliers': config.demand_multiplier_by_category,
            'supplier_delay_hours': config.supplier_lead_time_delay_hours,
        },
    )
    db.add(event)
    await db.flush()

    return {
        'scenario': scenario_name,
        'status': 'applied',
        'description': config.description,
        'demand_multipliers': config.demand_multiplier_by_category,
        'supplier_delay_hours': config.supplier_lead_time_delay_hours,
    }

