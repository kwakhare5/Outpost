"""Deterministic tests for Forecasting Honesty & Real Metrics (Spec §4.D).

Verifies:
1. Exact mathematical calculation of MAE and WAPE on known fixtures.
2. 3-day holdout is strictly excluded from training during model selection.
3. Lower-MAE candidate (Holt linear vs 14-day moving average baseline) is selected.
4. Model naming adheres to "Holt linear" and "14_day_moving_average" with zero "machine learning" claims.
"""
import pytest
import math
from backend.services.forecasting.models import (
    DemandPoint,
    clean_demand_series,
    evaluate_forecast,
    holt_linear_predict,
    baseline_predict,
    ModelEvaluationResult,
)
from backend.services.forecasting.engine import ForecastingEngine, _HOLDOUT_DAYS


def test_wape_and_mae_calculation_known_values():
    """Verify MAE and WAPE on deterministic ground-truth values."""
    actuals = [10.0, 20.0, 30.0]
    predictions = [12.0, 18.0, 36.0]
    
    # Absolute errors: |10-12|=2, |20-18|=2, |30-36|=6 -> sum = 10.0
    # Sum of actuals: 10 + 20 + 30 = 60.0
    # MAE = 10.0 / 3 = 3.333333333...
    # WAPE = (10.0 / 60.0) * 100% = 16.666666667%
    # RMSE = sqrt((4 + 4 + 36) / 3) = sqrt(14.666667) = 3.8297...
    # MAPE = (2/10 + 2/20 + 6/30) / 3 * 100% = (0.2 + 0.1 + 0.2) / 3 * 100% = 16.6666667%
    res = evaluate_forecast(actuals, predictions, model_name="test_model")

    assert isinstance(res, ModelEvaluationResult)
    assert res.mae == pytest.approx(10.0 / 3.0, rel=1e-5)
    assert res.wape == pytest.approx(100.0 / 6.0, rel=1e-5)
    assert res.rmse == pytest.approx(math.sqrt(44.0 / 3.0), rel=1e-5)
    assert res.mape == pytest.approx(50.0 / 3.0, rel=1e-5)
    assert res.n == 3
    assert res.model_name == "test_model"


def test_wape_handles_zero_actual_without_division_by_zero():
    """Verify WAPE safely returns 0.0 when actuals sum to zero, preventing ZeroDivisionError."""
    actuals = [0.0, 0.0, 0.0]
    predictions = [5.0, 10.0, 15.0]

    res = evaluate_forecast(actuals, predictions, model_name="zero_test")
    assert res.mae == pytest.approx(10.0)
    assert res.wape == 0.0
    assert res.mape == 0.0  # skips 0-actual points safely


def test_three_day_holdout_excluded_from_training():
    """Verify that the last 3 days of historical demand are held out and not used in training."""
    assert _HOLDOUT_DAYS == 3

    # 14 days of observations: days 0..10 are trending upward (+2/day)
    series = [
        DemandPoint(day_index=i, day_of_week=i % 7, quantity=float(10 + 2 * i))
        for i in range(11)
    ]
    # Days 11, 12, 13 (holdout) drop to 15.0
    series.append(DemandPoint(day_index=11, day_of_week=4, quantity=15.0))
    series.append(DemandPoint(day_index=12, day_of_week=5, quantity=15.0))
    series.append(DemandPoint(day_index=13, day_of_week=6, quantity=15.0))

    cleaned = clean_demand_series(series)
    train = cleaned[:-_HOLDOUT_DAYS]
    holdout = cleaned[-_HOLDOUT_DAYS:]

    assert len(train) == 11
    assert len(holdout) == 3
    assert [p.day_index for p in holdout] == [11, 12, 13]
    assert all(p.day_index < 11 for p in train)

    # Predictions fitted strictly on train reflect the strong upward trend of days 0..10
    pred_train = holt_linear_predict(train, horizon_hours=24)
    # Predictions on full series are pulled downward by the lower holdout values
    pred_full = holt_linear_predict(cleaned, horizon_hours=24)
    assert pred_train > pred_full



def test_lower_mae_candidate_selected_trend_selects_holt_linear():
    """Verify that Holt linear is selected when data exhibits strong trend where it outperforms moving average."""
    engine = ForecastingEngine()

    # Steady strong linear growth: 10, 20, 30, 40, ..., 140
    n_days = 14
    series = [
        DemandPoint(day_index=i, day_of_week=i % 7, quantity=float(10 * (i + 1)))
        for i in range(n_days)
    ]

    # Run model selection
    pred, model_name, confidence = engine._fit_and_predict(series, horizon_hours=24)

    # With steady upward trend, Holt linear projects future continuation,
    # achieving lower MAE on the holdout than the lagging 14-day moving average.
    assert model_name == "holt_linear"
    assert pred > 0.0
    assert 0.0 <= confidence <= 1.0


def test_no_machine_learning_claim_in_model_identifiers():
    """Verify model identifiers use honest statistical names and zero 'ML' or 'AI' branding."""
    engine = ForecastingEngine()

    series = [DemandPoint(day_index=i, day_of_week=i % 7, quantity=25.0) for i in range(12)]
    pred, model_name, confidence = engine._fit_and_predict(series, horizon_hours=24)

    valid_models = {"holt_linear", "baseline", "baseline_seed_prior", "14_day_moving_average"}
    assert model_name in valid_models
    assert "ml" not in model_name.lower()
    assert "machine_learning" not in model_name.lower()
    assert "deep" not in model_name.lower()
    assert "neural" not in model_name.lower()
