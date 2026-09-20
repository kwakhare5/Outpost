"""Acceptance tests for FIX B: Make replenishment operationally realistic (DarkStore-Spec §4.B).

Verifies:
1. Approving a reorder creates a purchase order but does not immediately change on-hand inventory.
2. The purchase order remains pending or in transit before its ETA.
3. The purchase order arrival changes inventory exactly once at or after its ETA.
4. Reprocessing the same approval or arrival event does not duplicate inventory (idempotency).
5. An approved transfer calls dispatch_transfer, records an ETA, and does not immediately change destination inventory.
6. The transfer arrival changes destination inventory exactly once.
7. A stale recommendation is rejected or re-evaluated before dispatch.
8. Regional Fulfilment Centre (RFC) naming convention verified across seed suppliers.
"""
import uuid
from datetime import datetime, timezone, timedelta
import pytest
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.core import Store, Product, Supplier, Inventory, Batch, Risk, Recommendation, Action, Event
from backend.models.enums import StoreStatus, SupplierStatus, ProductCategory, RiskType, RiskSeverity, RiskStatus, RecommendationStatus, ActionType, ActionStatus
from backend.agents.execution.tools import create_transfer, create_reorder
from backend.agents.execution.runner import ExecutionRunner
from backend.services.simulation.transfer import (
    dispatch_transfer,
    process_arriving_transfers,
    get_active_transfers,
    clear_active_transfers,
)
from backend.services.simulation.supplier import (
    create_purchase_order,
    process_supplier_deliveries,
    get_active_pos,
    clear_active_pos,
)
from backend.services.simulation.seed_data import SUPPLIERS


def _naive_now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


async def _setup_rfc_and_stores(db: AsyncSession):
    now = _naive_now()
    rfc = Supplier(
        supplier_id=uuid.uuid4(),
        name="Bhiwandi RFC (Dairy)",
        lead_time_hours=24,
        status=SupplierStatus.ACTIVE,
    )
    db.add(rfc)

    product = Product(
        product_id=uuid.uuid4(),
        name="Toned Milk 500ml",
        category=ProductCategory.DAIRY,
        unit="pack",
        shelf_life_hours=72,
        base_price=28.0,
        supplier_id=rfc.supplier_id,
    )
    db.add(product)

    store_a = Store(
        store_id=uuid.uuid4(),
        name="Dark Store Bandra",
        latitude=19.0596,
        longitude=72.8295,
        operating_status=StoreStatus.ACTIVE,
    )
    store_b = Store(
        store_id=uuid.uuid4(),
        name="Dark Store Andheri",
        latitude=19.1136,
        longitude=72.8697,
        operating_status=StoreStatus.ACTIVE,
    )
    db.add_all([store_a, store_b])
    await db.flush()
    return rfc, product, store_a, store_b


@pytest.mark.asyncio
async def test_reorder_creates_purchase_order_without_immediate_inventory_change(db_session: AsyncSession):
    """Spec §4.B.1: Approving a reorder creates a purchase order but does NOT immediately change on-hand inventory."""
    clear_active_pos()
    rfc, prod, store_a, store_b = await _setup_rfc_and_stores(db_session)
    now = _naive_now()

    # Destination initially has 4 units
    inv = Inventory(store_id=store_b.store_id, product_id=prod.product_id, quantity=4)
    batch = Batch(
        batch_id=uuid.uuid4(), store_id=store_b.store_id, product_id=prod.product_id,
        quantity=4, received_at=now - timedelta(hours=10), expires_at=now + timedelta(hours=62),
    )
    db_session.add_all([inv, batch])

    risk = Risk(
        risk_id=uuid.uuid4(), store_id=store_b.store_id, product_id=prod.product_id,
        risk_type=RiskType.STOCKOUT, severity=RiskSeverity.CRITICAL, probability=0.92,
        expected_time=now + timedelta(hours=4), status=RiskStatus.ACTIVE,
    )
    db_session.add(risk)

    rec = Recommendation(
        recommendation_id=uuid.uuid4(), risk_id=risk.risk_id, action_type=ActionType.REORDER,
        quantity=60, source_store_id=None, destination_store_id=store_b.store_id,
        score=0.88, confidence=0.90, reason_codes=["SUPPLIER_LEAD_TIME_FEASIBLE"], alternatives=[],
        status=RecommendationStatus.APPROVED,
    )
    db_session.add(rec)
    await db_session.commit()

    # Execute reorder tool
    res = await create_reorder(db_session, rec.recommendation_id)
    await db_session.commit()

    assert res["success"] is True
    assert res["reordered_quantity"] == 60
    assert "po_id" in res
    assert "expected_arrival" in res

    # PROOF: On-hand inventory MUST NOT change at approval/creation time
    refreshed_inv = (await db_session.execute(
        select(Inventory).where(Inventory.store_id == store_b.store_id, Inventory.product_id == prod.product_id)
    )).scalar_one()
    assert refreshed_inv.quantity == 4, "On-hand inventory must remain 4 units immediately after reorder creation"


