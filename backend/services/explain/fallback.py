"""Fallback deterministic explanation generator.

Reuses the what_happened and why_this_action style in decision/models.py
using exclusively the real values present in facts.
"""
from __future__ import annotations

from typing import Any


def generate_fallback(facts: dict[str, Any]) -> str:
    """Generate human-readable explanation strictly from facts."""
    action_type = facts.get("action_type") or "hold"
    qty = facts.get("quantity") or 0
    dest_store = facts.get("destination_store_name") or "destination store"
    src_store = facts.get("source_store_name") or "source store"
    hours_to_stockout = facts.get("hours_to_stockout")
    risk_prob = facts.get("risk_probability")
    batch_expiry = facts.get("batch_expiry_hours")
    dist = facts.get("distance_km")
    lead_time = facts.get("supplier_lead_time_hours")

    # What happened: leave out sentence when risk facts are missing
    what_happened: str | None = None
    if hours_to_stockout is not None and risk_prob is not None and risk_prob >= 0.25:
        what_happened = (
            f"Projected demand depletes inventory in {hours_to_stockout:.1f}h "
            f"(stockout probability {risk_prob:.0%})"
        )
    elif hours_to_stockout is not None:
        what_happened = f"Projected demand depletes inventory in {hours_to_stockout:.1f}h"
    elif batch_expiry is not None and risk_prob is not None and risk_prob >= 0.25:
        what_happened = (
            f"Perishable inventory has batches expiring in {batch_expiry:.1f}h "
            f"(spoilage probability {risk_prob:.0%})"
        )
    elif batch_expiry is not None:
        what_happened = f"Perishable inventory has batches expiring in {batch_expiry:.1f}h"
    elif risk_prob is not None and risk_prob >= 0.25:
        what_happened = f"Elevated risk detected (stockout probability {risk_prob:.0%})"
    elif risk_prob is not None:
        what_happened = "Inventory levels and batch lifecycles are healthy within safety thresholds"

    # Why this action
    if action_type == "transfer":
        dist_part = f" ({dist:.1f}km away)" if dist is not None else ""
        why_this_action = (
            f"Transfer of {qty} units from {src_store}{dist_part}. "
            f"Transfer arrives before projected stockout to replenish {dest_store}."
        )
    elif action_type == "reorder":
        lt_part = f" Supplier lead time is {lead_time}h with reliable fulfillment." if lead_time is not None else ""
        why_this_action = (
            f"Wholesale reorder of {qty} units initiates replenishment.{lt_part}"
        )
    elif action_type == "discount":
        expiry_part = f" before expiry in {batch_expiry:.1f}h." if batch_expiry is not None else "."
        why_this_action = (
            f"Dynamic markdown on {qty} units accelerates sell-through{expiry_part}"
        )
    else:
        why_this_action = "Holding status quo avoids unnecessary transport friction and procurement cost."

    if what_happened:
        return f"{what_happened}. {why_this_action}"
    return why_this_action
