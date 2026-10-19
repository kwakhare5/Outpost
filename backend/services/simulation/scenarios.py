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
    'store_short_excess',
]


@dataclass
class ScenarioConfig:
    name: str
    description: str
    demand_multiplier_by_category: dict[str, float] = field(default_factory=dict)
    supplier_lead_time_delay_hours: int = 0
    duration_hours: int | None = None


_SCENARIO_CONFIGS: dict[str, ScenarioConfig] = {
    'normal': ScenarioConfig(
        name='normal',
        description='Standard operational baseline with controlled stochastic demand.',
        demand_multiplier_by_category={'dairy': 1.0, 'bakery': 1.0, 'produce': 1.0, 'staples': 1.0, 'packaged': 1.0},
        supplier_lead_time_delay_hours=0,
    ),
    'demand_spike': ScenarioConfig(
        name='demand_spike',
        description='Demand surge on one store and product group for 24 hours.',
        demand_multiplier_by_category={'dairy': 3.5, 'bakery': 2.5, 'produce': 2.0, 'staples': 1.0, 'packaged': 1.1},
        supplier_lead_time_delay_hours=0,
        duration_hours=24,
    ),
    'supplier_delay': ScenarioConfig(
        name='supplier_delay',
        description='Supplier lead time doubled (x2) for 48 hours.',
        demand_multiplier_by_category={'dairy': 1.0, 'bakery': 1.0, 'produce': 1.0, 'staples': 1.0, 'packaged': 1.0},
        supplier_lead_time_delay_hours=24,
        duration_hours=48,
    ),
    'expiry_wave': ScenarioConfig(
        name='expiry_wave',
        description='Perishable batches expiring within 6-12 hours with low baseline sell-through.',
        demand_multiplier_by_category={'dairy': 0.8, 'bakery': 0.8, 'produce': 0.7, 'staples': 1.0, 'packaged': 1.0},
        supplier_lead_time_delay_hours=0,
    ),
    'network_imbalance': ScenarioConfig(
        name='network_imbalance',
        description='A store running short while another has excess inventory.',
        demand_multiplier_by_category={'dairy': 1.2, 'bakery': 1.1, 'produce': 1.0, 'staples': 1.0, 'packaged': 1.0},
        supplier_lead_time_delay_hours=0,
    ),
}
_SCENARIO_CONFIGS['store_short_excess'] = _SCENARIO_CONFIGS['network_imbalance']


@dataclass
class ActiveDiscount:
    discount_id: uuid.UUID
    store_id: uuid.UUID
    product_id: uuid.UUID
    discount_pct: float
    start_time: datetime
    end_time: datetime
    recommendation_id: uuid.UUID | None = None


@dataclass
class SimulationState:
    simulation_id: uuid.UUID
    scenario: str = "normal"
    policy: str = "outpost"
    active_transfers: list[Any] = field(default_factory=list)
    active_pos: list[Any] = field(default_factory=list)
    active_discounts: list[ActiveDiscount] = field(default_factory=list)
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


def get_active_discounts(sim_id: str | uuid.UUID | None = None) -> list[ActiveDiscount]:
    """Retrieve active discounts for a simulation."""
    state = get_simulation_state(sim_id)
    return state.active_discounts


def add_active_discount(
    store_id: uuid.UUID,
    product_id: uuid.UUID,
    discount_pct: float,
    start_time: datetime,
    end_time: datetime,
    recommendation_id: uuid.UUID | None = None,
    sim_id: str | uuid.UUID | None = None,
) -> ActiveDiscount:
    """Register an active discount affecting simulation price and demand lift."""
    state = get_simulation_state(sim_id)
    disc = ActiveDiscount(
        discount_id=uuid.uuid4(),
        store_id=store_id,
        product_id=product_id,
        discount_pct=discount_pct,
        start_time=start_time.replace(tzinfo=None) if start_time.tzinfo else start_time,
        end_time=end_time.replace(tzinfo=None) if end_time.tzinfo else end_time,
        recommendation_id=recommendation_id,
    )
    state.active_discounts.append(disc)
    return disc


def clear_active_discounts(sim_id: str | uuid.UUID | None = None) -> None:
    """Reset active discounts."""
    state = get_simulation_state(sim_id)
    state.active_discounts.clear()


def clear_simulation_states() -> None:
    """Clear all simulation states (used during reset / simulated process restart)."""
    _simulation_states.clear()
    _default_state.active_transfers.clear()
    _default_state.active_pos.clear()
    _default_state.active_discounts.clear()
    _default_state.scenario = "normal"
    _default_state.policy = "outpost"
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
        saved_policy = sim.configuration.get("policy", "outpost")
        state.scenario = saved_scenario
        state.policy = saved_policy
        if engine is not None:
            engine.active_scenario = saved_scenario
            engine.active_scenario_config = get_scenario_config(saved_scenario)
            engine.policy = saved_policy

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

    now = engine.clock.now if (engine and getattr(engine, 'clock', None)) else datetime.now(timezone.utc).replace(tzinfo=None)
    now_naive = now if now.tzinfo is None else now.replace(tzinfo=None)

    if scenario_name in ('network_imbalance', 'store_short_excess'):
        # Drain one store to <= 3 units and inflate another to >= 80 units
        all_stores = (await db.execute(select(Store))).scalars().all()
        bandra = next((s for s in all_stores if 'Bandra' in s.name), all_stores[0] if all_stores else None)
        andheri = next((s for s in all_stores if 'Andheri' in s.name), all_stores[1] if len(all_stores) > 1 else None)

        all_prods = (await db.execute(select(Product))).scalars().all()
        target_prod = next(
            (p for p in all_prods if getattr(p.category, "value", str(p.category)) in ('dairy', 'bakery')),
            all_prods[0] if all_prods else None
        )

        if bandra and andheri and target_prod:
            # Drain non-excess stores down to tight stock (3 units) and inflate excess store to 85 units
            other_stores = [s for s in all_stores if s.store_id != bandra.store_id]
            for st in other_stores:
                st_batches = (await db.execute(
                    select(Batch).where(
                        Batch.store_id == st.store_id,
                        Batch.product_id == target_prod.product_id,
                        Batch.quantity > 0,
                    )
                )).scalars().all()
                for idx, b in enumerate(st_batches):
                    b.quantity = 3 if idx == 0 else 0
                st_inv = (await db.execute(
                    select(Inventory).where(Inventory.store_id == st.store_id, Inventory.product_id == target_prod.product_id)
                )).scalar_one_or_none()
                if st_inv:
                    st_inv.quantity = 3

            # Inflate excess store active batches up to 85 units
            bandra_batches = (await db.execute(
                select(Batch).where(
                    Batch.store_id == bandra.store_id,
                    Batch.product_id == target_prod.product_id,
                    Batch.quantity > 0,
                )
            )).scalars().all()
            if bandra_batches:
                bandra_batches[0].quantity = 85
            else:
                db.add(Batch(
                    batch_id=uuid.uuid4(),
                    store_id=bandra.store_id,
                    product_id=target_prod.product_id,
                    quantity=85,
                    received_at=now_naive,
                    expires_at=now_naive + timedelta(hours=72),
                ))

            bandra_inv = (await db.execute(
                select(Inventory).where(Inventory.store_id == bandra.store_id, Inventory.product_id == target_prod.product_id)
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

