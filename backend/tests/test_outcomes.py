"""Test suite for Outcomes & Audit REST API (Spec Section 7 & 14)."""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_get_outcomes_returns_records_and_audit_metrics(client: AsyncClient):
    """GET /api/outcomes returns 200 with summary metrics and synthetic fixture history."""
    resp = await client.get("/api/outcomes")
    assert resp.status_code == 200
    data = resp.json()

    assert "resolved_count" in data
    assert "stockout_prevented_count" in data
    assert "total_lost_sales_units" in data
    assert "records" in data
    assert len(data["records"]) >= 5
    assert data["disclaimer"] == "SYNTHETIC FIXTURE HISTORY & SIMULATION AUDIT"

    # Check fields of first record
    rec = data["records"][0]
    assert "exception_title" in rec
    assert "action_taken" in rec
    assert "outcome_status" in rec
    assert "measured_vs_expected" in rec
    assert "notes" in rec
