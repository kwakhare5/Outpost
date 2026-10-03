"""Tests for Phase 1: Real Shipment Persistence and Arrival Count Confirmation.

Enforces Spec Section 6.5, 6.6, 9.2, 9.5, and 107 invariants:
1. Destination stock never increases at approval, dispatch, or ETA alone.
2. Arriving transfer transitions to 'awaiting_confirmation'.
3. Early confirmation before ETA is rejected.
4. Physical count confirmation credits exact received units into destination batches.
5. Discrepancy is recorded in ReceiptConfirmation.
6. Repeated confirmation is strictly idempotent.
"""
import uuid
from datetime import datetime, timedelta
import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.core import Store, Product, Supplier, Inventory, Batch, Shipment, ReceiptConfirmation
from backend.models.enums import StoreStatus, ProductCategory, SupplierStatus, ShipmentStatus
from backend.services.simulation.transfer import (
    dispatch_transfer,
    process_arriving_transfers,
    confirm_shipment_receipt,
    clear_active_transfers,
)


def _naive_now() -> datetime:
    return datetime.now().replace(microsecond=0)


async def _setup_stores_and_product(db: AsyncSession):
    store_a = Store(store_id=uuid.uuid4(), name="Dark Store Bandra", latitude=19.0596, longitude=72.8295, operating_status=StoreStatus.ACTIVE)
    store_b = Store(store_id=uuid.uuid4(), name="Dark Store Andheri West", latitude=19.1136, longitude=72.8295, operating_status=StoreStatus.ACTIVE)
    supp = Supplier(supplier_id=uuid.uuid4(), name="Bhiwandi RFC (Dairy)", lead_time_hours=24, status=SupplierStatus.ACTIVE)
    prod = Product(
        product_id=uuid.uuid4(), name="Amul Taaza Milk 500ml", category=ProductCategory.DAIRY,
        unit="pack", shelf_life_hours=72, base_price=28.0, supplier_id=supp.supplier_id,
    )
    db.add_all([store_a, store_b, supp, prod])
    await db.commit()
    return store_a, store_b, prod


@pytest.mark.asyncio
async def test_transfer_awaits_confirmation_without_crediting_inventory(db_session: AsyncSession):
    """Spec Section 6.6: Arriving transfer enters awaiting_confirmation; destination stock remains 0."""
    clear_active_transfers()
    store_a, store_b, prod = await _setup_stores_and_product(db_session)
    now = _naive_now()

    # Donor has 40 units, destination has 0
    b_src = Batch(
        batch_id=uuid.uuid4(), store_id=store_a.store_id, product_id=prod.product_id,
        quantity=40, received_at=now - timedelta(hours=5), expires_at=now + timedelta(hours=48),
    )
    inv_a = Inventory(store_id=store_a.store_id, product_id=prod.product_id, quantity=40)
    inv_b = Inventory(store_id=store_b.store_id, product_id=prod.product_id, quantity=0)
    db_session.add_all([b_src, inv_a, inv_b])
    await db_session.commit()

    # Dispatch 20 units
    transfer = await dispatch_transfer(
        db=db_session, source_store_id=store_a.store_id, destination_store_id=store_b.store_id,
        product_id=prod.product_id, quantity=20, current_time=now,
    )
    await db_session.commit()

    # Verify donor deducted immediately, receiver remains 0
    await db_session.refresh(inv_a)
    await db_session.refresh(inv_b)
    assert inv_a.quantity == 20
    assert inv_b.quantity == 0

    # Advance to arrival ETA with auto_confirm=False
    arrived = await process_arriving_transfers(db_session, transfer.arrival_eta, auto_confirm=False)
    await db_session.commit()

    assert len(arrived) == 1
    assert arrived[0].status == "awaiting_confirmation"

    # Destination stock MUST STILL BE 0 (no teleportation)
    await db_session.refresh(inv_b)
    assert inv_b.quantity == 0, "Destination stock must NOT credit upon arrival alone without confirmation"


