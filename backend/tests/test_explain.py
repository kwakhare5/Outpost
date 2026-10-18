"""Tests for Phase 4A Explain Layer.

Verifies:
1. facts contain only real DB values and none of the excluded constants
2. no key gives fallback source
3. fake gemini reply with a number not in facts gives fallback
4. fake gemini reply using only given numbers gives source 'gemini'
5. endpoint returns 200 and the same text twice (cache)
6. decision and advance modules do not import the explain package
"""
from __future__ import annotations

import re
import uuid
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import patch

import httpx
import pytest
from httpx import ASGITransport, AsyncClient

from backend.config import settings
from backend.models.core import Forecast, Inventory, Product, Recommendation, Risk, Store, Supplier
from backend.models.enums import ActionType, ProductCategory, RecommendationStatus, RiskSeverity, RiskStatus, RiskType, StoreStatus, SupplierStatus
from backend.services.explain.facts import build_facts
from backend.services.explain.fallback import generate_fallback
from backend.services.explain.gemini import CACHE, clear_cache, explain, validate_numbers


@pytest.fixture(autouse=True)
def clean_cache_and_env():
    """Ensure clean cache and empty API key before and after each test."""
    clear_cache()
    original_key = settings.GEMINI_API_KEY
    settings.GEMINI_API_KEY = ""
    yield
    clear_cache()
    settings.GEMINI_API_KEY = original_key


async def _seed_test_rec(db_session, with_coords: bool = True) -> tuple[Recommendation, Store, Store, Product]:
    """Seed test data for explain layer."""
    now = datetime.now(timezone.utc).replace(tzinfo=None)

    supplier = Supplier(
        supplier_id=uuid.uuid4(),
        name="Amul Supplier",
        lead_time_hours=12,
        status=SupplierStatus.ACTIVE,
    )
    db_session.add(supplier)

    dest_store = Store(
        store_id=uuid.uuid4(),
        name="Dark Store Bandra",
        latitude=19.0596 if with_coords else 0.0,
        longitude=72.8295 if with_coords else 0.0,
        operating_status=StoreStatus.ACTIVE,
    )
    src_store = Store(
        store_id=uuid.uuid4(),
        name="Dark Store Andheri",
        latitude=19.1136 if with_coords else 0.0,
        longitude=72.8295 if with_coords else 0.0,
        operating_status=StoreStatus.ACTIVE,
    )
    db_session.add_all([dest_store, src_store])

    product = Product(
        product_id=uuid.uuid4(),
        name="Fresh Whole Milk 1L",
        category=ProductCategory.DAIRY,
        unit="unit",
        shelf_life_hours=48,
        base_price=30.0,
        supplier_id=supplier.supplier_id,
    )
    db_session.add(product)

    dest_inv = Inventory(
        id=uuid.uuid4(),
        store_id=dest_store.store_id,
        product_id=product.product_id,
        quantity=10,
    )
    src_inv = Inventory(
        id=uuid.uuid4(),
        store_id=src_store.store_id,
        product_id=product.product_id,
        quantity=50,
    )
    db_session.add_all([dest_inv, src_inv])

    forecast = Forecast(
        forecast_id=uuid.uuid4(),
        store_id=dest_store.store_id,
        product_id=product.product_id,
        forecast_window_hours=24,
        predicted_demand=24.0,
        confidence=0.9,
        model_name="test_model",
        created_at=now,
    )
    db_session.add(forecast)

    risk = Risk(
        risk_id=uuid.uuid4(),
        store_id=dest_store.store_id,
        product_id=product.product_id,
        risk_type=RiskType.STOCKOUT,
        severity=RiskSeverity.CRITICAL,
        probability=0.85,
        expected_time=now,
        status=RiskStatus.ACTIVE,
        created_at=now,
    )
    db_session.add(risk)

    rec = Recommendation(
        recommendation_id=uuid.uuid4(),
        risk_id=risk.risk_id,
        action_type=ActionType.TRANSFER,
        quantity=14,
        source_store_id=src_store.store_id,
        destination_store_id=dest_store.store_id,
        score=0.88,
        confidence=0.92,
        reason_codes=["HIGH_STOCKOUT_RISK", "SOURCE_HAS_SAFE_EXCESS"],
        alternatives=[],
        status=RecommendationStatus.PENDING,
        created_at=now,
    )
    db_session.add(rec)
    await db_session.commit()

    return rec, dest_store, src_store, product


@pytest.mark.asyncio
async def test_facts_contain_only_db_values_and_none_of_excluded_constants(db_session):
    """build_facts reads only real DB values and excludes all hardcoded heuristic constants."""
    rec, dest_store, src_store, product = await _seed_test_rec(db_session, with_coords=True)

    facts = await build_facts(db_session, rec)

    # 1. Real DB values present
    assert facts["action_type"] == "transfer"
    assert facts["quantity"] == 14
    assert facts["product_name"] == product.name
    assert facts["destination_store_name"] == dest_store.name
    assert facts["source_store_name"] == src_store.name
    assert facts["destination_stock"] == 10
    assert facts["hours_to_stockout"] == 10.0  # 10 stock / (24 / 24) = 10.0h
    assert facts["risk_probability"] == 0.85
    assert facts["risk_severity"] == "critical"
    assert facts["predicted_demand"] == 24.0
    assert facts["supplier_lead_time_hours"] == 12
    assert facts["distance_km"] == pytest.approx(6.0, abs=0.2)
    assert facts["batch_expiry_hours"] is None

    # 2. Excluded constants check:
    # - hours_to_expiry 48.0 in HoldInput
    # - availability 0.95/0.80
    # - Rs 15 per km and Rs 25 per unit cost constants
    # - 5.0 km default distance
    # - demand-48h assumption (predicted_demand * 2)
    values = list(facts.values())
    assert 48.0 not in values
    assert 0.95 not in values
    assert 0.80 not in values
    assert 15 not in values
    assert 15.0 not in values
    assert 25 not in values
    assert 25.0 not in values
    assert 5.0 not in values
    assert "demand_48h" not in facts
    assert "availability" not in facts

    # Test coordinate absence does NOT produce default 5.0 km
    rec2, _, _, _ = await _seed_test_rec(db_session, with_coords=False)
    facts2 = await build_facts(db_session, rec2)
    assert facts2["distance_km"] is None
    assert facts2["distance_km"] != 5.0


