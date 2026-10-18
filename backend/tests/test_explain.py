"""Tests for Phase 4A Explain Layer and Phase 4A-FIX safeguards.

Verifies:
1. facts contain only real DB values and none of the excluded constants
2. no key gives fallback source
3. fake gemini reply with a number not in facts gives fallback
4. fake gemini reply using only given numbers gives source 'gemini'
5. endpoint returns 200 and the same text twice (cache)
6. decision and advance modules do not import the explain package
7. 404 for an unknown recommendation id
8. non-200, timeout and malformed JSON each give fallback
9. fallback results are not cached; a gemini result is cached (and CACHE capped at 500)
10. reply with number word 'ten' rejected; 4 sentences rejected; finishReason MAX_TOKENS rejected
11. missing risk row and missing inventory row: facts hold None, and prompt does not contain '0 units'
12. log test: after a forced failure, captured log text does not contain the fake key
"""
from __future__ import annotations

import json
import logging
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import patch

import httpx
import pytest

from backend.config import settings
from backend.models.core import Forecast, Inventory, Product, Recommendation, Risk, Store, Supplier
from backend.models.enums import (
    ActionType,
    ProductCategory,
    RecommendationStatus,
    RiskSeverity,
    RiskStatus,
    RiskType,
    StoreStatus,
    SupplierStatus,
)
from backend.services.explain.facts import build_facts
from backend.services.explain.fallback import generate_fallback
from backend.services.explain.gemini import (
    CACHE,
    clear_cache,
    contains_number_words,
    count_sentences,
    explain,
    validate_numbers,
)


@pytest.fixture(autouse=True)
def clean_cache_and_env():
    """Ensure clean cache and restore original API key after every test."""
    clear_cache()
    original_key = settings.GEMINI_API_KEY
    settings.GEMINI_API_KEY = ""
    yield
    clear_cache()
    settings.GEMINI_API_KEY = original_key


