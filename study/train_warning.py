"""Train the learned warning on 15 cities and score the 3 unseen cities."""

import json
import sys
from pathlib import Path

import pyarrow.parquet as pq
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(Path(__file__).resolve().parent / "src"))

from features import FEATURE_COLUMNS, RAW_COLUMNS, build_features  # noqa: E402
from scoring import add_baseline_columns, budget_metrics, top_alerts  # noqa: E402

SHELF = ROOT / "study" / "data" / "shelf_day.parquet"
SPLIT = ROOT / "study" / "artifacts" / "split.json"
OUT = ROOT / "study" / "artifacts" / "warning.json"
MODEL = ROOT / "study" / "artifacts" / "model.json"
KEYS = ["store_id", "product_id", "city_id", "dt"]
CORRECTED_FEATURES = ["corrected_mean_7", "corrected_mean_14", "corrected_mean_28"]
BUDGETS = {"top20": 20, "top50": 50, "top100": 100}
PRIMARY_BUDGET = 20


def fit(train, columns):
    model = make_pipeline(
        StandardScaler(),
        LogisticRegression(class_weight="balanced", max_iter=2000),
    )
    model.fit(train[columns], train["target_empty_next"])
    return model


def day_sets(alerts):
    return {
        day: sorted(zip(rows["store_id"].tolist(), rows["product_id"].tolist()))
        for day, rows in alerts.groupby("dt", sort=True)
    }


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
    assert (features["product_id"].to_numpy() == raw["product_id"].to_numpy()).all()
    assert (features["dt"].to_numpy() == raw["dt"].to_numpy()).all()
    features["rule"] = raw["rule"].to_numpy()
    features["hours_14"] = raw["hours_14"].to_numpy()
    features["next_yes"] = raw["next_yes"].to_numpy()
    features["next_buckets"] = raw["next_buckets"].to_numpy()

    complete = features[FEATURE_COLUMNS].notna().all(axis=1)
    train_mask = (
        features["city_id"].isin(split["train_cities"])
        & (features["dt"] < split["holdout_start"])
        & features["target_empty_next"].notna()
        & complete
    )
    test_mask = (
        features["city_id"].isin(split["test_cities"])
        & (features["dt"] >= split["holdout_start"])
        & (features["dt"] < split["last_day"])
    )
    assert complete[test_mask].all()

    train = features[train_mask]
    test = features[test_mask].copy()

    model = fit(train, FEATURE_COLUMNS)
    observed_only = [column for column in FEATURE_COLUMNS if column not in CORRECTED_FEATURES]
    model_uncorrected = fit(train, observed_only)

    test["score_learned"] = model.predict_proba(test[FEATURE_COLUMNS])[:, 1]
    test["score_uncorrected"] = model_uncorrected.predict_proba(test[observed_only])[:, 1]

    rule = budget_metrics(top_alerts(test, "rule", PRIMARY_BUDGET), test)
    learned = budget_metrics(top_alerts(test, "score_learned", PRIMARY_BUDGET), test)
    uncorrected = budget_metrics(
        top_alerts(test, "score_uncorrected", PRIMARY_BUDGET), test
    )

    sensitivity = {}
    for name, budget in BUDGETS.items():
        sensitivity[name] = {
            "rule": budget_metrics(top_alerts(test, "rule", budget), test),
            "learned": budget_metrics(top_alerts(test, "score_learned", budget), test),
        }

    scored2 = test.assign(next_yes=(test["next_buckets"] >= 2).astype(float))
    two_plus = {
        "rule": budget_metrics(top_alerts(scored2, "rule", PRIMARY_BUDGET), scored2),
        "learned": budget_metrics(
            top_alerts(scored2, "score_learned", PRIMARY_BUDGET), scored2
        ),
    }

    sets_learned = day_sets(top_alerts(test, "score_learned", PRIMARY_BUDGET))
    sets_uncorrected = day_sets(
        top_alerts(test, "score_uncorrected", PRIMARY_BUDGET)
    )
    changed = sum(
        1 for day, shelves in sets_learned.items() if shelves != sets_uncorrected.get(day)
    )
    days = len(sets_learned)

    scaler = model.named_steps["standardscaler"]
    lr = model.named_steps["logisticregression"]
    model_record = {
        "type": "logistic_regression",
        "version": "0.1.0",
        "features": FEATURE_COLUMNS,
        "mean": [float(value) for value in scaler.mean_],
        "scale": [float(value) for value in scaler.scale_],
        "coefficients": [float(value) for value in lr.coef_[0]],
        "intercept": float(lr.intercept_[0]),
        "class_weight": "balanced",
        "trained_cities": split["train_cities"],
        "test_cities": split["test_cities"],
        "train_rows": int(len(train)),
    }
    MODEL.write_text(json.dumps(model_record, indent=2) + "\n", encoding="utf-8")

    record = {
        "budget": PRIMARY_BUDGET,
        "train": {
            "rows": int(len(train)),
            "cities": len(split["train_cities"]),
            "days_before_holdout": int(train["dt"].nunique()),
        },
        "test": {
            "rows": int(len(test)),
            "days": days,
            "cities": split["test_cities"],
        },
        "learned": learned,
        "rule": rule,
        "uncorrected": uncorrected,
        "sensitivity": sensitivity,
        "two_plus_empty_buckets": two_plus,
        "materiality": {
            "changed_days": changed,
            "scored_days": days,
            "share": changed / days,
        },
        "day_sets": {
            "learned": {
                day: [list(pair) for pair in shelves]
                for day, shelves in sets_learned.items()
            },
            "uncorrected": {
                day: [list(pair) for pair in shelves]
                for day, shelves in sets_uncorrected.items()
            },
        },
    }
    OUT.write_text(json.dumps(record, indent=2) + "\n", encoding="utf-8")

    print(f"train rows: {len(train):,} over {train['dt'].nunique()} days")
    print(f"test rows: {len(test):,} over {days} days")
    print(
        f"learned top20: catch {learned['catch_rate']:.3%}, "
        f"false alarms {learned['false_alarm_rate']:.1%}"
    )
    print(
        f"rule top20: catch {rule['catch_rate']:.3%}, "
        f"false alarms {rule['false_alarm_rate']:.1%}"
    )
    print(
        f"uncorrected top20: catch {uncorrected['catch_rate']:.3%}, "
        f"false alarms {uncorrected['false_alarm_rate']:.1%}"
    )
    print(f"materiality: {changed}/{days} days = {changed / days:.1%}")
    print("recorded study/artifacts/warning.json and model.json")


if __name__ == "__main__":
    main()
