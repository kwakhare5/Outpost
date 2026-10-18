"""Gemini LLM explanation service with strict factual guardrails and safe fallback.

Strict prompt rules:
- Plain English for a store manager
- Maximum 3 sentences
- Use ONLY numbers given in facts, no new numbers
Strict verification:
- Every number in generated text must appear in facts
- On timeout, HTTP error, empty reply, missing key, or validation error: return fallback
"""
from __future__ import annotations

import json
import math
import re
from typing import Any

import httpx

from backend.config import settings
from backend.services.explain.fallback import generate_fallback

# In-memory dict cache keyed by recommendation_id (as string)
# Stores (text, source) tuples for successful gemini results
CACHE: dict[str, tuple[str, str]] = {}


def clear_cache() -> None:
    """Clear in-memory cache (primarily for tests)."""
    CACHE.clear()


def get_allowed_numbers(facts: dict[str, Any]) -> set[float]:
    """Collect all valid numbers present in the facts dictionary."""
    allowed: set[float] = set()
    for _, v in facts.items():
        if isinstance(v, (int, float)) and v is not None:
            val = float(v)
            allowed.add(round(val, 4))
            if val.is_integer():
                allowed.add(float(int(val)))
            if 0.0 <= val <= 1.0:
                allowed.add(round(val * 100, 2))
                allowed.add(round(val * 100, 1))
                allowed.add(float(round(val * 100)))
        elif isinstance(v, str):
            for match in re.findall(r"\d+(?:\.\d+)?", v):
                try:
                    num_val = float(match)
                    allowed.add(round(num_val, 4))
                    if num_val.is_integer():
                        allowed.add(float(int(num_val)))
                except ValueError:
                    pass
    return allowed


def extract_numbers_from_text(text: str) -> list[float]:
    """Extract all individual numbers found in text."""
    cleaned = re.sub(r"(?<=\d),(?=\d)", "", text)
    matches = re.findall(r"\b\d+(?:\.\d+)?\b", cleaned)
    nums: list[float] = []
    for m in matches:
        try:
            nums.append(float(m))
        except ValueError:
            pass
    return nums


def validate_numbers(text: str, facts: dict[str, Any]) -> bool:
    """Verify that every number in text exists in the facts."""
    allowed = get_allowed_numbers(facts)
    found_nums = extract_numbers_from_text(text)
    for num in found_nums:
        if not any(math.isclose(num, a, abs_tol=1e-3) for a in allowed):
            return False
    return True


async def explain(
    facts: dict[str, Any],
    client: httpx.AsyncClient | None = None,
) -> tuple[str, str]:
    """Generate natural language explanation for facts using Gemini with safe fallback.

    Returns:
        (text, source) where source is 'gemini' or 'fallback'.
    """
    api_key = settings.GEMINI_API_KEY
    if not api_key:
        return (generate_fallback(facts), "fallback")

    prompt = (
        "You are an inventory replenishment assistant explaining a decision to a store manager.\n"
        "Rules:\n"
        "1. Write in plain English for a store manager.\n"
        "2. Maximum 3 sentences.\n"
        "3. Use ONLY the numbers given in the facts below. Do NOT introduce or assume any new numbers, percentages, or estimates.\n\n"
        f"Facts:\n{json.dumps(facts, indent=2, default=str)}\n\n"
        "Explanation:"
    )

    timeout = float(settings.GEMINI_TIMEOUT_SECONDS)
    payload = {
        "contents": [
            {
                "parts": [{"text": prompt}]
            }
        ],
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": 256,
        },
    }

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.GEMINI_MODEL}:generateContent"

    try:
        if client is not None:
            res = await client.post(
                url,
                headers={"x-goog-api-key": api_key, "Content-Type": "application/json"},
                json=payload,
            )
        else:
            async with httpx.AsyncClient(timeout=timeout) as async_client:
                res = await async_client.post(
                    url,
                    headers={"x-goog-api-key": api_key, "Content-Type": "application/json"},
                    json=payload,
                )

        if res.status_code != 200:
            return (generate_fallback(facts), "fallback")

        data = res.json()
        candidates = data.get("candidates", [])
        if not candidates:
            return (generate_fallback(facts), "fallback")

        parts = candidates[0].get("content", {}).get("parts", [])
        if not parts or not parts[0].get("text"):
            return (generate_fallback(facts), "fallback")

        text = parts[0]["text"].strip()
        if not text:
            return (generate_fallback(facts), "fallback")

        if not validate_numbers(text, facts):
            return (generate_fallback(facts), "fallback")

        return (text, "gemini")

    except Exception:
        return (generate_fallback(facts), "fallback")
