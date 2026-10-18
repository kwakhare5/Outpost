"""Outpost Decision Engine -- DB orchestration layer.

Loads risk + inventory + forecast state from DB, calls PureDecisionEvaluator,
persists a Recommendation row, and emits DECISION_MADE event via audit log.
"""
from __future__ import annotations

import uuid
import math
import logging
from datetime import datetime, timezone

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

from backend.models.core import (
    Risk, Inventory, Forecast, Recommendation, Store, Product, Supplier,
    Batch, PurchaseOrder as PurchaseOrderModel, Shipment, Simulation,
)
from backend.models.enums import RecommendationStatus, ActionType, SimulationStatus
from backend.events.audit import audit_log
from backend.services.decision.models import (
    DEFAULT_WEIGHTS,
    ScoringWeights,
    TransferInput,
    ReorderInput,
    DiscountInput,
    HoldInput,
    PureDecisionEvaluator,
    DecisionResult,
)


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


class DecisionOrchestrator:
    """Drives the Decision Engine pipeline end-to-end for a single risk.

    Usage:
        orchestrator = DecisionOrchestrator()
        rec = await orchestrator.run(db, risk_id)
    """

    def __init__(self, weights: ScoringWeights = DEFAULT_WEIGHTS) -> None:
        self._weights   = weights
        self._evaluator = PureDecisionEvaluator(weights)

    async def run(self, db: AsyncSession, risk_id: uuid.UUID) -> Recommendation | None:
        """Evaluate decision for a risk and persist the top recommendation.

        Returns the persisted Recommendation ORM row, or None if the risk
        is not found.
        """
        # 1. Load the risk
        risk: Risk | None = await db.get(Risk, risk_id)
        if risk is None:
            return None

        sim_now = await _get_sim_now(db)
        store_id   = risk.store_id
        product_id = risk.product_id

        # 2. Load product + supplier
        prod_result = await db.execute(
            select(Product, Supplier).join(Supplier, Product.supplier_id == Supplier.supplier_id)
            .where(Product.product_id == product_id)
        )
        row = prod_result.one_or_none()
        if row is None:
            return None
        product: Product    = row.Product
        supplier: Supplier  = row.Supplier

        # 3. Load destination inventory
        dest_inv_result = await db.execute(
            select(Inventory).where(
                Inventory.store_id == store_id,
                Inventory.product_id == product_id,
            )
        )
        dest_inv = dest_inv_result.scalar_one_or_none()
        dest_qty = dest_inv.quantity if dest_inv else 0

        # 4. Load latest forecast for destination
        fc_result = await db.execute(
            select(Forecast)
            .where(Forecast.store_id == store_id, Forecast.product_id == product_id)
            .order_by(Forecast.created_at.desc())
            .limit(1)
        )
        dest_fc = fc_result.scalar_one_or_none()
        if not dest_fc:
            logger.warning(
                "Missing forecast for destination store %s product %s; cannot evaluate decisions without demand forecast",
                store_id, product_id,
            )
            return None
        dest_demand_24h = dest_fc.predicted_demand
        dest_demand_48h = dest_demand_24h * 2.0

        # 5. Build stockout hours for hold context
        hourly_demand = dest_demand_24h / 24.0
        hours_to_stockout = dest_qty / max(hourly_demand, 1e-9)

        # 6. Identify candidate source stores (all other stores with this product)
        all_inv_result = await db.execute(
            select(Inventory, Store)
            .join(Store, Inventory.store_id == Store.store_id)
            .where(
                Inventory.product_id == product_id,
                Inventory.store_id != store_id,
            )
        )
        source_candidates = all_inv_result.all()

        # 7. Load forecasts for source stores
        transfers: list[TransferInput] = []
        for src_row in source_candidates:
            src_inv: Inventory = src_row.Inventory
            src_store: Store   = src_row.Store

            src_fc_result = await db.execute(
                select(Forecast)
                .where(
                    Forecast.store_id == src_inv.store_id,
                    Forecast.product_id == product_id,
                )
                .order_by(Forecast.created_at.desc())
                .limit(1)
            )
            src_fc = src_fc_result.scalar_one_or_none()
            if not src_fc:
                logger.warning(
                    "Missing forecast for source store %s product %s; skipping candidate transfer",
                    src_inv.store_id, product_id,
                )
                continue
            src_demand_24h = src_fc.predicted_demand

            # Compute approx distance (Euclidean; real would use Haversine)
            dest_store_result = await db.execute(select(Store).where(Store.store_id == store_id))
            dest_store = dest_store_result.scalar_one_or_none()
            distance_km = 5.0  # default fallback
            if dest_store:
                dlat = src_store.latitude  - dest_store.latitude
                dlon = src_store.longitude - dest_store.longitude
                distance_km = math.sqrt(dlat**2 + dlon**2) * 111.0  # rough km conversion

            # Proposed transfer quantity = safe excess capped at destination gap
            from backend.services.decision.models import SafeExcessCalculator
            excess_calc = SafeExcessCalculator(self._weights)
            src_excess = excess_calc.compute(src_inv.quantity, src_demand_24h)
            demand_gap = max(0, int(dest_demand_24h) - dest_qty)
            proposed_qty = min(src_excess, demand_gap) if demand_gap > 0 else 0

            if proposed_qty <= 0:
                continue

            transfers.append(TransferInput(
                source_store_id=src_inv.store_id,
                destination_store_id=store_id,
                product_id=product_id,
                source_quantity=src_inv.quantity,
                source_forecast_demand_24h=src_demand_24h,
                source_safety_stock=0,
                destination_quantity=dest_qty,
                destination_forecast_demand_24h=dest_demand_24h,
                destination_forecast_demand_48h=dest_demand_48h,
                destination_lead_time_hours=supplier.lead_time_hours,
                destination_stockout_probability=risk.probability,
                distance_km=distance_km,
                transfer_quantity=proposed_qty,
            ))

        # 8. Reorder candidate
        # Part C: size the order as max(0, target_stock - on_hand_unexpired - in_transit)
        # Target must be capped by demand that can be sold before shelf life ends using real shelf life
        shelf_life_hours = product.shelf_life_hours if product and product.shelf_life_hours else 72
        max_shelf_life_demand = hourly_demand * shelf_life_hours
        target_stock = min(dest_demand_48h, max_shelf_life_demand)

        # On-hand unexpired stock
        active_batch_res = await db.execute(
            select(func.coalesce(func.sum(Batch.quantity), 0)).where(
                Batch.store_id == store_id,
                Batch.product_id == product_id,
                Batch.quantity > 0,
                Batch.expires_at > sim_now,
            )
        )
        batch_unexpired = active_batch_res.scalar() or 0
        has_batches_res = await db.execute(
            select(func.count(Batch.batch_id)).where(
                Batch.store_id == store_id,
                Batch.product_id == product_id,
            )
        )
        total_batches_count = has_batches_res.scalar() or 0
        on_hand_unexpired = batch_unexpired if total_batches_count > 0 else dest_qty

        # In-transit purchase orders and shipments
        from backend.models.enums import POStatus, ShipmentStatus
        from backend.services.simulation.supplier import get_active_pos
        from backend.services.simulation.scenarios import get_active_simulation_id

        active_sim_id = await get_active_simulation_id(db)
        po_in_transit_res = await db.execute(
            select(func.coalesce(func.sum(PurchaseOrderModel.quantity), 0)).where(
                PurchaseOrderModel.destination_store_id == store_id,
                PurchaseOrderModel.product_id == product_id,
                PurchaseOrderModel.status == POStatus.IN_TRANSIT,
            )
        )
        po_in_transit_db = po_in_transit_res.scalar() or 0
        po_in_transit_mem = sum(
            po.quantity for po in get_active_pos(active_sim_id)
            if po.store_id == store_id and po.product_id == product_id and po.status in ('in_transit', 'delayed')
        )
        po_in_transit = max(po_in_transit_db, po_in_transit_mem)

        shipment_in_transit_res = await db.execute(
            select(func.coalesce(func.sum(Shipment.quantity), 0)).where(
                Shipment.destination_store_id == store_id,
                Shipment.product_id == product_id,
                Shipment.status.in_([ShipmentStatus.DISPATCHED, ShipmentStatus.IN_TRANSIT]),
            )
        )
        shipment_in_transit = shipment_in_transit_res.scalar() or 0
        in_transit = po_in_transit + shipment_in_transit

        reorder_qty = max(0, int(round(target_stock - on_hand_unexpired - in_transit)))
        reorders = []
        if reorder_qty > 0 and po_in_transit == 0:
            reorders = [ReorderInput(
                store_id=store_id,
                product_id=product_id,
                supplier_lead_time_hours=supplier.lead_time_hours,
                hours_to_stockout=hours_to_stockout,
                current_quantity=dest_qty,
                forecast_demand_24h=dest_demand_24h,
                reorder_quantity=reorder_qty,
                stockout_probability=risk.probability,
            )]

        # 9. Discount candidate (only for spoilage risk)
        discounts: list[DiscountInput] = []
        from backend.models.enums import RiskType
        if risk.risk_type == RiskType.SPOILAGE:
            hours_remaining = max(
                0.0,
                (risk.expected_time - sim_now).total_seconds() / 3600.0
            )
            from backend.services.risk.models import discount_tier_for_hours, DiscountTier
            tier = discount_tier_for_hours(hours_remaining)
            discount_pct_map = {
                DiscountTier.NONE: 0.0,
                DiscountTier.TEN_PCT: 0.10,
                DiscountTier.TWENTY_PCT: 0.20,
                DiscountTier.THIRTY_PCT: 0.30,
            }
            discount_pct = discount_pct_map.get(tier, 0.0)
            if discount_pct > 0:
                discounts.append(DiscountInput(
                    store_id=store_id,
                    product_id=product_id,
                    at_risk_quantity=dest_qty,
                    hours_to_expiry=hours_remaining,
                    forecast_demand_before_expiry=hourly_demand * hours_remaining,
                    spoilage_probability=risk.probability,
                    discount_pct=discount_pct,
                ))

        # 10. Hold baseline
        hold = HoldInput(
            store_id=store_id,
            product_id=product_id,
            stockout_probability=risk.probability,
            spoilage_probability=risk.probability if risk.risk_type == RiskType.SPOILAGE else 0.0,
            hours_to_stockout=hours_to_stockout,
            hours_to_expiry=48.0,
        )

        # 11. Evaluate
        result: DecisionResult = self._evaluator.evaluate(
            transfers=transfers,
            reorders=reorders,
            discounts=discounts,
            hold=hold,
        )

        # 12. Persist top recommendation
        rec = result.recommended
        action_type_map = {
            "transfer": ActionType.TRANSFER,
            "reorder":  ActionType.REORDER,
            "discount": ActionType.DISCOUNT,
            "hold":     ActionType.HOLD,
        }
        now = _naive_now()
        alternatives_payload = [
            {
                "action_type": a.action_type,
                "label": f"{a.action_type.upper()} {a.quantity} units" if a.quantity > 0 else a.action_type.upper(),
                "score": int(round(a.score * 100)) if a.score <= 1.0 else int(a.score),
                "raw_score": a.score,
                "quantity": a.quantity,
                "reason": result.explainability.why_not_alternatives.get(a.action_type, ", ".join(c.value for c in a.reason_codes)) if result.explainability else ", ".join(c.value for c in a.reason_codes),
                "reason_codes": [c.value if hasattr(c, "value") else str(c) for c in a.reason_codes],
                "metadata": a.metadata,
                "isRecommended": False,
            }
            for a in result.alternatives
        ]

        rec_row = Recommendation(
            recommendation_id=uuid.uuid4(),
            risk_id=risk_id,
            action_type=action_type_map[rec.action_type],
            quantity=rec.quantity,
            source_store_id=rec.source_store_id,
            destination_store_id=rec.destination_store_id,
            score=rec.score,
            confidence=result.confidence,
            reason_codes=[c.value for c in rec.reason_codes],
            alternatives=alternatives_payload,
            status=RecommendationStatus.PENDING,
            created_at=now,
        )
        db.add(rec_row)
        await db.flush()

        await audit_log.publish(
            db,
            "DECISION_MADE",
            "recommendation",
            rec_row.recommendation_id,
            {
                "recommendation_id": str(rec_row.recommendation_id),
                "risk_id":           str(risk_id),
                "action_type":       rec.action_type,
                "score":             rec.score,
                "confidence":        result.confidence,
                "reason_codes":      [c.value for c in rec.reason_codes],
                "what_happened":     result.explainability.what_happened if result.explainability else "",
                "why_this_action":   result.explainability.why_this_action if result.explainability else "",
            },
            persist=True,
        )
        return rec_row

    async def evaluate_all(self, db: AsyncSession) -> int:
        """Scan all active risks without pending recommendations and generate decisions.

        Returns total number of new recommendations generated.
        """
        from backend.models.enums import RiskStatus
        risk_result = await db.execute(
            select(Risk).where(Risk.status == RiskStatus.ACTIVE)
        )
        active_risks = risk_result.scalars().all()

        rec_result = await db.execute(
            select(Recommendation).where(Recommendation.status == RecommendationStatus.PENDING)
        )
        pending_risk_ids = {r.risk_id for r in rec_result.scalars().all()}

        from backend.models.core import PurchaseOrder as PurchaseOrderModel
        from backend.models.enums import POStatus
        from backend.services.simulation.supplier import get_active_pos
        from backend.services.simulation.scenarios import get_active_simulation_id

        active_sim_id = await get_active_simulation_id(db)
        inflight_po_res = await db.execute(
            select(PurchaseOrderModel).where(
                PurchaseOrderModel.status == POStatus.IN_TRANSIT
            )
        )
        inflight_pos = {(po.destination_store_id, po.product_id) for po in inflight_po_res.scalars().all()}
        for po in get_active_pos(active_sim_id):
            inflight_pos.add((po.store_id, po.product_id))

        count = 0
        for risk in active_risks:
            if risk.risk_id in pending_risk_ids:
                continue
            rec = await self.run(db, risk.risk_id)
            if rec:
                dest_store = rec.destination_store_id or risk.store_id
                if rec.action_type == ActionType.REORDER and (dest_store, risk.product_id) in inflight_pos:
                    await db.delete(rec)
                    await db.flush()
                    continue
                count += 1

        return count

    async def approve(
        self,
        db: AsyncSession,
        recommendation_id: uuid.UUID,
        approver: str = "operator",
    ) -> Recommendation | None:
        """Set recommendation status to APPROVED and stage a pending Action (spec Section 18, Section 21 Level-2 autonomy)."""
        rec: Recommendation | None = await db.get(Recommendation, recommendation_id)
        if rec is None:
            return None
        rec.status = RecommendationStatus.APPROVED

        now = _naive_now()
        from backend.models.core import Action
        from backend.models.enums import ActionStatus
        action = Action(
            action_id=uuid.uuid4(),
            recommendation_id=rec.recommendation_id,
            action_type=rec.action_type,
            approved_by=approver,
            approved_at=now,
            status=ActionStatus.PENDING,
        )
        db.add(action)
        await db.flush()

        await audit_log.publish(
            db,
            "RECOMMENDATION_APPROVED",
            "recommendation",
            recommendation_id,
            {
                "recommendation_id": str(recommendation_id),
                "action_id": str(action.action_id),
                "action_type": rec.action_type.value if hasattr(rec.action_type, "value") else str(rec.action_type),
                "status": "approved",
                "approved_by": approver,
            },
            persist=True,
        )
        return rec

    async def reject(
        self,
        db: AsyncSession,
        recommendation_id: uuid.UUID,
        reason: str = "rejected by operator",
    ) -> Recommendation | None:
        """Set recommendation status to REJECTED."""
        rec: Recommendation | None = await db.get(Recommendation, recommendation_id)
        if rec is None:
            return None
        rec.status = RecommendationStatus.REJECTED
        await db.flush()
        await audit_log.publish(
            db,
            "RECOMMENDATION_REJECTED",
            "recommendation",
            recommendation_id,
            {
                "recommendation_id": str(recommendation_id),
                "status": "rejected",
                "reason": reason,
            },
            persist=True,
        )
        return rec