@pytest.mark.asyncio
async def test_early_confirmation_rejected(db_session: AsyncSession):
    """Spec Section 107: UI and API reject early receipt before ETA."""
    clear_active_transfers()
    store_a, store_b, prod = await _setup_stores_and_product(db_session)
    now = _naive_now()

    b_src = Batch(
        batch_id=uuid.uuid4(), store_id=store_a.store_id, product_id=prod.product_id,
        quantity=50, received_at=now - timedelta(hours=5), expires_at=now + timedelta(hours=48),
    )
    inv_a = Inventory(store_id=store_a.store_id, product_id=prod.product_id, quantity=50)
    inv_b = Inventory(store_id=store_b.store_id, product_id=prod.product_id, quantity=0)
    db_session.add_all([b_src, inv_a, inv_b])
    await db_session.commit()

    transfer = await dispatch_transfer(
        db=db_session, source_store_id=store_a.store_id, destination_store_id=store_b.store_id,
        product_id=prod.product_id, quantity=20, current_time=now,
    )
    await db_session.commit()

    # Attempt receipt BEFORE arrival ETA
    with pytest.raises(ValueError, match="Cannot confirm receipt before arrival ETA"):
        await confirm_shipment_receipt(
            db=db_session, shipment_id=transfer.transfer_id, received_quantity=20,
            current_time=now + timedelta(minutes=5),  # Before ETA (which is ~22 mins away)
        )


@pytest.mark.asyncio
async def test_count_confirmation_with_discrepancy_and_idempotency(db_session: AsyncSession):
    """Spec Section 6.8 & 107: Confirming receipt credits only confirmed units, logs discrepancy, and is idempotent."""
    clear_active_transfers()
    store_a, store_b, prod = await _setup_stores_and_product(db_session)
    now = _naive_now()

    b_src = Batch(
        batch_id=uuid.uuid4(), store_id=store_a.store_id, product_id=prod.product_id,
        quantity=50, received_at=now - timedelta(hours=5), expires_at=now + timedelta(hours=48),
    )
    inv_a = Inventory(store_id=store_a.store_id, product_id=prod.product_id, quantity=50)
    inv_b = Inventory(store_id=store_b.store_id, product_id=prod.product_id, quantity=0)
    db_session.add_all([b_src, inv_a, inv_b])
    await db_session.commit()

    transfer = await dispatch_transfer(
        db=db_session, source_store_id=store_a.store_id, destination_store_id=store_b.store_id,
        product_id=prod.product_id, quantity=40, current_time=now,
    )
    await db_session.commit()

    # Advance clock to arrival
    await process_arriving_transfers(db_session, transfer.arrival_eta, auto_confirm=False)
    await db_session.commit()

    # Operator counts 38 units (2 damaged / lost in transit)
    res = await confirm_shipment_receipt(
        db=db_session, shipment_id=transfer.transfer_id, received_quantity=38,
        current_time=transfer.arrival_eta, notes="2 cartons burst in transit",
    )
    await db_session.commit()

    assert res["status"] == "confirmed"
    assert res["sent_units"] == 40
    assert res["received_units"] == 38
    assert res["discrepancy_units"] == 2

    # PROOF: Destination inventory increased by EXACTLY 38 units (mass conservation)
    await db_session.refresh(inv_b)
    assert inv_b.quantity == 38

    # ReceiptConfirmation record persisted
    rc_res = await db_session.execute(
        select(ReceiptConfirmation).where(ReceiptConfirmation.shipment_id == transfer.transfer_id)
    )
    rc = rc_res.scalar_one()
    assert rc.received_units == 38
    assert rc.discrepancy_units == 2

    # IDEMPOTENCY: Repeating confirmation does NOT double-credit stock
    res_second = await confirm_shipment_receipt(
        db=db_session, shipment_id=transfer.transfer_id, received_quantity=38,
        current_time=transfer.arrival_eta + timedelta(minutes=10),
    )
    await db_session.commit()

    assert res_second["status"] == "already_confirmed"
    await db_session.refresh(inv_b)
    assert inv_b.quantity == 38, "Inventory must NOT increase on repeated confirmation"