async def _seed_test_rec(
    db_session,
    with_coords: bool = True,
    with_risk: bool = True,
    with_inventory: bool = True,
) -> tuple[Recommendation, Store, Store, Product]:
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

    if with_inventory:
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

    if with_risk:
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
        risk_id = risk.risk_id
    else:
        # Non-existent risk row in DB
        risk_id = uuid.uuid4()

    rec = Recommendation(
        recommendation_id=uuid.uuid4(),
        risk_id=risk_id,
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

    assert facts["action_type"] == "transfer"
    assert facts["quantity"] == 14
    assert facts["product_name"] == product.name
    assert facts["destination_store_name"] == dest_store.name
    assert facts["source_store_name"] == src_store.name
    assert facts["destination_stock"] == 10
    assert facts["hours_to_stockout"] == 10.0
    assert facts["risk_probability"] == 0.85
    assert facts["risk_severity"] == "critical"
    assert facts["predicted_demand"] == 24.0
    assert facts["supplier_lead_time_hours"] == 12
    assert facts["distance_km"] == pytest.approx(6.0, abs=0.2)
    assert facts["batch_expiry_hours"] is None

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

    rec2, _, _, _ = await _seed_test_rec(db_session, with_coords=False)
    facts2 = await build_facts(db_session, rec2)
    assert facts2["distance_km"] is None


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
    assert validate_numbers(text, facts) is True


@pytest.mark.asyncio
async def test_fake_gemini_reply_with_number_not_in_facts_gives_fallback(db_session):
    """When Gemini returns a number not in facts (hallucination), it returns fallback."""
    settings.GEMINI_API_KEY = "fake-test-key"
    rec, _, _, _ = await _seed_test_rec(db_session)
    facts = await build_facts(db_session, rec)

    fake_gemini_payload = {
        "candidates": [
            {
                "finishReason": "STOP",
                "content": {
                    "parts": [{"text": "Transfer 999 units from Andheri to prevent stockout in Bandra."}]
                },
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

    valid_text = (
        "Dark Store Bandra has 10 units left and may run out in 10.0 hours. "
        "We recommend transferring 14 units from Dark Store Andheri. "
        "Stockout risk probability is 85%."
    )

    fake_gemini_payload = {
        "candidates": [
            {
                "finishReason": "STOP",
                "content": {
                    "parts": [{"text": valid_text}]
                },
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
        res1 = await client.get(f"/api/recommendations/{rec.recommendation_id}/explanation")
        assert res1.status_code == 200
        data1 = res1.json()
        assert data1["text"] == "AI explanation for store manager."
        assert data1["source"] == "gemini"
        assert call_count == 1

        res2 = await client.get(f"/api/recommendations/{rec.recommendation_id}/explanation")
        assert res2.status_code == 200
        data2 = res2.json()
        assert data2["text"] == data1["text"]
        assert data2["source"] == data1["source"]
        assert call_count == 1


def test_decision_and_advance_modules_do_not_import_explain():
    """Grep check: decision and advance modules must never import the explain package."""
    repo_root = Path(__file__).resolve().parent.parent

    decision_dir = repo_root / "services" / "decision"
    sim_dir = repo_root / "services" / "simulation"
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

    assert scanned_files > 0


@pytest.mark.asyncio
async def test_404_for_unknown_recommendation_id(client):
    """Endpoint returns 404 when recommendation does not exist."""
    unknown_id = uuid.uuid4()
    res = await client.get(f"/api/recommendations/{unknown_id}/explanation")
    assert res.status_code == 404
    assert res.json()["detail"] == "Recommendation not found"


@pytest.mark.asyncio
async def test_non_200_timeout_and_malformed_json_give_fallback(db_session):
    """Non-200, timeout, and malformed JSON each result in fallback source."""
    settings.GEMINI_API_KEY = "fake-key"
    rec, _, _, _ = await _seed_test_rec(db_session)
    facts = await build_facts(db_session, rec)

    # 1. Non-200 HTTP status
    class Non200Transport(httpx.AsyncBaseTransport):
        async def handle_async_request(self, request: httpx.Request) -> httpx.Response:
            return httpx.Response(500, text="Internal Server Error")

    async with httpx.AsyncClient(transport=Non200Transport()) as mock_client:
        text, source = await explain(facts, client=mock_client)
    assert source == "fallback"

    # 2. Timeout
    class TimeoutTransport(httpx.AsyncBaseTransport):
        async def handle_async_request(self, request: httpx.Request) -> httpx.Response:
            raise httpx.ReadTimeout("Request timed out")

    async with httpx.AsyncClient(transport=TimeoutTransport()) as mock_client:
        text, source = await explain(facts, client=mock_client)
    assert source == "fallback"

    # 3. Malformed JSON
    class MalformedTransport(httpx.AsyncBaseTransport):
        async def handle_async_request(self, request: httpx.Request) -> httpx.Response:
            return httpx.Response(200, text="NOT_VALID_JSON{")

    async with httpx.AsyncClient(transport=MalformedTransport()) as mock_client:
        text, source = await explain(facts, client=mock_client)
    assert source == "fallback"


@pytest.mark.asyncio
async def test_fallback_results_not_cached_and_gemini_cached(client, db_session):
    """Fallback responses are never cached, while successful gemini responses are cached and capped."""
    rec, _, _, _ = await _seed_test_rec(db_session)
    rec_id_str = str(rec.recommendation_id)

    # 1. When explain yields fallback, CACHE does not store it
    async def mock_fallback_explain(facts, client=None):
        return ("Fallback explanation text.", "fallback")

    with patch("backend.services.explain.gemini.explain", side_effect=mock_fallback_explain):
        res = await client.get(f"/api/recommendations/{rec.recommendation_id}/explanation")
        assert res.status_code == 200
        assert res.json()["source"] == "fallback"
        assert rec_id_str not in CACHE

    # 2. When explain yields gemini, CACHE stores it
    async def mock_gemini_explain(facts, client=None):
        return ("AI explanation text.", "gemini")

    with patch("backend.services.explain.gemini.explain", side_effect=mock_gemini_explain):
        res = await client.get(f"/api/recommendations/{rec.recommendation_id}/explanation")
        assert res.status_code == 200
        assert res.json()["source"] == "gemini"
        assert rec_id_str in CACHE

    # 3. Cache capacity test: exceeds 500 drops oldest
    clear_cache()
    for i in range(505):
        CACHE[f"key_{i}"] = (f"text_{i}", "gemini")
    assert len(CACHE) == 500
    assert "key_0" not in CACHE
    assert "key_4" not in CACHE
    assert "key_5" in CACHE
    assert "key_504" in CACHE


@pytest.mark.asyncio
async def test_output_guards_reject_number_words_four_sentences_and_max_tokens(db_session):
    """Verify stricter output guards reject number words, >3 sentences, and non-STOP finishReason."""
    settings.GEMINI_API_KEY = "fake-key"
    rec, _, _, _ = await _seed_test_rec(db_session)
    facts = await build_facts(db_session, rec)

    # Guard 1: Number word 'ten'
    payload_number_word = {
        "candidates": [
            {
                "finishReason": "STOP",
                "content": {
                    "parts": [{"text": "Transfer ten units from Andheri to Bandra."}]
                },
            }
        ]
    }

    class WordTransport(httpx.AsyncBaseTransport):
        async def handle_async_request(self, request: httpx.Request) -> httpx.Response:
            return httpx.Response(200, json=payload_number_word)

    async with httpx.AsyncClient(transport=WordTransport()) as mock_client:
        text, source = await explain(facts, client=mock_client)
    assert source == "fallback"

    # Guard 2: 4 sentences (split on . ! ?, ignore 2.5)
    payload_4_sentences = {
        "candidates": [
            {
                "finishReason": "STOP",
                "content": {
                    "parts": [{
                        "text": "Bandra is low on stock. Stockout risk is 85%. Demand depletes inventory in 10.0 hours. We recommend transferring 14 units."
                    }]
                },
            }
        ]
    }

    class FourSentenceTransport(httpx.AsyncBaseTransport):
        async def handle_async_request(self, request: httpx.Request) -> httpx.Response:
            return httpx.Response(200, json=payload_4_sentences)

    async with httpx.AsyncClient(transport=FourSentenceTransport()) as mock_client:
        text, source = await explain(facts, client=mock_client)
    assert source == "fallback"

    # Guard 3: finishReason is MAX_TOKENS (cut-off reply)
    payload_max_tokens = {
        "candidates": [
            {
                "finishReason": "MAX_TOKENS",
                "content": {
                    "parts": [{"text": "Transfer 14 units from Dark Store Andheri."}]
                },
            }
        ]
    }

    class MaxTokensTransport(httpx.AsyncBaseTransport):
        async def handle_async_request(self, request: httpx.Request) -> httpx.Response:
            return httpx.Response(200, json=payload_max_tokens)

    async with httpx.AsyncClient(transport=MaxTokensTransport()) as mock_client:
        text, source = await explain(facts, client=mock_client)
    assert source == "fallback"


@pytest.mark.asyncio
async def test_missing_risk_and_inventory_facts_hold_none_and_prompt_omits_zero_units(db_session):
    """When risk row and inventory row are missing, facts hold None and prompt omits '0 units'."""
    settings.GEMINI_API_KEY = "fake-key"
    rec, _, _, _ = await _seed_test_rec(
        db_session,
        with_coords=True,
        with_risk=False,
        with_inventory=False,
    )

    facts = await build_facts(db_session, rec)

    # Missing rows must be None, not 0.0, "none", or 0
    assert facts["risk_probability"] is None
    assert facts["risk_severity"] is None
    assert facts["destination_stock"] is None

    # Capture prompt sent to Gemini HTTP call
    captured_prompt = ""

    class CapturePromptTransport(httpx.AsyncBaseTransport):
        async def handle_async_request(self, request: httpx.Request) -> httpx.Response:
            nonlocal captured_prompt
            body = json.loads(request.read())
            captured_prompt = body["contents"][0]["parts"][0]["text"]
            return httpx.Response(
                200,
                json={"candidates": [{"finishReason": "STOP", "content": {"parts": [{"text": "Transfer 14 units."}]}}]},
            )

    async with httpx.AsyncClient(transport=CapturePromptTransport()) as mock_client:
        await explain(facts, client=mock_client)

    assert "0 units" not in captured_prompt
    assert "destination_stock" not in captured_prompt
    assert "risk_probability" not in captured_prompt
    assert "omitted are unknown and must NOT be guessed" in captured_prompt


@pytest.mark.asyncio
async def test_log_after_forced_failure_does_not_contain_key(caplog, db_session):
    """After a forced failure, safe logging records only exception/code and never leaks the API key."""
    fake_secret_key = "AIzaSyDUMMY_SECRET_KEY_1234567890_NEVER_LEAK"
    settings.GEMINI_API_KEY = fake_secret_key

    rec, _, _, _ = await _seed_test_rec(db_session)
    facts = await build_facts(db_session, rec)

    class ForcedFailureTransport(httpx.AsyncBaseTransport):
        async def handle_async_request(self, request: httpx.Request) -> httpx.Response:
            return httpx.Response(502, text="Bad Gateway")

    with caplog.at_level(logging.WARNING):
        async with httpx.AsyncClient(transport=ForcedFailureTransport()) as mock_client:
            text, source = await explain(facts, client=mock_client)

    assert source == "fallback"
    assert len(caplog.records) > 0

    # Ensure fake key is never present in any logged record
    for record in caplog.records:
        assert fake_secret_key not in record.message
        assert "http" not in record.message.lower() or "http 502" in record.message.lower()
        # Verify log format is restricted to status/exception and rec_id
        assert str(rec.recommendation_id) in record.message
