"""Test suite for Outcomes & Audit REST API (Spec Section 7 & 14)."""
import pytest
from httpx import AsyncClient


import uuid
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from backend.models.core import OutcomeRecord, Store, Product


@pytest.mark.asyncio
async def test_get_outcomes_empty_returns_honest_message(client: AsyncClient):
    """GET /api/outcomes returns 200 with empty list and honest message when table is empty."""
    resp = await client.get("/api/outcomes")
    assert resp.status_code == 200
    data = resp.json()

    assert data["resolved_count"] == 0
    assert data["total_lost_sales_units"] == 0
    assert len(data["records"]) == 0
    assert "no outcomes measured yet" in data["disclaimer"].lower()


@pytest.mark.asyncio
async def test_get_outcomes_returns_records(client: AsyncClient, db_session: AsyncSession):
    """GET /api/outcomes returns 200 with summary metrics and real database records."""
    # Insert a real record
    store = (await db_session.execute(Store.__table__.select().limit(1))).first()
    product = (await db_session.execute(Product.__table__.select().limit(1))).first()
    store_id = store.store_id if store else uuid.uuid4()
    product_id = product.product_id if product else uuid.uuid4()

    rec = OutcomeRecord(
        outcome_id=uuid.uuid4(),
        store_id=store_id,
        product_id=product_id,
        exception_title="Test Stockout Risk",
        action_taken="Lateral Transfer 20u",
        outcome_status="Stockout prevented",
        expected_lost_sales_units=20,
        actual_lost_sales_units=0,
        measured_vs_expected="0u vs 20u expected lost",
        waste_units=0,
        waste_value_inr=0.0,
        notes="Verified delivery",
        evaluated_at=datetime.now(timezone.utc),
    )
    db_session.add(rec)
    await db_session.commit()

    resp = await client.get("/api/outcomes")
    assert resp.status_code == 200
    data = resp.json()

    assert data["resolved_count"] >= 1
    assert "records" in data
    assert len(data["records"]) >= 1

    item = data["records"][0]
    assert "exception_title" in item
    assert "action_taken" in item
    assert "outcome_status" in item
    assert "measured_vs_expected" in item
    assert "notes" in item
