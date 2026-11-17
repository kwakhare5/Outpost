"""Feature checks: identity-free, past-only, correct target, real correction."""

import numpy as np
import pandas as pd

from features import FEATURE_COLUMNS, FEATURE_SPEC, IDENTITY_COLUMNS, build_features

SHELVES = ((1, 101), (1, 102))
DAYS = 40


def make_frame(days=DAYS):
    rng = np.random.default_rng(7)
    start = pd.Timestamp("2024-01-01")
    rows = []
    for store, product in SHELVES:
        for day in range(days):
            empty = day % 11 == 0
            rows.append(
                {
                    "city_id": 3,
                    "store_id": store,
                    "product_id": product,
                    "dt": (start + pd.Timedelta(days=day)).strftime("%Y-%m-%d"),
                    "sale_amount": float(rng.integers(0, 20)),
                    "stock_hour6_22_cnt": 5 if empty else 0,
                    "empty_flag": "yes" if empty else "no",
                    "holiday_flag": int(day % 7 == 0),
                    "activity_flag": int(day % 5 == 0),
                    "discount": 1.0 if day % 3 else 0.9,
                    "precpt": 0.0,
                    "avg_temperature": 20.0,
                    "avg_humidity": 70.0,
                    "avg_wind_level": 1.5,
                }
            )
    return pd.DataFrame(rows)


def test_identity_columns_never_used_as_features():
    assert set(FEATURE_COLUMNS) == set(FEATURE_SPEC)
    assert len(FEATURE_COLUMNS) == len(set(FEATURE_COLUMNS))
    assert not set(FEATURE_COLUMNS) & set(IDENTITY_COLUMNS)


def test_future_change_does_not_change_past_features():
    frame = make_frame()
    changed = frame.copy()
    mutation = (
        (changed["store_id"] == 1)
        & (changed["product_id"] == 101)
        & (changed["dt"] == "2024-01-31")
    )
    changed.loc[mutation, "sale_amount"] += 500.0
    changed.loc[mutation, "stock_hour6_22_cnt"] = 16
    changed.loc[mutation, "empty_flag"] = "yes"

    base = build_features(frame)
    after = build_features(changed)

    not_future = base["dt"] <= "2024-01-31"
    pd.testing.assert_frame_equal(
        base.loc[not_future, FEATURE_COLUMNS],
        after.loc[not_future, FEATURE_COLUMNS],
    )
    other_shelf = (base["store_id"] == 1) & (base["product_id"] == 102)
    pd.testing.assert_frame_equal(
        base.loc[other_shelf, FEATURE_COLUMNS],
        after.loc[other_shelf, FEATURE_COLUMNS],
    )
    future = (
        (base["dt"] > "2024-01-31")
        & (base["store_id"] == 1)
        & (base["product_id"] == 101)
    )
    assert not base.loc[future, FEATURE_COLUMNS].equals(
        after.loc[future, FEATURE_COLUMNS]
    )


def test_target_is_next_day_empty():
    features = build_features(make_frame())
    shelf = features[(features["store_id"] == 1) & (features["product_id"] == 101)]
    shelf = shelf.reset_index(drop=True)
    for day in range(DAYS - 1):
        expected = float(day + 1) % 11 == 0
        assert shelf.loc[day, "target_empty_next"] == float(expected)
    assert np.isnan(shelf.loc[DAYS - 1, "target_empty_next"])


def test_correction_lifts_a_censored_day():
    frame = make_frame()
    shelf = (frame["store_id"] == 1) & (frame["product_id"] == 102)
    rows = frame.index[shelf]
    frame.loc[rows[:35], "sale_amount"] = 10.0
    empty_day = rows[35]
    frame.loc[empty_day, "sale_amount"] = 2.0
    frame.loc[empty_day, "empty_flag"] = "yes"
    frame.loc[empty_day, "stock_hour6_22_cnt"] = 8

    features = build_features(frame)
    after = features[
        (features["store_id"] == 1)
        & (features["product_id"] == 102)
        & (features["dt"] == "2024-02-06")
    ]
    assert len(after) == 1
    row = after.iloc[0]
    assert row["corrected_mean_7"] > row["sales_mean_7"] + 0.5


def test_corrected_means_never_below_observed_means():
    features = build_features(make_frame()).dropna()
    assert (features["corrected_mean_7"] >= features["sales_mean_7"]).all()
    assert (features["corrected_mean_28"] >= features["sales_mean_28"]).all()


def test_all_demand_variants_run_and_stay_honest():
    for variant in ("a", "b", "c"):
        features = build_features(make_frame(), demand_variant=variant).dropna()
        assert (features["corrected_mean_7"] >= features["sales_mean_7"]).all()
        assert features["demand_estimate"].notna().all()


def test_features_finite_after_warmup():
    features = build_features(make_frame())
    warm = features[features["dt"] >= "2024-01-29"]
    assert not warm[FEATURE_COLUMNS].isna().any().any()