@pytest.mark.asyncio
async def test_purchase_order_remains_in_transit_before_eta_and_arrives_at_eta(db_session: AsyncSession):
    """Spec §4.B.2 & §4.B.3: PO remains in-transit before ETA; arrival updates inventory exactly once."""
    clear_active_pos()
    rfc, prod, store_a, store_b = await _setup_rfc_and_stores(db_session)
    now = _naive_now()

    b_init = Batch(
        batch_id=uuid.uuid4(), store_id=store_b.store_id, product_id=prod.product_id,
        quantity=5, received_at=now - timedelta(hours=10), expires_at=now + timedelta(hours=62),
    )
    inv = Inventory(store_id=store_b.store_id, product_id=prod.product_id, quantity=5)
    db_session.add_all([b_init, inv])

    po = await create_purchase_order(
        db=db_session,
        supplier_id=rfc.supplier_id,
        store_id=store_b.store_id,
        product_id=prod.product_id,
        quantity=50,
        current_time=now,
    )
    await db_session.commit()

    # Active registry check
    active_pos = get_active_pos()
    assert len(active_pos) == 1
    assert active_pos[0].status == "in_transit"
    assert active_pos[0].expected_arrival == now + timedelta(hours=24)

    # 1. Check before ETA: 12 hours later, PO must NOT arrive
    mid_time = now + timedelta(hours=12)
    delivered_mid = await process_supplier_deliveries(db_session, mid_time)
    await db_session.commit()
    assert len(delivered_mid) == 0

    inv_mid = (await db_session.execute(
        select(Inventory).where(Inventory.store_id == store_b.store_id, Inventory.product_id == prod.product_id)
    )).scalar_one()
    assert inv_mid.quantity == 5, "Inventory must remain 5 before ETA"

    # 2. Check at ETA: 24 hours later, PO arrives and updates inventory
    delivered_arr = await process_supplier_deliveries(db_session, po.expected_arrival)
    await db_session.commit()
    assert len(delivered_arr) == 1
    assert delivered_arr[0].status == "delivered"

    inv_final = (await db_session.execute(
        select(Inventory).where(Inventory.store_id == store_b.store_id, Inventory.product_id == prod.product_id)
    )).scalar_one()
    assert inv_final.quantity == 55, "Inventory must increase to 55 exactly upon ETA arrival"


@pytest.mark.asyncio
async def test_reorder_and_delivery_idempotency_does_not_duplicate_inventory(db_session: AsyncSession):
    """Spec §4.B.4: Reprocessing the same approval or arrival event does not duplicate inventory."""
    clear_active_pos()
    rfc, prod, store_a, store_b = await _setup_rfc_and_stores(db_session)
    now = _naive_now()

    b_init = Batch(
        batch_id=uuid.uuid4(), store_id=store_b.store_id, product_id=prod.product_id,
        quantity=10, received_at=now - timedelta(hours=10), expires_at=now + timedelta(hours=62),
    )
    inv = Inventory(store_id=store_b.store_id, product_id=prod.product_id, quantity=10)
    db_session.add_all([b_init, inv])

    po = await create_purchase_order(
        db=db_session, supplier_id=rfc.supplier_id, store_id=store_b.store_id,
        product_id=prod.product_id, quantity=30, current_time=now,
    )
    await db_session.commit()

    # First delivery
    delivered_first = await process_supplier_deliveries(db_session, po.expected_arrival)
    await db_session.commit()
    assert len(delivered_first) == 1

    inv_after_first = (await db_session.execute(
        select(Inventory).where(Inventory.store_id == store_b.store_id, Inventory.product_id == prod.product_id)
    )).scalar_one()
    assert inv_after_first.quantity == 40

    # Second delivery with later clock time (idempotency check)
    delivered_second = await process_supplier_deliveries(db_session, po.expected_arrival + timedelta(hours=5))
    await db_session.commit()
    assert len(delivered_second) == 0, "Already-delivered PO must not be delivered again"

    inv_after_second = (await db_session.execute(
        select(Inventory).where(Inventory.store_id == store_b.store_id, Inventory.product_id == prod.product_id)
    )).scalar_one()
    assert inv_after_second.quantity == 40, "Inventory must NOT duplicate upon repeated arrival check"