@pytest.mark.asyncio
async def test_no_key_gives_fallback_source(db_session):
    """When GEMINI_API_KEY is empty, explain returns fallback text with source 'fallback'."""
    settings.GEMINI_API_KEY = ""
    rec, _, _, _ = await _seed_test_rec(db_session)
    facts = await build_facts(db_session, rec)

    text, source = await explain(facts)

    assert source == "fallback"
    assert "Transfer of 14 units" in text
    assert "Dark Store Andheri" in text
    assert "Dark Store Bandra" in text
    # Verify numbers in fallback are strictly from facts
    assert validate_numbers(text, facts) is True


@pytest.mark.asyncio
async def test_fake_gemini_reply_with_number_not_in_facts_gives_fallback(db_session):
    """When Gemini returns a number not in facts (hallucination), it returns fallback."""
    settings.GEMINI_API_KEY = "fake-test-key"
    rec, _, _, _ = await _seed_test_rec(db_session)
    facts = await build_facts(db_session, rec)

    # Fake response with an invented number: 999
    fake_gemini_payload = {
        "candidates": [
            {
                "content": {
                    "parts": [{"text": "Transfer 999 units from Andheri to prevent stockout in Bandra."}]
                }
            }
        ]
    }

    class MockTransport(httpx.AsyncBaseTransport):
        async def handle_async_request(self, request: httpx.Request) -> httpx.Response:
            return httpx.Response(200, json=fake_gemini_payload)

    async with httpx.AsyncClient(transport=MockTransport()) as mock_client:
        text, source = await explain(facts, client=mock_client)

    assert source == "fallback"
    assert "999" not in text
    assert "Transfer of 14 units" in text


@pytest.mark.asyncio
async def test_fake_gemini_reply_using_only_given_numbers_gives_source_gemini(db_session):
    """When Gemini returns a reply using only numbers from facts, returns source 'gemini'."""
    settings.GEMINI_API_KEY = "fake-test-key"
    rec, _, _, _ = await _seed_test_rec(db_session)
    facts = await build_facts(db_session, rec)

    # Allowed numbers: 14 (qty), 10 (dest stock), 10.0 (hours), 1 (from 1L), 85 (risk prob), 6.0 (km)
    valid_text = (
        "Dark Store Bandra has 10 units left and may run out in 10.0 hours. "
        "We recommend transferring 14 units from Dark Store Andheri. "
        "Stockout risk probability is 85%."
    )

    fake_gemini_payload = {
        "candidates": [
            {
                "content": {
                    "parts": [{"text": valid_text}]
                }
            }
        ]
    }

    class MockTransport(httpx.AsyncBaseTransport):
        async def handle_async_request(self, request: httpx.Request) -> httpx.Response:
            return httpx.Response(200, json=fake_gemini_payload)

    async with httpx.AsyncClient(transport=MockTransport()) as mock_client:
        text, source = await explain(facts, client=mock_client)

    assert source == "gemini"
    assert text == valid_text


@pytest.mark.asyncio
async def test_endpoint_returns_200_and_cached_text_twice(client, db_session):
    """Endpoint returns 200 and identical text twice via in-memory cache."""
    rec, _, _, _ = await _seed_test_rec(db_session)

    call_count = 0

    async def mock_explain(facts, client=None):
        nonlocal call_count
        call_count += 1
        return ("AI explanation for store manager.", "gemini")

    with patch("backend.services.explain.gemini.explain", side_effect=mock_explain):
        # Call 1: uncached
        res1 = await client.get(f"/api/recommendations/{rec.recommendation_id}/explanation")
        assert res1.status_code == 200
        data1 = res1.json()
        assert data1["text"] == "AI explanation for store manager."
        assert data1["source"] == "gemini"
        assert call_count == 1

        # Call 2: cached
        res2 = await client.get(f"/api/recommendations/{rec.recommendation_id}/explanation")
        assert res2.status_code == 200
        data2 = res2.json()
        assert data2["text"] == data1["text"]
        assert data2["source"] == data1["source"]
        assert call_count == 1  # Cache hit: mock_explain was NOT called a second time


def test_decision_and_advance_modules_do_not_import_explain():
    """Grep check: decision and advance modules must never import the explain package."""
    repo_root = Path(__file__).resolve().parent.parent

    # Check backend/services/decision
    decision_dir = repo_root / "services" / "decision"
    # Check backend/services/simulation
    sim_dir = repo_root / "services" / "simulation"
    # Check backend/agents
    agents_dir = repo_root / "agents"

    forbidden_pattern = re.compile(r"^\s*(?:from\s+.*explain|import\s+.*explain)", re.MULTILINE)

    scanned_files = 0
    for target_dir in [decision_dir, sim_dir, agents_dir]:
        if not target_dir.exists():
            continue
        for py_file in target_dir.rglob("*.py"):
            scanned_files += 1
            content = py_file.read_text(encoding="utf-8")
            match = forbidden_pattern.search(content)
            assert match is None, f"Forbidden import of explain package in {py_file}: {match.group(0)}"

    assert scanned_files > 0, "Expected to scan decision, simulation, and agent modules"
