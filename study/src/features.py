"""Identity-free, past-only features for the shelf-day table."""

import numpy as np
import pandas as pd

IDENTITY_COLUMNS = [
    "city_id",
    "store_id",
    "product_id",
    "management_group_id",
    "first_category_id",
    "second_category_id",
    "third_category_id",
]

KEYS = ["store_id", "product_id", "city_id", "dt"]

FEATURE_COLUMNS = [
    "sales_mean_7",
    "sales_mean_14",
    "sales_mean_28",
    "weekday_mean_4w",
    "trend_7v7",
    "empty_days_7",
    "empty_days_14",
    "empty_days_28",
    "empty_rate_14",
    "days_since_empty",
    "empty_same_weekday_1",
    "empty_same_weekday_2",
    "corrected_mean_7",
    "corrected_mean_14",
    "corrected_mean_28",
    "fill_share_7",
    "holiday_flag",
    "activity_flag",
    "discount",
    "precpt",
    "avg_temperature",
    "avg_humidity",
    "avg_wind_level",
]

RAW_COLUMNS = KEYS + [
    "sale_amount",
    "stock_hour6_22_cnt",
    "empty_flag",
    "holiday_flag",
    "activity_flag",
    "discount",
    "precpt",
    "avg_temperature",
    "avg_humidity",
    "avg_wind_level",
]

OPEN_BUCKETS = 16
SINCE_CAP = 28

FEATURE_SPEC = {
    "sales_mean_7": "mean sale_amount over lags 1-7",
    "sales_mean_14": "mean sale_amount over lags 1-14",
    "sales_mean_28": "mean sale_amount over lags 1-28",
    "weekday_mean_4w": "mean non-empty sale_amount on the same weekday over lags 7, 14, 21, 28; fallback to the 28-day non-empty mean, then 0 when the shelf has no non-empty day in 28 days",
    "trend_7v7": "mean non-empty sales lags 1-7 divided by lags 8-14, clipped to [0.5, 2.0], missing becomes 1.0",
    "empty_days_7": "count of empty_flag yes over lags 1-7",
    "empty_days_14": "count of empty_flag yes over lags 1-14",
    "empty_days_28": "count of empty_flag yes over lags 1-28",
    "empty_rate_14": "empty_days_14 divided by 14",
    "days_since_empty": "smallest lag in 1-28 whose empty_flag is yes; 28 when none",
    "empty_same_weekday_1": "1 when empty_flag was yes on the same weekday one week before the target day, else 0",
    "empty_same_weekday_2": "1 when empty_flag was yes on the same weekday two weeks before the target day, else 0",
    "corrected_mean_7": "mean corrected demand over lags 1-7",
    "corrected_mean_14": "mean corrected demand over lags 1-14",
    "corrected_mean_28": "mean corrected demand over lags 1-28",
    "fill_share_7": "mean over lags 1-7 of 1 - stock_hour6_22_cnt / 16",
    "holiday_flag": "decision-day holiday flag",
    "activity_flag": "decision-day activity flag",
    "discount": "decision-day discount rate, 1.0 means no discount",
    "precpt": "decision-day total precipitation",
    "avg_temperature": "decision-day average temperature",
    "avg_humidity": "decision-day average humidity",
    "avg_wind_level": "decision-day average wind force",
}


