"""Export 100 frozen rows with Python features and expected warning scores."""

import json
import sys
from pathlib import Path

import numpy as np
import pyarrow.parquet as pq

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(Path(__file__).resolve().parent / "src"))

from features import FEATURE_COLUMNS, RAW_COLUMNS, build_features  # noqa: E402

SHELF = ROOT / "study" / "data" / "shelf_day.parquet"
SPLIT = ROOT / "study" / "artifacts" / "split.json"
MODEL = ROOT / "study" / "artifacts" / "model.json"
OUT = ROOT / "study" / "artifacts" / "parity_fixture.json"
FIXTURE_DAY = "2024-06-10"
FIXTURE_SHELVES = 100


def main():
    split = json.loads(SPLIT.read_text(encoding="utf-8"))
    model = json.loads(MODEL.read_text(encoding="utf-8"))

    raw = pq.read_table(SHELF, columns=RAW_COLUMNS).to_pandas()
    test_city = raw[raw["city_id"].isin(split["test_cities"])]
    picks = (
        test_city[["store_id", "product_id"]]
        .drop_duplicates()
        .sort_values(["store_id", "product_id"])
        .head(FIXTURE_SHELVES)
    )
    subset = raw.merge(picks, on=["store_id", "product_id"], how="inner")
    features = build_features(subset)

    day = features[features["dt"] == FIXTURE_DAY].sort_values(
        ["store_id", "product_id"]
    )
    assert len(day) == FIXTURE_SHELVES, f"{len(day)} rows for {FIXTURE_DAY}"

    mean = np.array(model["mean"])
    scale = np.array(model["scale"])
    coefficients = np.array(model["coefficients"])
    x = day[FEATURE_COLUMNS].to_numpy()
    scores = 1 / (1 + np.exp(-(((x - mean) / scale) @ coefficients + model["intercept"])))

    rows = []
    for (_, row), score in zip(day.iterrows(), scores):
        rows.append(
            {
                "store_id": int(row["store_id"]),
                "product_id": int(row["product_id"]),
                "city_id": int(row["city_id"]),
                "dt": row["dt"],
                "features": {name: float(row[name]) for name in FEATURE_COLUMNS},
                "warning_score": float(score),
            }
        )

    fixture = {
        "model_version": model["version"],
        "feature_order": FEATURE_COLUMNS,
        "tolerance": 1e-9,
        "rows": rows,
    }
    OUT.write_text(json.dumps(fixture, indent=2) + "\n", encoding="utf-8")
    print(f"rows: {len(rows)}")
    print(f"features per row: {len(FEATURE_COLUMNS)}")
    print(f"score range: {min(scores):.6f} to {max(scores):.6f}")
    print("recorded study/artifacts/parity_fixture.json")


if __name__ == "__main__":
    main()
