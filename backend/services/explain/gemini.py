"""Gemini LLM explanation service with strict factual guardrails and safe fallback.

Strict prompt rules:
- Plain English for a store manager
- Maximum 3 sentences
- Use ONLY numbers given in facts, no new numbers
- Omitted facts are unknown and must not be guessed
Strict verification:
- Every number in generated text must appear in facts
- Reject number words (one..twenty, thirty, forty, fifty, hundred, thousand, dozen, half, double, twice, triple)
- Reject replies with > 3 sentences (split on .!?, ignoring decimals)
- Reject replies where candidates[0].finishReason != 'STOP'
- On timeout, non-200, malformed JSON, empty reply, or validation error: log safely and return fallback
- Safe logging: warning with ONLY exception class name or HTTP status code and recommendation_id
"""
from __future__ import annotations

import json
import logging
import math
import re
from collections import OrderedDict
from typing import Any

import httpx

from backend.config import settings
from backend.services.explain.fallback import generate_fallback

logger = logging.getLogger(__name__)

# Capped in-memory cache (max 500 entries, FIFO eviction)
class CappedCache(OrderedDict):
    MAX_SIZE = 500

    def __setitem__(self, key: str, value: tuple[str, str]) -> None:
        if len(self) >= self.MAX_SIZE and key not in self:
            self.popitem(last=False)
        super().__setitem__(key, value)


CACHE: CappedCache = CappedCache()


def clear_cache() -> None:
    """Clear in-memory cache (primarily for tests)."""
    CACHE.clear()


# Number words to reject (whole words, case-insensitive)
NUMBER_WORDS = {
    "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
    "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty",
    "thirty", "forty", "fifty", "hundred", "thousand", "dozen", "half", "double", "twice", "triple",
}
NUMBER_WORDS_PATTERN = re.compile(r"\b(" + "|".join(NUMBER_WORDS) + r")\b", re.IGNORECASE)


def contains_number_words(text: str) -> bool:
    """Check if text contains any forbidden number words."""
    return bool(NUMBER_WORDS_PATTERN.search(text))


def count_sentences(text: str) -> int:
    """Count sentences splitting on . ! ?, ignoring decimal points like 2.5."""
    # Mask decimal points between digits (e.g. 2.5 -> 25)
    masked = re.sub(r"(?<=\d)\.(?=\d)", "", text)
    # Split on terminal punctuation
    sentences = [s.strip() for s in re.split(r"[.!?]+", masked) if s.strip()]
    return len(sentences)


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
    rec_id = str(facts.get("recommendation_id") or "")

    api_key = settings.GEMINI_API_KEY
    if not api_key:
        return (generate_fallback(facts), "fallback")

    # Leave None fields out of the prompt (unknowns must not be guessed)
    clean_facts = {
        k: v for k, v in facts.items()
        if v is not None and k != "recommendation_id"
    }

    prompt = (
        "You are an inventory replenishment assistant explaining a decision to a store manager.\n"
        "Rules:\n"
        "1. Write in plain English for a store manager.\n"
        "2. Maximum 3 sentences.\n"
        "3. Use ONLY the numbers given in the facts below. Do NOT introduce or assume any new numbers, percentages, or estimates.\n"
        "4. Any facts omitted are unknown and must NOT be guessed, assumed, or mentioned.\n\n"
        f"Facts:\n{json.dumps(clean_facts, indent=2, default=str)}\n\n"
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
            "maxOutputTokens": 512,
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
            logger.warning("HTTP %s for %s", res.status_code, rec_id)
            return (generate_fallback(facts), "fallback")

        try:
            data = res.json()
        except Exception as exc:
            logger.warning("%s for %s", type(exc).__name__, rec_id)
            return (generate_fallback(facts), "fallback")

        candidates = data.get("candidates", [])
        if not candidates:
            logger.warning("ValueError for %s", rec_id)
            return (generate_fallback(facts), "fallback")

        candidate = candidates[0]
        finish_reason = candidate.get("finishReason")
        if finish_reason != "STOP":
            logger.warning("FinishReasonError for %s", rec_id)
            return (generate_fallback(facts), "fallback")

        parts = candidate.get("content", {}).get("parts", [])
        if not parts or not parts[0].get("text"):
            logger.warning("ValueError for %s", rec_id)
            return (generate_fallback(facts), "fallback")

        text = parts[0]["text"].strip()
        if not text:
            logger.warning("ValueError for %s", rec_id)
            return (generate_fallback(facts), "fallback")

        # Guard 1: Reject number words
        if contains_number_words(text):
            logger.warning("NumberWordError for %s", rec_id)
            return (generate_fallback(facts), "fallback")

        # Guard 2: Reject > 3 sentences
        if count_sentences(text) > 3:
            logger.warning("SentenceCountError for %s", rec_id)
            return (generate_fallback(facts), "fallback")

        # Guard 3: Validate every number in text exists in facts
        if not validate_numbers(text, facts):
            logger.warning("NumberValidationError for %s", rec_id)
            return (generate_fallback(facts), "fallback")

        return (text, "gemini")

    except Exception as exc:
        logger.warning("%s for %s", type(exc).__name__, rec_id)
        return (generate_fallback(facts), "fallback")
