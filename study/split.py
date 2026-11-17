"""Pick 3 test cities with a frozen seed and mark each city's last 30 days."""

import argparse
import json
import random
import secrets
from datetime import datetime, timezone
from pathlib import Path

import pyarrow.parquet as pq

ROOT = Path(__file__).resolve().parents[1]
SHELF = ROOT / "study" / "data" / "shelf_day.parquet"
SPLIT = ROOT / "study" / "artifacts" / "split.json"
HOLDOUT_DAYS = 30
TEST_CITIES = 3
TRAIN_CITIES = 15


def freeze(seed):
    table = pq.read_table(SHELF, columns=["city_id", "dt"])
    cities = sorted(table.column("city_id").unique().to_pylist())
    days = sorted(table.column("dt").unique().to_pylist())
    rng = random.Random(seed)
    test = sorted(rng.sample(cities, TEST_CITIES))
    train = [city for city in cities if city not in test]
    return {
        "seed": seed,
        "drawn_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "test_cities": test,
        "train_cities": train,
        "holdout_days": HOLDOUT_DAYS,
        "holdout_start": days[-HOLDOUT_DAYS],
        "last_day": days[-1],
        "days_total": len(days),
        "note": "Frozen before scoring. Do not redraw after seeing results.",
    }


def summarize(record):
    print(f"seed: {record['seed']}")
    print(f"train cities: {len(record['train_cities'])}")
    print(f"test cities: {len(record['test_cities'])} {record['test_cities']}")
    print(
        f"holdout: {record['holdout_start']} to {record['last_day']} "
        f"({record['holdout_days']} days per city)"
    )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--seed", type=int)
    args = parser.parse_args()

    if SPLIT.exists():
        recorded = json.loads(SPLIT.read_text(encoding="utf-8"))
        if args.seed is not None and args.seed != recorded["seed"]:
            raise SystemExit(
                f"split.json is frozen with seed {recorded['seed']}; refusing {args.seed}"
            )
        table = pq.read_table(SHELF, columns=["city_id", "dt"])
        cities = sorted(table.column("city_id").unique().to_pylist())
        days = sorted(table.column("dt").unique().to_pylist())
        recorded_cities = sorted(recorded["train_cities"] + recorded["test_cities"])
        if (
            recorded_cities != cities
            or recorded["holdout_start"] != days[-HOLDOUT_DAYS]
            or recorded["last_day"] != days[-1]
        ):
            raise SystemExit("split.json does not match the current shelf table")
        summarize(recorded)
        print("split already frozen; nothing changed")
        return

    seed = args.seed if args.seed is not None else secrets.randbelow(1_000_000)
    record = freeze(seed)
    valid = (
        len(record["train_cities"]) == TRAIN_CITIES
        and len(record["test_cities"]) == TEST_CITIES
        and not set(record["train_cities"]) & set(record["test_cities"])
    )
    if not valid:
        raise SystemExit("split counts invalid")
    SPLIT.write_text(json.dumps(record, indent=2) + "\n", encoding="utf-8")
    summarize(record)
    print("recorded study/artifacts/split.json")


if __name__ == "__main__":
    main()
