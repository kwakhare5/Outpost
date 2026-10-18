"""Outpost Metrics Module (Spec Section 5, Phase 2 Step 2).

Computes the four canonical metrics:
1. Lost sales units
2. Waste units
3. Rupee loss
4. Availability percent
along with the synthetic rupee price assumption.
"""
from backend.services.metrics.calculator import (
    RUPEE_PRICE_ASSUMPTION,
    SimulationMetrics,
    compute_simulation_metrics,
)

__all__ = [
    "RUPEE_PRICE_ASSUMPTION",
    "SimulationMetrics",
    "compute_simulation_metrics",
]
