"""Shipments and Receipt Confirmation REST API.

Implements Spec Section 6 (In-Flight Screen, step trail, and arrival count confirmation),
and Section 8.4 (Command contract for shipment arrival confirmation).
"""
import uuid
from datetime import datetime, timezone
from typing import Optional, Any
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models.core import Shipment, Store, Product, ReceiptConfirmation
from backend.models.enums import ShipmentStatus
from backend.services.simulation.transfer import confirm_shipment_receipt

router = APIRouter(prefix="/api/shipments", tags=["shipments"])


class ConfirmReceiptPayload(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    received_units: int
    notes: Optional[str] = None


class ReceiptConfirmationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    confirmation_id: str
    shipment_id: str
    sent_units: int
    received_units: int
    discrepancy_units: int
    status: str


class ShipmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    shipment_id: uuid.UUID
    recommendation_id: Optional[uuid.UUID] = None
    source_store_id: uuid.UUID
    source_store_name: str
    destination_store_id: uuid.UUID
    destination_store_name: str
    product_id: uuid.UUID
    product_name: str
    quantity: int
    status: str
    dispatched_at: datetime
    arrival_eta: datetime
    confirmed_at: Optional[datetime] = None
    van_id: str
    distance_km: float


@router.get("", response_model=list[ShipmentResponse])
async def list_shipments(
    db: AsyncSession = Depends(get_db),
) -> list[ShipmentResponse]:
    """List all shipments with store and product names for the In-flight screen."""
    res = await db.execute(
        select(Shipment).order_by(Shipment.dispatched_at.desc())
    )
    shipments = res.scalars().all()

    # Pre-fetch stores and products for display
    stores_res = await db.execute(select(Store))
    stores_map = {s.store_id: s.name for s in stores_res.scalars().all()}

    prods_res = await db.execute(select(Product))
    prods_map = {p.product_id: p.name for p in prods_res.scalars().all()}

    return [
        ShipmentResponse(
            shipment_id=s.shipment_id,
            recommendation_id=s.recommendation_id,
            source_store_id=s.source_store_id,
            source_store_name=stores_map.get(s.source_store_id, "Source Store"),
            destination_store_id=s.destination_store_id,
            destination_store_name=stores_map.get(s.destination_store_id, "Destination Store"),
            product_id=s.product_id,
            product_name=prods_map.get(s.product_id, "Product"),
            quantity=s.quantity,
            status=s.status.value if hasattr(s.status, "value") else str(s.status),
            dispatched_at=s.dispatched_at,
            arrival_eta=s.arrival_eta,
            confirmed_at=s.confirmed_at,
            van_id=s.van_id or "VAN-MUM-01",
            distance_km=s.distance_km,
        )
        for s in shipments
    ]


@router.post("/{shipment_id}/confirm-receipt", response_model=ReceiptConfirmationResponse)
async def confirm_receipt(
    shipment_id: uuid.UUID,
    payload: ConfirmReceiptPayload,
    db: AsyncSession = Depends(get_db),
) -> ReceiptConfirmationResponse:
    """Confirm received count for an arriving shipment.
    
    Rejects early receipt if current time < ETA.
    Credits destination inventory only upon committed receipt.
    """
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    try:
        result = await confirm_shipment_receipt(
            db=db,
            shipment_id=shipment_id,
            received_quantity=payload.received_units,
            current_time=now,
            notes=payload.notes,
        )
        await db.commit()
        return ReceiptConfirmationResponse(**result)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
