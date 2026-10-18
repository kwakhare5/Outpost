"""Explain package for human-understandable inventory decision explanations.

Strict isolation: This package is only imported by the recommendations explanation API endpoint.
It is never imported by decision engine, simulation engine, or agents.
"""
from backend.services.explain.facts import build_facts
from backend.services.explain.fallback import generate_fallback
from backend.services.explain.gemini import CACHE, clear_cache, explain

__all__ = ["build_facts", "generate_fallback", "explain", "CACHE", "clear_cache"]
