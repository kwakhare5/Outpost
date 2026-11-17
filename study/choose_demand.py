"""Choose the demand estimator on the 15 training cities before scoring."""

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
OUT = ROOT / "study" / "artifacts" / "demand_choice.json"
KEYS = ["store_id", "product_id", "city_id", "dt"]
VARIANTS = ("a", "b", "c")


def main():
    split = json.loads(SPLIT.read_text(encoding="utf-8"))
    raw = (
        pq.read_table(SHELF, columns=RAW_COLUMNS)
        .to_pandas()
        .sort_values(KEYS, kind="stable")
        .reset_index(drop=True)
    )
    raw = raw[raw["city_id"].isin(split["train_cities"])].reset_index(drop=True)
    raw = add_baseline_columns(raw)

    results = {}
    for variant in VARIANTS:
        features = build_features(raw, demand_variant=variant)
        assert (features["store_id"].to_numpy() == raw["store_id"].to_numpy()).all()
        mask = (
            (features["dt"] < split["holdout_start"]).to_numpy()
            & (raw["empty_flag"] == "no").to_numpy()
            & features["demand_estimate"].notna().to_numpy()
            & raw["lazy_guess"].notna().to_numpy()
        )
        miss = (
            raw["sale_amount"].to_numpy()[mask]
            - features["demand_estimate"].to_numpy()[mask]
        )
        results[variant] = {
            "avg_miss_train": round(float(abs(miss).mean()), 6),
            "rows": int(mask.sum()),
        }
        print(f"variant {variant}: training miss {results[variant]['avg_miss_train']}")

    winner = min(results, key=lambda variant: results[variant]["avg_miss_train"])
    record = {
        "winner": winner,
        "candidates": results,
        "chosen_on": "15 training cities, pre-holdout non-empty days",
        "note": "Frozen before the Round 2 test cities are scored.",
    }
    OUT.write_text(json.dumps(record, indent=2) + "\n", encoding="utf-8")
    print(f"winner: {winner}")
    print("recorded study/artifacts/demand_choice.json")


if __name__ == "__main__":
    main()
