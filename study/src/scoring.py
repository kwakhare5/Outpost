"""Shared scoring helpers: simple rule, top-budget alerts, budget metrics."""

import pandas as pd

TOP_BUDGET = 20


def add_baseline_columns(frame: pd.DataFrame) -> pd.DataFrame:
    keys = [frame["store_id"], frame["product_id"]]
    yes = frame["empty_flag"].eq("yes").astype(int)

    def shifted(values, steps):
        return values.groupby(keys, sort=False).shift(steps)

    hours_14 = sum(
        shifted(frame["stock_hour6_22_cnt"], k).fillna(0.0) for k in range(1, 15)
    )
    return frame.assign(
        next_yes=shifted(yes, -1),
        rule=shifted(yes, 6).fillna(0).astype(bool)
        | shifted(yes, 13).fillna(0).astype(bool),
        hours_14=hours_14,
        lazy_guess=shifted(frame["sale_amount"], 7),
        next_buckets=shifted(frame["stock_hour6_22_cnt"], -1),
    )


def top_alerts(
    scored: pd.DataFrame, score_column: str, budget: int = TOP_BUDGET
) -> pd.DataFrame:
    rows = []
    for _, day_rows in scored.groupby("dt", sort=True):
        if score_column == "rule":
            candidates = day_rows[day_rows["rule"]]
            rank_column = "hours_14"
        else:
            candidates = day_rows
            rank_column = score_column
        ranked = candidates.sort_values(
            [rank_column, "store_id", "product_id"],
            ascending=[False, True, True],
        )
        rows.append(ranked.head(budget))
    return pd.concat(rows, ignore_index=True)


def budget_metrics(alerts: pd.DataFrame, scored: pd.DataFrame) -> dict:
    hits = int(alerts["next_yes"].sum())
    empties = int(scored["next_yes"].sum())
    return {
        "catch_rate": hits / empties,
        "false_alarm_rate": (len(alerts) - hits) / len(alerts),
        "alerts": len(alerts),
        "hits": hits,
        "empty_shelves": empties,
    }
