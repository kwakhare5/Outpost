"""Inter-Store Transfer Simulation Service for Outpost.

Calculates spatial distances (Haversine), transfer ETAs based on urban traffic,
dispatches transfers with immediate source reservation (FIFO), and delivers arriving
stock to destination dark stores with inventory mass conservation.
"""
from __future__ import annotations

import math
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone, timedelta
from typing import Any

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.core import Store, Product, Inventory, Batch, Event, Shipment, ReceiptConfirmation
from backend.models.enums import ShipmentStatus
from backend.services.simulation.seed_data import STORES


def calculate_haversine_distance(
    lat1: float, lon1: float, lat2: float, lon2: float
) -> float:
    """Calculate the great-circle distance between two geographic points in kilometers."""
    if lat1 == lat2 and lon1 == lon2:
        return 0.0

    R = 6371.0  # Earth's radius in kilometers
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)

    a = (
        math.sin(dlat / 2.0) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round(R * c, 2)


def calculate_transfer_eta_minutes(
    distance_km: float, speed_kmh: float = 25.0, traffic_multiplier: float = 1.0
) -> float:
    """Calculate transfer ETA in minutes given distance, speed, and traffic factor."""
    if distance_km <= 0.0 or speed_kmh <= 0.0:
        return 0.0
    travel_hours = (distance_km / speed_kmh) * traffic_multiplier
    return round(travel_hours * 60.0, 1)


def get_store_distance_matrix() -> dict[str, dict[str, float]]:
    """Generate the 5x5 inter-store distance matrix (in km) for the dark store network."""
    matrix: dict[str, dict[str, float]] = {}
    for s1 in STORES:
        matrix[s1.name] = {}
        for s2 in STORES:
            matrix[s1.name][s2.name] = calculate_haversine_distance(
                s1.latitude, s1.longitude, s2.latitude, s2.longitude
            )
    return matrix


@dataclass
class InTransitTransfer:
    transfer_id: uuid.UUID
    source_store_id: uuid.UUID
    destination_store_id: uuid.UUID
    product_id: uuid.UUID
    quantity: int
    dispatched_at: datetime
    arrival_eta: datetime
    status: str = 'in_transit'  # 'in_transit' | 'delivered' | 'cancelled'
    batch_records: list[dict[str, Any]] = None
    distance_km: float = 0.0
    traffic_multiplier: float = 1.0

    def __post_init__(self):
        if self.batch_records is None:
            self.batch_records = []



# Active in-transit registry
_active_transfers: list[InTransitTransfer] = []


def get_active_transfers() -> list[InTransitTransfer]:
    """Retrieve currently active in-transit transfers."""
    return [t for t in _active_transfers if t.status == 'in_transit']


def clear_active_transfers() -> None:
    """Reset active transfer registry."""
    global _active_transfers
    _active_transfers = []


async def dispatch_transfer(
    db: AsyncSession,
    source_store_id: uuid.UUID,
    destination_store_id: uuid.UUID,
    product_id: uuid.UUID,
    quantity: int,
    current_time: datetime,
    speed_kmh: float = 25.0,
    traffic_multiplier: float = 1.0,
) -> InTransitTransfer:
    """Dispatch an inter-store transfer.
    
    Invariants:
    1. Source must have sufficient non-expired inventory.
    2. Quantities are deducted from source active batches using FIFO immediately.
    3. Transfer is recorded as in-transit until current_time >= arrival_eta.
    """
    if source_store_id == destination_store_id:
        raise ValueError("Source and destination stores cannot be the same")
    if quantity <= 0:
        raise ValueError("Transfer quantity must be positive")

    # Normalize tz for SQLite comparison
    current_naive = current_time.replace(tzinfo=None) if current_time.tzinfo else current_time

    # Fetch source active non-expired batches
    batch_res = await db.execute(
        select(Batch)
        .where(
            Batch.store_id == source_store_id,
            Batch.product_id == product_id,
            Batch.quantity > 0,
            Batch.expires_at > current_naive,
        )
        .order_by(Batch.expires_at.asc(), Batch.received_at.asc())
    )
    batches = batch_res.scalars().all()
    available_qty = sum(b.quantity for b in batches)

    if available_qty < quantity:
        raise ValueError(
            f"Insufficient active stock at source. Available: {available_qty}, Requested: {quantity}"
        )

    # Compute distance and ETA
    source_store = await db.get(Store, source_store_id)
    dest_store = await db.get(Store, destination_store_id)
    if not source_store or not dest_store:
        raise ValueError("Invalid source or destination store ID")

    dist_km = calculate_haversine_distance(
        source_store.latitude, source_store.longitude,
        dest_store.latitude, dest_store.longitude,
    )
    eta_mins = calculate_transfer_eta_minutes(dist_km, speed_kmh, traffic_multiplier)
    arrival_time = current_time + timedelta(minutes=eta_mins)

    # Deduct quantity from source batches (FIFO reservation)
    deducted_batches: list[dict[str, Any]] = []
    rem = quantity
    for b in batches:
        if rem <= 0:
            break
        take = min(b.quantity, rem)
        b.quantity -= take
        rem -= take
        deducted_batches.append({
            'original_batch_id': str(b.batch_id),
            'quantity': take,
            'expires_at': b.expires_at.isoformat(),
        })

    # Synchronize source inventory total
    inv_res = await db.execute(
        select(Inventory).where(
            Inventory.store_id == source_store_id,
            Inventory.product_id == product_id,
        )
    )
    source_inv = inv_res.scalar_one_or_none()
    if source_inv:
        # Recompute from all active batches
        active_sum_res = await db.execute(
            select(func.coalesce(func.sum(Batch.quantity), 0)).where(
                Batch.store_id == source_store_id,
                Batch.product_id == product_id,
                Batch.quantity > 0,
            )
        )
        source_inv.quantity = active_sum_res.scalar()

    transfer_id = uuid.uuid4()
    transfer = InTransitTransfer(
        transfer_id=transfer_id,
        source_store_id=source_store_id,
        destination_store_id=destination_store_id,
        product_id=product_id,
        quantity=quantity,
        dispatched_at=current_time,
        arrival_eta=arrival_time,
        batch_records=deducted_batches,
        distance_km=dist_km,
        traffic_multiplier=traffic_multiplier,
    )
    _active_transfers.append(transfer)

    # Persist Shipment ORM row in database
    shipment = Shipment(
        shipment_id=transfer_id,
        source_store_id=source_store_id,
        destination_store_id=destination_store_id,
        product_id=product_id,
        quantity=quantity,
        status=ShipmentStatus.IN_TRANSIT,
        dispatched_at=current_naive,
        arrival_eta=arrival_time.replace(tzinfo=None) if arrival_time.tzinfo else arrival_time,
        batch_records=deducted_batches,
        distance_km=dist_km,
        traffic_multiplier=traffic_multiplier,
        van_id="VAN-MUM-01",
    )
    db.add(shipment)

    # Audit event
    event = Event(
        event_id=uuid.uuid4(),
        event_type='TRANSFER_DISPATCHED',
        timestamp=current_time,
        entity_type='transfer',
        entity_id=transfer.transfer_id,
        payload={
            'source_store_id': str(source_store_id),
            'destination_store_id': str(destination_store_id),
            'product_id': str(product_id),
            'quantity': quantity,
            'distance_km': dist_km,
            'eta_minutes': eta_mins,
            'arrival_time': arrival_time.isoformat(),
        },
    )
    db.add(event)
    await db.flush()

    return transfer


async def process_arriving_transfers(
    db: AsyncSession, current_time: datetime, auto_confirm: bool = True
) -> list[InTransitTransfer]:
    """Check for transfers that have arrived at their destination.
    
    If auto_confirm is False (Spec Section 6.6 invariant):
      Transitions transfer status to 'awaiting_confirmation'. Units remain in shipment stock
      and do NOT credit destination store until confirmed by an operator.
    If auto_confirm is True:
      Immediately confirms receipt and credits destination batches.
    """
    arrived: list[InTransitTransfer] = []

    current_naive = current_time.replace(tzinfo=None) if current_time.tzinfo else current_time
    for transfer in _active_transfers:
        arr_naive = transfer.arrival_eta.replace(tzinfo=None) if transfer.arrival_eta.tzinfo else transfer.arrival_eta
        if transfer.status == 'in_transit' and current_naive >= arr_naive:
            # Sync shipment row if present
            shipment = await db.get(Shipment, transfer.transfer_id)

            if auto_confirm:
                # Deliver to destination store: create new received batches preserving expiry
                for b_info in transfer.batch_records:
                    expires_at = datetime.fromisoformat(b_info['expires_at'])
                    exp_naive = expires_at.replace(tzinfo=None) if expires_at.tzinfo else expires_at
                    if exp_naive > current_naive:
                        new_batch = Batch(
                            batch_id=uuid.uuid4(),
                            store_id=transfer.destination_store_id,
                            product_id=transfer.product_id,
                            quantity=b_info['quantity'],
                            received_at=current_naive,
                            expires_at=exp_naive,
                        )
                        db.add(new_batch)

                inv_res = await db.execute(
                    select(Inventory).where(
                        Inventory.store_id == transfer.destination_store_id,
                        Inventory.product_id == transfer.product_id,
                    )
                )
                dest_inv = inv_res.scalar_one_or_none()
                if dest_inv:
                    await db.flush()
                    active_sum_res = await db.execute(
                        select(func.coalesce(func.sum(Batch.quantity), 0)).where(
                            Batch.store_id == transfer.destination_store_id,
                            Batch.product_id == transfer.product_id,
                            Batch.quantity > 0,
                        )
                    )
                    dest_inv.quantity = active_sum_res.scalar()

                transfer.status = 'delivered'
                if shipment:
                    shipment.status = ShipmentStatus.RECEIVED
                    shipment.confirmed_at = current_naive

                event = Event(
                    event_id=uuid.uuid4(),
                    event_type='TRANSFER_DELIVERED',
                    timestamp=current_time,
                    entity_type='transfer',
                    entity_id=transfer.transfer_id,
                    payload={
                        'source_store_id': str(transfer.source_store_id),
                        'destination_store_id': str(transfer.destination_store_id),
                        'product_id': str(transfer.product_id),
                        'quantity': transfer.quantity,
                    },
                )
                db.add(event)
            else:
                # Spec Section 6.6: Awaiting count confirmation — NO stock credit yet
                transfer.status = 'awaiting_confirmation'
                if shipment:
                    shipment.status = ShipmentStatus.AWAITING_CONFIRMATION

                event = Event(
                    event_id=uuid.uuid4(),
                    event_type='TRANSFER_ARRIVED_AWAITING_CONFIRMATION',
                    timestamp=current_time,
                    entity_type='transfer',
                    entity_id=transfer.transfer_id,
                    payload={
                        'source_store_id': str(transfer.source_store_id),
                        'destination_store_id': str(transfer.destination_store_id),
                        'product_id': str(transfer.product_id),
                        'quantity': transfer.quantity,
                    },
                )
                db.add(event)

            arrived.append(transfer)

    if arrived:
        await db.flush()

    return arrived


async def confirm_shipment_receipt(
    db: AsyncSession,
    shipment_id: uuid.UUID,
    received_quantity: int,
    current_time: datetime,
    notes: str | None = None,
) -> dict[str, Any]:
    """Confirm arrival count and restock destination dark store.
    
    Enforces Spec Section 6.6 & Section 107 invariants:
    1. Early receipt before ETA is rejected.
    2. Repeated confirmation is idempotent.
    3. Mass conservation: credits only valid unexpired received_quantity to destination batches.
    4. Discrepancy (sent - received) is recorded as transit shrinkage/damage loss.
    """
    shipment = await db.get(Shipment, shipment_id)
    transfer = next((t for t in _active_transfers if t.transfer_id == shipment_id), None)

    if not shipment and not transfer:
        raise ValueError(f"Shipment {shipment_id} not found")

    dest_store_id = shipment.destination_store_id if shipment else transfer.destination_store_id
    prod_id = shipment.product_id if shipment else transfer.product_id
    sent_qty = shipment.quantity if shipment else transfer.quantity
    batch_records = shipment.batch_records if shipment else transfer.batch_records
    arr_eta = shipment.arrival_eta if shipment else transfer.arrival_eta

    current_naive = current_time.replace(tzinfo=None) if current_time.tzinfo else current_time
    eta_naive = arr_eta.replace(tzinfo=None) if arr_eta.tzinfo else arr_eta

    # Check already received (idempotency)
    existing_rc_res = await db.execute(
        select(ReceiptConfirmation).where(ReceiptConfirmation.shipment_id == shipment_id)
    )
    existing_rc = existing_rc_res.scalars().first()
    if existing_rc:
        return {
            "confirmation_id": str(existing_rc.confirmation_id),
            "shipment_id": str(shipment_id),
            "sent_units": existing_rc.sent_units,
            "received_units": existing_rc.received_units,
            "discrepancy_units": existing_rc.discrepancy_units,
            "status": "already_confirmed",
        }

    # Reject early receipt
    if current_naive < eta_naive:
        raise ValueError(f"Cannot confirm receipt before arrival ETA ({arr_eta.isoformat()})")

    # Bounded received quantity
    confirmed_units = max(0, min(sent_qty, received_quantity))
    discrepancy_units = sent_qty - confirmed_units

    # Credit confirmed units into destination batches preserving original batch expiry
    remaining_to_credit = confirmed_units
    for b_info in batch_records:
        if remaining_to_credit <= 0:
            break
        take = min(b_info['quantity'], remaining_to_credit)
        expires_at = datetime.fromisoformat(b_info['expires_at'])
        exp_naive = expires_at.replace(tzinfo=None) if expires_at.tzinfo else expires_at
        if exp_naive > current_naive:
            new_batch = Batch(
                batch_id=uuid.uuid4(),
                store_id=dest_store_id,
                product_id=prod_id,
                quantity=take,
                received_at=current_naive,
                expires_at=exp_naive,
            )
            db.add(new_batch)
            remaining_to_credit -= take

    # Synchronize destination inventory
    inv_res = await db.execute(
        select(Inventory).where(
            Inventory.store_id == dest_store_id,
            Inventory.product_id == prod_id,
        )
    )
    dest_inv = inv_res.scalar_one_or_none()
    if dest_inv:
        await db.flush()
        active_sum_res = await db.execute(
            select(func.coalesce(func.sum(Batch.quantity), 0)).where(
                Batch.store_id == dest_store_id,
                Batch.product_id == prod_id,
                Batch.quantity > 0,
            )
        )
        dest_inv.quantity = active_sum_res.scalar()

    # Create ReceiptConfirmation record
    confirmation_id = uuid.uuid4()
    rc = ReceiptConfirmation(
        confirmation_id=confirmation_id,
        shipment_id=shipment_id,
        sent_units=sent_qty,
        received_units=confirmed_units,
        discrepancy_units=discrepancy_units,
        discrepancy_reason="Transit shrinkage / loss" if discrepancy_units > 0 else None,
        notes=notes,
        confirmed_at=current_naive,
    )
    db.add(rc)

    # Transition statuses
    if shipment:
        shipment.status = ShipmentStatus.RECEIVED if discrepancy_units == 0 else ShipmentStatus.DISCREPANCY
        shipment.confirmed_at = current_naive
    if transfer:
        transfer.status = 'delivered'

    # Audit event
    event = Event(
        event_id=uuid.uuid4(),
        event_type='RECEIPT_CONFIRMED',
        timestamp=current_time,
        entity_type='shipment',
        entity_id=shipment_id,
        payload={
            'shipment_id': str(shipment_id),
            'destination_store_id': str(dest_store_id),
            'product_id': str(prod_id),
            'sent_units': sent_qty,
            'received_units': confirmed_units,
            'discrepancy_units': discrepancy_units,
        },
    )
    db.add(event)
    await db.flush()

    return {
        "confirmation_id": str(confirmation_id),
        "shipment_id": str(shipment_id),
        "sent_units": sent_qty,
        "received_units": confirmed_units,
        "discrepancy_units": discrepancy_units,
        "status": "confirmed",
    }