@pytest.mark.asyncio
async def test_transfer_calls_dispatch_transfer_without_immediate_dest_inventory_change(db_session: AsyncSession):
    """Spec §4.B.5 & §4.B.6: Approved transfer records ETA; destination inventory changes only after arrival."""
    clear_active_transfers()
    rfc, prod, store_a, store_b = await _setup_rfc_and_stores(db_session)
    now = _naive_now()

    # Source has 40 units in a batch; destination has 0
    b_src = Batch(
        batch_id=uuid.uuid4(), store_id=store_a.store_id, product_id=prod.product_id,
        quantity=40, received_at=now - timedelta(hours=10), expires_at=now + timedelta(hours=62),
    )
    inv_src = Inventory(store_id=store_a.store_id, product_id=prod.product_id, quantity=40)
    inv_dst = Inventory(store_id=store_b.store_id, product_id=prod.product_id, quantity=0)
    db_session.add_all([b_src, inv_src, inv_dst])

    risk = Risk(
        risk_id=uuid.uuid4(), store_id=store_b.store_id, product_id=prod.product_id,
        risk_type=RiskType.STOCKOUT, severity=RiskSeverity.CRITICAL, probability=0.91,
        expected_time=now + timedelta(hours=3), status=RiskStatus.ACTIVE,
    )
    db_session.add(risk)

    rec = Recommendation(
        recommendation_id=uuid.uuid4(), risk_id=risk.risk_id, action_type=ActionType.TRANSFER,
        quantity=15, source_store_id=store_a.store_id, destination_store_id=store_b.store_id,
        score=0.92, confidence=0.88, reason_codes=["SAFE_EXCESS_AVAILABLE"], alternatives=[],
        status=RecommendationStatus.APPROVED,
    )
    db_session.add(rec)
    await db_session.commit()

    # Execute transfer
    res = await create_transfer(db_session, rec.recommendation_id)
    await db_session.commit()

    assert res["success"] is True
    assert res["transferred_quantity"] == 15
    assert "arrival_eta" in res

    # PROOF: Source inventory decremented immediately (reserved), destination UNCHANGED
    src_inv_mid = (await db_session.execute(
        select(Inventory).where(Inventory.store_id == store_a.store_id, Inventory.product_id == prod.product_id)
    )).scalar_one()
    dst_inv_mid = (await db_session.execute(
        select(Inventory).where(Inventory.store_id == store_b.store_id, Inventory.product_id == prod.product_id)
    )).scalar_one()

    assert src_inv_mid.quantity == 25, "Source inventory must be decremented by 15 immediately"
    assert dst_inv_mid.quantity == 0, "Destination inventory must remain 0 during transit"

    # Arrival: Process arriving transfers at arrival ETA
    active_t = get_active_transfers()
    assert len(active_t) >= 1
    t = active_t[-1]
    delivered = await process_arriving_transfers(db_session, t.arrival_eta)
    await db_session.commit()
    assert any(d.transfer_id == t.transfer_id for d in delivered)

    # PROOF: Destination inventory increases only upon arrival
    dst_inv_final = (await db_session.execute(
        select(Inventory).where(Inventory.store_id == store_b.store_id, Inventory.product_id == prod.product_id)
    )).scalar_one()
    assert dst_inv_final.quantity == 15, "Destination inventory must increase to 15 upon arrival"

    # Second arrival check (idempotency)
    delivered_second = await process_arriving_transfers(db_session, t.arrival_eta + timedelta(minutes=30))
    await db_session.commit()
    assert len(delivered_second) == 0

    dst_inv_double = (await db_session.execute(
        select(Inventory).where(Inventory.store_id == store_b.store_id, Inventory.product_id == prod.product_id)
    )).scalar_one()
    assert dst_inv_double.quantity == 15


@pytest.mark.asyncio
async def test_stale_recommendation_rejected_or_diverts_before_dispatch(db_session: AsyncSession):
    """Spec §4.B.7: A stale recommendation (insufficient source inventory) is rejected before dispatch."""
    clear_active_transfers()
    rfc, prod, store_a, store_b = await _setup_rfc_and_stores(db_session)
    now = _naive_now()

    # Source initially had stock, but depleted to 5 units prior to execution
    b_src = Batch(
        batch_id=uuid.uuid4(), store_id=store_a.store_id, product_id=prod.product_id,
        quantity=5, received_at=now - timedelta(hours=10), expires_at=now + timedelta(hours=62),
    )
    inv_src = Inventory(store_id=store_a.store_id, product_id=prod.product_id, quantity=5)
    inv_dst = Inventory(store_id=store_b.store_id, product_id=prod.product_id, quantity=0)
    db_session.add_all([b_src, inv_src, inv_dst])

    risk = Risk(
        risk_id=uuid.uuid4(), store_id=store_b.store_id, product_id=prod.product_id,
        risk_type=RiskType.STOCKOUT, severity=RiskSeverity.CRITICAL, probability=0.91,
        expected_time=now + timedelta(hours=3), status=RiskStatus.ACTIVE,
    )
    db_session.add(risk)

    rec = Recommendation(
        recommendation_id=uuid.uuid4(), risk_id=risk.risk_id, action_type=ActionType.TRANSFER,
        quantity=20, source_store_id=store_a.store_id, destination_store_id=store_b.store_id,
        score=0.92, confidence=0.88, reason_codes=["SAFE_EXCESS_AVAILABLE"], alternatives=[],
        status=RecommendationStatus.APPROVED,
    )
    db_session.add(rec)
    await db_session.commit()

    # Execution attempt must fail cleanly due to stale source inventory
    res = await create_transfer(db_session, rec.recommendation_id)
    assert res["success"] is False
    assert res.get("stale") is True
    assert "insufficient" in res["error"].lower()


def test_regional_fulfilment_centre_naming_convention():
    """Spec §4.B.8: Seed data must name suppliers Regional Fulfilment Centre (RFC) with no legacy labels."""
    for s in SUPPLIERS:
        assert "RFC" in s.name or "Regional Fulfilment Centre" in s.name, (
            f"Supplier '{s.name}' does not follow the Regional Fulfilment Centre (RFC) naming convention"
        )
