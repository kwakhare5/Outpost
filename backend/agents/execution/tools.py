"""Agent execution tools -- spec section 20.

All tools are typed async functions that accept a db session and typed arguments.
Mutation tools validate the approval state server-side before applying any change.
The agent never gets unrestricted DB access -- it uses these typed functions only.

Permission model:
  READ tools: always callable.
  MUTATION tools: require recommendation.status == APPROVED. Raise PermissionError otherwise.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone, timedelta
from typing import Any

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.core import Recommendation, Inventory, Risk, Store, Batch, Product, Action, Simulation
from backend.models.enums import RecommendationStatus, ActionType, ActionStatus
from backend.services.decision.models import SafeExcessCalculator, DEFAULT_WEIGHTS
from backend.events.audit import audit_log


def _naive_now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


async def _get_sim_now(db: AsyncSession) -> datetime:
    try:
        from backend.services.simulation.scenarios import get_active_simulation_id, get_simulation_state
        sim_id = await get_active_simulation_id(db)
        state = get_simulation_state(sim_id)
        if state and state.engine and state.engine.clock:
            return state.engine.clock.now.replace(tzinfo=None) if state.engine.clock.now.tzinfo else state.engine.clock.now
        sim = await db.get(Simulation, sim_id)
        if sim and sim.current_time:
            return sim.current_time.replace(tzinfo=None) if sim.current_time.tzinfo else sim.current_time
    except Exception:
        pass
    return _naive_now()


def _enum_val(v: Any) -> str:
    """Return .value if enum, else str."""
    return v.value if hasattr(v, "value") else str(v)


# ---------------------------------------------------------------------------
# READ TOOLS
# ---------------------------------------------------------------------------

async def get_recommendation(db: AsyncSession, recommendation_id: uuid.UUID) -> dict | None:
    """Return a dict snapshot of the Recommendation row, or None if not found."""
    rec = await db.get(Recommendation, recommendation_id)
    if rec is None:
        return None
    return {
        "recommendation_id": str(rec.recommendation_id),
        "risk_id":           str(rec.risk_id),
        "action_type":       _enum_val(rec.action_type),
        "quantity":          rec.quantity,
        "source_store_id":   str(rec.source_store_id) if rec.source_store_id else None,
        "destination_store_id": str(rec.destination_store_id) if rec.destination_store_id else None,
        "score":             rec.score,
        "confidence":        rec.confidence,
        "reason_codes":      rec.reason_codes,
        "alternatives":      rec.alternatives,
        "status":            _enum_val(rec.status),
        "created_at":        rec.created_at.isoformat() if rec.created_at else None,
    }


async def get_inventory(
    db: AsyncSession,
    store_id: uuid.UUID,
    product_id: uuid.UUID,
) -> dict:
    """Return current inventory quantity for (store, product)."""
    result = await db.execute(
        select(Inventory).where(
            Inventory.store_id == store_id,
            Inventory.product_id == product_id,
        )
    )
    inv = result.scalar_one_or_none()
    return {
        "store_id":   str(store_id),
        "product_id": str(product_id),
        "quantity":   inv.quantity if inv else 0,
    }


async def validate_transfer(
    db: AsyncSession,
    recommendation_id: uuid.UUID,
) -> dict:
    """Read-only validation: re-check whether the approved transfer is still feasible.

    Returns {"feasible": bool, "reason": str, "source_quantity": int, "transfer_quantity": int}
    """
    rec = await db.get(Recommendation, recommendation_id)
    if rec is None:
        return {"feasible": False, "reason": "recommendation_not_found", "source_quantity": 0, "transfer_quantity": 0}

    if rec.source_store_id is None:
        return {"feasible": False, "reason": "no_source_store", "source_quantity": 0, "transfer_quantity": rec.quantity}

    risk = await db.get(Risk, rec.risk_id)
    if risk is None:
        return {"feasible": False, "reason": "linked_risk_not_found", "source_quantity": 0, "transfer_quantity": rec.quantity}
    product_id = risk.product_id

    # Get current source inventory
    src_inv = await get_inventory(db, rec.source_store_id, product_id)
    src_qty = src_inv["quantity"]
    transfer_qty = rec.quantity

    # Check basic feasibility: source must have enough total units
    if src_qty < transfer_qty:
        return {
            "feasible": False,
            "reason": f"insufficient_source_inventory: have {src_qty}, need {transfer_qty}",
            "source_quantity": src_qty,
            "transfer_quantity": transfer_qty,
        }

    # Check batch expiry constraints if batches exist
    now = _naive_now()
    batch_res = await db.execute(
        select(Batch).where(
            Batch.store_id == rec.source_store_id,
            Batch.product_id == product_id,
            Batch.quantity > 0,
        )
    )
    all_batches = batch_res.scalars().all()
    if all_batches:
        active_unexpired = [b for b in all_batches if b.expires_at > now]
        active_batch_qty = sum(b.quantity for b in active_unexpired)
        if not active_unexpired or active_batch_qty == 0:
            return {
                "feasible": False,
                "reason": "expired_batch: source inventory has expired and cannot be transferred",
                "source_quantity": src_qty,
                "transfer_quantity": transfer_qty,
            }
        if active_batch_qty < transfer_qty:
            return {
                "feasible": False,
                "reason": f"insufficient_source_inventory: have {active_batch_qty} non-expired units, need {transfer_qty}",
                "source_quantity": src_qty,
                "transfer_quantity": transfer_qty,
            }

    return {
        "feasible": True,
        "reason": "ok",
        "source_quantity": src_qty,
        "transfer_quantity": transfer_qty,
    }


async def validate_reorder(
    db: AsyncSession,
    recommendation_id: uuid.UUID,
) -> dict:
    """Read-only validation: check stock on hand and in-flight orders.

    Returns not feasible when no order is needed.
    """
    rec = await db.get(Recommendation, recommendation_id)
    if rec is None:
        return {"feasible": False, "reason": "recommendation_not_found"}

    risk = await db.get(Risk, rec.risk_id)
    if risk is None:
        return {"feasible": False, "reason": "linked_risk_not_found"}

    store_id = rec.destination_store_id or risk.store_id
    product_id = risk.product_id

    product = await db.get(Product, product_id)

    from backend.models.core import Inventory, Batch, Forecast, PurchaseOrder as PurchaseOrderModel, Shipment
    from backend.models.enums import POStatus, ShipmentStatus
    from backend.services.simulation.supplier import get_active_pos
    from backend.services.simulation.scenarios import get_active_simulation_id

    active_sim_id = await get_active_simulation_id(db)

    # 1. In-flight purchase orders
    in_flight_db = (await db.execute(
        select(PurchaseOrderModel).where(
            PurchaseOrderModel.destination_store_id == store_id,
            PurchaseOrderModel.product_id == product_id,
            PurchaseOrderModel.status == POStatus.IN_TRANSIT,
        )
    )).scalars().all()
    in_flight_mem = [
        p for p in get_active_pos(active_sim_id)
        if p.store_id == store_id and p.product_id == product_id and p.status in ('in_transit', 'delayed')
    ]
    if in_flight_db or in_flight_mem:
        return {
            "feasible": False,
            "reason": "order_already_in_flight",
            "reorder_quantity": 0,
        }

    # 2. Check stock on hand (unexpired)
    sim_now = await _get_sim_now(db)

    batch_res = await db.execute(
        select(func.coalesce(func.sum(Batch.quantity), 0)).where(
            Batch.store_id == store_id,
            Batch.product_id == product_id,
            Batch.quantity > 0,
            Batch.expires_at > sim_now,
        )
    )
    unexpired_batch_qty = batch_res.scalar() or 0
    total_batches = (await db.execute(
        select(func.count(Batch.batch_id)).where(
            Batch.store_id == store_id,
            Batch.product_id == product_id,
        )
    )).scalar() or 0

    if total_batches > 0:
        on_hand_unexpired = unexpired_batch_qty
    else:
        inv = (await db.execute(
            select(Inventory).where(Inventory.store_id == store_id, Inventory.product_id == product_id)
        )).scalar_one_or_none()
        on_hand_unexpired = inv.quantity if inv else 0

    # In-transit shipments
    shipment_res = await db.execute(
        select(func.coalesce(func.sum(Shipment.quantity), 0)).where(
            Shipment.destination_store_id == store_id,
            Shipment.product_id == product_id,
            Shipment.status.in_([ShipmentStatus.DISPATCHED, ShipmentStatus.IN_TRANSIT]),
        )
    )
    shipment_sum = shipment_res.scalar() or 0

    # 3. Check demand / target
    fc_res = await db.execute(
        select(Forecast)
        .where(Forecast.store_id == store_id, Forecast.product_id == product_id)
        .order_by(Forecast.created_at.desc())
        .limit(1)
    )
    dest_fc = fc_res.scalar_one_or_none()
    if not dest_fc:
        return {
            "feasible": False,
            "reason": "missing_demand_forecast",
            "reorder_quantity": 0,
        }

    dest_demand_24h = dest_fc.predicted_demand
    dest_demand_48h = dest_demand_24h * 2.0
    hourly_demand = dest_demand_24h / 24.0
    shelf_life_hours = product.shelf_life_hours if product and product.shelf_life_hours else 72
    max_shelf_life_demand = hourly_demand * shelf_life_hours
    target_stock = min(dest_demand_48h, max_shelf_life_demand)

    reorder_qty = max(0, int(round(target_stock - on_hand_unexpired - shipment_sum)))
    if reorder_qty <= 0:
        return {
            "feasible": False,
            "reason": "no_order_needed",
            "reorder_quantity": 0,
            "on_hand": on_hand_unexpired,
            "target": target_stock,
        }

    return {
        "feasible": True,
        "reason": "ok",
        "reorder_quantity": min(rec.quantity, reorder_qty) if rec.quantity > 0 else reorder_qty,
    }


# ---------------------------------------------------------------------------
# MUTATION TOOLS
# All mutation tools check approval status before proceeding (spec section 18).
# ---------------------------------------------------------------------------

def _assert_approved(rec: Recommendation) -> None:
    """Raise PermissionError if the recommendation is not in APPROVED status."""
    status_str = _enum_val(rec.status).lower()
    if status_str == "executed":
        raise PermissionError(
            f"Cannot execute recommendation {rec.recommendation_id}: already executed (idempotency guard)."
        )
    if status_str != "approved":
        raise PermissionError(
            f"Cannot execute recommendation {rec.recommendation_id}: "
            f"status is '{status_str}', expected 'approved'. "
            "Human approval is required before agent execution (spec section 18 LOCKED)."
        )


async def create_transfer(
    db: AsyncSession,
    recommendation_id: uuid.UUID,
) -> dict:
    """MUTATION: Apply a stock transfer from source to destination store.

    Validates approval, checks current source quantity and batch expiry, adjusts
    Batch and Inventory rows via FIFO deduction, emits TRANSFER_EXECUTED event.
    """
    rec = await db.get(Recommendation, recommendation_id)
    if rec is None:
        return {"success": False, "error": "recommendation_not_found"}

    if _enum_val(rec.status).lower() == "executed":
        return {"success": False, "error": "already executed"}

    _assert_approved(rec)

    if rec.source_store_id is None:
        return {"success": False, "error": "no_source_store_id in recommendation"}

    # Load risk to get product_id
    risk = await db.get(Risk, rec.risk_id)
    if risk is None:
        return {"success": False, "error": "linked_risk_not_found"}
    product_id = risk.product_id

    transfer_qty = rec.quantity
    now = await _get_sim_now(db)

    # Transition linked Action to EXECUTING if present
    act_res = await db.execute(
        select(Action).where(Action.recommendation_id == recommendation_id)
    )
    action = act_res.scalars().first()
    if action:
        action.status = ActionStatus.EXECUTING
        await db.flush()

    # Route transfer through dispatch_transfer service (Spec Section 4.B)
    from backend.services.simulation.scenarios import get_active_simulation_id
    from backend.services.simulation.transfer import dispatch_transfer
    active_sim_id = await get_active_simulation_id(db)

    try:
        transfer = await dispatch_transfer(
            db=db,
            source_store_id=rec.source_store_id,
            destination_store_id=rec.destination_store_id,
            product_id=product_id,
            quantity=transfer_qty,
            current_time=now,
            sim_id=active_sim_id,
        )
    except ValueError as exc:
        err_msg = str(exc)
        return {
            "success": False,
            "error": err_msg,
            "stale": "insufficient" in err_msg.lower() or "expired" in err_msg.lower(),
        }

    # Emit event
    await audit_log.publish(
        db,
        "TRANSFER_EXECUTED",
        "recommendation",
        recommendation_id,
        {
            "recommendation_id": str(recommendation_id),
            "transfer_id":       str(transfer.transfer_id),
            "source_store_id":   str(rec.source_store_id),
            "destination_store_id": str(rec.destination_store_id),
            "product_id":        str(product_id),
            "quantity":          transfer_qty,
            "arrival_eta":       transfer.arrival_eta.isoformat(),
        },
        persist=True,
    )

    return {
        "success": True,
        "transferred_quantity": transfer_qty,
        "transfer_id": str(transfer.transfer_id),
        "source_store_id": str(rec.source_store_id),
        "destination_store_id": str(rec.destination_store_id),
        "product_id": str(product_id),
        "arrival_eta": transfer.arrival_eta.isoformat(),
        "status": transfer.status,
    }


async def create_reorder(
    db: AsyncSession,
    recommendation_id: uuid.UUID,
) -> dict:
    """MUTATION: Place a reorder (simulated: increase destination inventory and create delivery batch)."""
    rec = await db.get(Recommendation, recommendation_id)
    if rec is None:
        return {"success": False, "error": "recommendation_not_found"}

    if _enum_val(rec.status).lower() == "executed":
        return {"success": False, "error": "already executed"}

    _assert_approved(rec)

    risk = await db.get(Risk, rec.risk_id)
    if risk is None:
        return {"success": False, "error": "linked_risk_not_found"}
    product_id = risk.product_id
    store_id = rec.destination_store_id or risk.store_id

    # Part B: skip a reorder if a purchase order for the same store and product is already in flight
    from backend.models.core import PurchaseOrder as PurchaseOrderModel
    from backend.models.enums import POStatus
    from backend.services.simulation.supplier import get_active_pos
    from backend.services.simulation.scenarios import get_active_simulation_id

    active_sim_id = await get_active_simulation_id(db)
    inflight_po_res = await db.execute(
        select(PurchaseOrderModel).where(
            PurchaseOrderModel.destination_store_id == store_id,
            PurchaseOrderModel.product_id == product_id,
            PurchaseOrderModel.status == POStatus.IN_TRANSIT,
        )
    )
    in_flight_db = inflight_po_res.scalars().all()
    in_flight_mem = [
        p for p in get_active_pos(active_sim_id)
        if p.store_id == store_id and p.product_id == product_id and p.status in ('in_transit', 'delayed')
    ]
    if in_flight_db or in_flight_mem:
        return {
            "success": False,
            "skipped": True,
            "error": "purchase_order_already_in_flight",
            "reason": "purchase_order_already_in_flight",
        }

    reorder_qty = rec.quantity
    now = await _get_sim_now(db)

    # Transition linked Action to EXECUTING if present
    act_res = await db.execute(
        select(Action).where(Action.recommendation_id == recommendation_id)
    )
    action = act_res.scalars().first()
    if action:
        action.status = ActionStatus.EXECUTING
        await db.flush()

    # Route reorder through create_purchase_order (Regional Fulfilment Centre PO)
    from backend.services.simulation.supplier import create_purchase_order

    product = await db.get(Product, product_id)
    if not product:
        return {"success": False, "error": "product_not_found"}

    try:
        po = await create_purchase_order(
            db=db,
            supplier_id=product.supplier_id,
            store_id=store_id,
            product_id=product_id,
            quantity=reorder_qty,
            current_time=now,
            sim_id=active_sim_id,
        )
    except ValueError as exc:
        return {"success": False, "error": str(exc)}

    # Inventory is NOT increased now; it increases upon arrival after lead time (Spec Section 4.B)
    await audit_log.publish(
        db,
        "REORDER_EXECUTED",
        "recommendation",
        recommendation_id,
        {
            "recommendation_id": str(recommendation_id),
            "po_id":      str(po.po_id),
            "store_id":   str(store_id),
            "supplier_id": str(product.supplier_id),
            "product_id": str(product_id),
            "quantity":   reorder_qty,
            "expected_arrival": po.expected_arrival.isoformat(),
        },
        persist=True,
    )

    return {
        "success": True,
        "reordered_quantity": reorder_qty,
        "po_id": str(po.po_id),
        "store_id": str(store_id),
        "product_id": str(product_id),
        "supplier_id": str(product.supplier_id),
        "expected_arrival": po.expected_arrival.isoformat(),
        "status": po.status,
    }


async def apply_discount(
    db: AsyncSession,
    recommendation_id: uuid.UUID,
) -> dict:
    """MUTATION: Apply discount (simulated: emits DISCOUNT_APPLIED event, no price mutation).

    In a real system this would push price override to the POS / app.
    In the simulator we record the intent via the audit log.
    """
    rec = await db.get(Recommendation, recommendation_id)
    if rec is None:
        return {"success": False, "error": "recommendation_not_found"}

    if _enum_val(rec.status).lower() == "executed":
        return {"success": False, "error": "already executed"}

    _assert_approved(rec)

    risk = await db.get(Risk, rec.risk_id)
    if risk is None:
        return {"success": False, "error": "linked_risk_not_found"}

    # Transition linked Action to EXECUTING if present
    act_res = await db.execute(
        select(Action).where(Action.recommendation_id == recommendation_id)
    )
    action = act_res.scalars().first()
    if action:
        action.status = ActionStatus.EXECUTING
        await db.flush()

    discount_pct = 0.20

    await audit_log.publish(
        db,
        "DISCOUNT_APPLIED",
        "recommendation",
        recommendation_id,
        {
            "recommendation_id": str(recommendation_id),
            "store_id":    str(risk.store_id),
            "product_id":  str(risk.product_id),
            "discount_pct": discount_pct,
            "at_risk_quantity": rec.quantity,
        },
        persist=True,
    )

    return {"success": True, "discount_pct": discount_pct, "at_risk_quantity": rec.quantity}


async def recalculate_options(
    db: AsyncSession,
    risk_id: uuid.UUID,
) -> dict:
    """Trigger Decision Engine re-evaluation for a risk.

    Returns {"new_recommendation_id": str | None, "action_type": str | None}.
    """
    from backend.services.decision.engine import DecisionOrchestrator
    orchestrator = DecisionOrchestrator()
    new_rec = await orchestrator.run(db, risk_id)
    if new_rec is None:
        return {"new_recommendation_id": None, "action_type": None}
    return {
        "new_recommendation_id": str(new_rec.recommendation_id),
        "action_type": _enum_val(new_rec.action_type),
    }


async def log_agent_event(
    db: AsyncSession,
    event_type: str,
    entity_id: uuid.UUID,
    payload: dict,
) -> dict:
    """Write an audit event to the audit log."""
    await audit_log.publish(db, event_type, "agent", entity_id, payload, persist=True)
    return {"event_type": event_type, "entity_id": str(entity_id)}
