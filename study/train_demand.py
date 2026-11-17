"""Score the demand correction against the lazy guess on the unseen cities."""

import json
import sys
from pathlib import Path

import pyarrow.parquet as pq

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(Path(__file__).resolve().parent / "src"))

from features import RAW_COLUMNS, build_features  # noqa: E402
from scoring import add_baseline_columns  # noqa: E402

SHELF = ROOT / "study" / "data" / "shelf_day.parquet"
SPLIT = ROOT / "study" / "artifacts" / "split.json"
OUT = ROOT / "study" / "artifacts" / "demand.json"
KEYS = ["store_id", "product_id", "city_id", "dt"]


def main():
    split = json.loads(SPLIT.read_text(encoding="utf-8"))

    raw = (
        pq.read_table(SHELF, columns=RAW_COLUMNS)
        .to_pandas()
        .sort_values(KEYS, kind="stable")
        .reset_index(drop=True)
    )
    raw = add_baseline_columns(raw)
    features = build_features(raw)
    assert (features["store_id"].to_numpy() == raw["store_id"].to_numpy()).all()
    assert (features["dt"].to_numpy() == raw["dt"].to_numpy()).all()
    features["sale_amount"] = raw["sale_amount"].to_numpy()
    features["lazy_guess"] = raw["lazy_guess"].to_numpy()

    mask = (
        features["city_id"].isin(split["test_cities"])
        & (features["dt"] >= split["holdout_start"])
        & (raw["empty_flag"] == "no")
        & features["demand_estimate"].notna()
        & features["lazy_guess"].notna()
    )
    scored = features[mask]
    miss_corrected = float(
        (scored["sale_amount"] - scored["demand_estimate"]).abs().mean()
    )
    miss_lazy = float((scored["sale_amount"] - scored["lazy_guess"]).abs().mean())

    record = {
        "cities": split["test_cities"],
        "scored_rows": int(len(scored)),
        "days": int(scored["dt"].nunique()),
        "avg_miss_corrected": round(miss_corrected, 6),
        "avg_miss_lazy": round(miss_lazy, 6),
        "relative_gain": round(1 - miss_corrected / miss_lazy, 6),
        "definitions": {
            "scored_rows": "non-empty shelf-days in the 3 test cities' holdout",
            "avg_miss_corrected": "mean |observed sales - past-only weekday level times trend|",
            "avg_miss_lazy": "mean |observed sales - same weekday last week|",
        },
    }
    OUT.write_text(json.dumps(record, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(record, indent=2))
    print("recorded study/artifacts/demand.json")


if __name__ == "__main__":
    main()