def build_features(frame: pd.DataFrame, demand_variant: str = "a") -> pd.DataFrame:
    if demand_variant not in ("a", "b", "c"):
        raise ValueError(f"unknown demand variant {demand_variant}")
    frame = frame[RAW_COLUMNS].sort_values(KEYS, kind="stable").reset_index(drop=True)
    shelf_keys = [frame["store_id"], frame["product_id"]]

    empty_yes = frame["empty_flag"].eq("yes").astype(int)
    observed_nonempty = frame["sale_amount"].where(frame["empty_flag"] == "no")

    def shifted(values: pd.Series, steps: int) -> pd.Series:
        return values.groupby(shelf_keys, sort=False).shift(steps)

    def lagged_mean(values: pd.Series, lags) -> pd.Series:
        total = pd.Series(0.0, index=frame.index)
        count = pd.Series(0, index=frame.index)
        for k in lags:
            value = shifted(values, k)
            total = total + value.fillna(0.0)
            count = count + value.notna().astype(int)
        return total / count.replace(0, np.nan)

    def lagged_sum(values: pd.Series, lags) -> pd.Series:
        total = pd.Series(0.0, index=frame.index)
        for k in lags:
            total = total + shifted(values, k).fillna(0.0)
        return total

    sales = frame["sale_amount"]
    week = list(range(1, 8))
    fortnight = list(range(1, 15))
    month = list(range(1, 29))

    ma7 = lagged_mean(observed_nonempty, week)
    ma7_prev = lagged_mean(observed_nonempty, list(range(8, 15)))
    trend = (ma7 / ma7_prev.replace(0, np.nan)).clip(0.5, 2.0).fillna(1.0)

    weekday_values = pd.concat(
        [shifted(observed_nonempty, k) for k in (7, 14, 21, 28)], axis=1
    )
    fallback = lagged_mean(observed_nonempty, month)
    plain_mean = weekday_values.mean(axis=1, skipna=True)
    weekday_filled = plain_mean.fillna(fallback).fillna(0.0)
    if demand_variant == "b":
        weights = pd.Series([0.4, 0.3, 0.2, 0.1], index=weekday_values.columns)
        weighted = weekday_values.fillna(0.0) * weights
        weight_sum = weekday_values.notna().astype(float) * weights
        level_raw = weighted.sum(axis=1) / weight_sum.sum(axis=1).replace(0, np.nan)
    elif demand_variant == "c":
        level_raw = weekday_values.median(axis=1, skipna=True)
    else:
        level_raw = plain_mean
    level = level_raw.fillna(fallback).fillna(0.0)
    estimate = level * trend
    fill_share = 1.0 - frame["stock_hour6_22_cnt"] / OPEN_BUCKETS
    hourly_estimate = sales / fill_share.clip(lower=0.2)
    corrected = pd.Series(
        np.maximum(
            np.maximum(sales.to_numpy(), estimate.to_numpy()),
            hourly_estimate.to_numpy(),
        ),
        index=frame.index,
    ).where(empty_yes == 1, sales)

    since = pd.Series(float(SINCE_CAP), index=frame.index)
    for k in range(SINCE_CAP, 0, -1):
        hit = shifted(empty_yes, k).fillna(0).astype(bool)
        since = since.mask(hit, float(k))

    empty_days_14 = lagged_sum(empty_yes, fortnight)

    out = pd.DataFrame(index=frame.index)
    out["sales_mean_7"] = lagged_mean(sales, week)
    out["sales_mean_14"] = lagged_mean(sales, fortnight)
    out["sales_mean_28"] = lagged_mean(sales, month)
    out["weekday_mean_4w"] = weekday_filled
    out["trend_7v7"] = trend
    out["empty_days_7"] = lagged_sum(empty_yes, week)
    out["empty_days_14"] = empty_days_14
    out["empty_days_28"] = lagged_sum(empty_yes, month)
    out["empty_rate_14"] = empty_days_14 / 14.0
    out["days_since_empty"] = since
    out["empty_same_weekday_1"] = shifted(empty_yes, 6).fillna(0.0)
    out["empty_same_weekday_2"] = shifted(empty_yes, 13).fillna(0.0)
    out["corrected_mean_7"] = lagged_mean(corrected, week)
    out["corrected_mean_14"] = lagged_mean(corrected, fortnight)
    out["corrected_mean_28"] = lagged_mean(corrected, month)
    out["fill_share_7"] = lagged_mean(fill_share, week)
    for column in [
        "holiday_flag",
        "activity_flag",
        "discount",
        "precpt",
        "avg_temperature",
        "avg_humidity",
        "avg_wind_level",
    ]:
        out[column] = frame[column]

    next_flag = frame["empty_flag"].groupby(shelf_keys, sort=False).shift(-1)
    target = pd.Series(np.nan, index=frame.index)
    target[next_flag == "yes"] = 1.0
    target[next_flag == "no"] = 0.0
    out["target_empty_next"] = target
    out["demand_estimate"] = estimate

    out[KEYS] = frame[KEYS]
    return out[KEYS + FEATURE_COLUMNS + ["target_empty_next", "demand_estimate"]]
