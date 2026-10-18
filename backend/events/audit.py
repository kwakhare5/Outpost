"""Audit log for Outpost.

LOCKED (decision 14): audit log writer -- zero Kafka/RabbitMQ.
Events are persisted to the Event audit table via a database session.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession


class AuditLog:
    """Audit log writer that persists system events to the Event audit table."""

    async def publish(
        self,
        db: AsyncSession,
        event_type: str,
        entity_type: str,
        entity_id: uuid.UUID | str,
        payload: Any = None,
        *,
        persist: bool = True,
    ) -> None:
        """Write an audit event to the database.

        If persist=True and db is provided, writes an Event row for the audit trail.
        """
        if payload is None:
            payload = {}

        if persist and db is not None:
            from backend.models.core import Event  # noqa: PLC0415

            row = Event(
                event_id=uuid.uuid4(),
                event_type=event_type,
                timestamp=datetime.now(timezone.utc).replace(tzinfo=None),
                entity_type=entity_type,
                entity_id=uuid.UUID(str(entity_id)),
                payload=payload,
            )
            db.add(row)
            await db.flush()


audit_log = AuditLog()
