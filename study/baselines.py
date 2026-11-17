"""Score the simple rule and the lazy demand guess on the held-out cities."""

import json
import sys
from pathlib import Path

import pyarrow.parquet as pq

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(Path(__file__).resolve().parent / "src"))

from scoring import add_baseline_columns, budget_metrics, top_alerts  # noqa: E402

SHELF = ROOT / "study" / "data" / "shelf_day.parquet"
SPLIT = ROOT / "study" / "artifacts" / "split.json"
OUT = ROOT / "study" / "artifacts" / "baselines.json"
COLUMNS = [
    "store_id",
    "product_id",
    "city_id",
    "dt",
    "sale_amount",
    "stock_hour6_22_cnt",
    "empty_flag",
]


def main():
    split = json.loads(SPLIT.read_text(encoding="utf-8"))
    frame = (
        pq.read_table(SHELF, columns=COLUMNS)
        .to_pandas()
        .sort_values(["store_id", "product_id", "dt"], kind="stable")
        .reset_index(drop=True)
    )
    frame = add_baseline_columns(frame)

    test = frame["city_id"].isin(split["test_cities"])
    scored_mask = (
        test
        & (frame["dt"] >= split["holdout_start"])
        & (frame["dt"] < split["last_day"])
    )
    scored = frame[scored_mask]
    alerts = top_alerts(scored, "rule")
    rule = budget_metrics(alerts, scored)

    demand_mask = test & (frame["dt"] >= split["holdout_start"])
    demand = frame[demand_mask]
    nonempty = demand[(demand["empty_flag"] == "no") & demand["lazy_guess"].notna()]
    avg_miss = float((nonempty["sale_amount"] - nonempty["lazy_guess"]).abs().mean())

    days = sorted(scored["dt"].unique())
    record = {
        "cities": split["test_cities"],
        "scored_days": {"start": days[0], "end": days[-1], "count": len(days)},
        "scored_rows": int(len(scored)),
        "rows_per_city": {
            str(city): int(count) for city, count in scored.groupby("city_id").size().items()
        },
        "top_budget": 20,
        "simple_rule": {
            "catch_rate": round(rule["catch_rate"], 6),
            "false_alarm_rate": round(rule["false_alarm_rate"], 6),
            "alerts": rule["alerts"],
            "hits": rule["hits"],
            "empty_shelves": rule["empty_shelves"],
        },
        "lazy_demand": {
            "avg_miss": round(avg_miss, 6),
            "scored_rows": int(len(nonempty)),
        },
        "definitions": {
            "catch_rate": "share of shelves empty the next day that were in the top-20 alert set",
            "false_alarm_rate": "share of top-20 alerts whose shelf was not empty the next day",
            "rule": "alert when the shelf was empty on the same weekday one or two weeks before the target day; rank by stockout buckets in the last 14 days",
            "lazy_guess": "observed sales on the same weekday one week earlier",
        },
    }
    OUT.write_text(json.dumps(record, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(record, indent=2))
    print("recorded study/artifacts/baselines.json")


if __name__ == "__main__":
    main()
