"""Freeze the study artifacts and record their checksums."""

import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(Path(__file__).resolve().parent / "src"))

from features import FEATURE_COLUMNS, FEATURE_SPEC, KEYS, OPEN_BUCKETS, SINCE_CAP  # noqa: E402

ARTIFACTS = ROOT / "study" / "artifacts"
CHECKSUMMED = [
    "source.json",
    "second_dataset.json",
    "split.json",
    "baselines.json",
    "model.json",
    "warning.json",
    "demand.json",
    "gate.json",
    "feature_spec.json",
    "proof.json",
]


def sha256(path):
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load(name):
    return json.loads((ARTIFACTS / name).read_text(encoding="utf-8"))


def main():
    split = load("split.json")
    warning = load("warning.json")
    demand = load("demand.json")
    gate = load("gate.json")
    baselines = load("baselines.json")
    model = load("model.json")

    feature_spec = {
        "version": "0.1.0",
        "keys": KEYS,
        "features": {name: FEATURE_SPEC[name] for name in FEATURE_COLUMNS},
        "open_buckets": OPEN_BUCKETS,
        "since_cap": SINCE_CAP,
        "target": "empty_flag == yes on the next day",
        "target_column": "target_empty_next",
        "target_unknown": "target is null when the next day's flag is unknown",
        "correction": "on empty days the estimate is the largest of observed sales, weekday level times trend, and observed / max(fill share, 0.2)",
        "demand_estimate": "past-only same-weekday non-empty mean over 4 weeks (fallback 28-day non-empty mean, then 0) times trend clipped to [0.5, 2.0]",
    }
    (ARTIFACTS / "feature_spec.json").write_text(
        json.dumps(feature_spec, indent=2) + "\n", encoding="utf-8"
    )

    proof = {
        "model_version": model["version"],
        "split": {
            "seed": split["seed"],
            "train_cities": len(split["train_cities"]),
            "test_cities": split["test_cities"],
            "holdout_start": split["holdout_start"],
            "last_day": split["last_day"],
        },
        "claims": gate["claims"],
        "decision": gate["decision"],
        "baselines": {
            "simple_rule": baselines["simple_rule"],
            "lazy_demand": baselines["lazy_demand"],
        },
        "sensitivity": warning["sensitivity"],
        "two_plus_empty_buckets": warning["two_plus_empty_buckets"],
        "replay": None,
        "replay_note": "The simulated replay runs in Phase 8; this proof carries the three real scores only.",
        "model_card": {
            "intended_use": "rank shelves by the chance of an empty hour in the next day for a grocery planner in full mode",
            "not_intended_for": "true demand recovery, causal claims, real-money savings, long-horizon forecasts, automated ordering",
            "training_data": "15 of 18 FreshRetailNet-50K cities; last 30 days of every city held out; 3 unseen test cities",
            "features": "identity-free, past-only behavior only",
            "limitations": "observational data; the correction is an estimate; the replay is simulated; one business",
        },
    }
    (ARTIFACTS / "proof.json").write_text(
        json.dumps(proof, indent=2) + "\n", encoding="utf-8"
    )

    checksums = {name: sha256(ARTIFACTS / name) for name in CHECKSUMMED}
    (ARTIFACTS / "checksums.json").write_text(
        json.dumps(checksums, indent=2) + "\n", encoding="utf-8"
    )

    assert len(model["features"]) == len(model["coefficients"]) == len(
        model["mean"]
    ) == len(model["scale"])
    assert set(model["features"]) == set(FEATURE_COLUMNS)
    assert set(proof["claims"]) == {
        "1_demand_accuracy",
        "2_warning_quality",
        "3_correction_materiality",
    }
    assert gate["decision"] in {
        "build_full_with_learned_warning_and_corrected_demand",
        "learned_warning_simple_demand",
        "simple_rule_with_correction_if_material",
        "correction_not_material",
        "stop_and_reframe_with_owner",
    }
    print("SCHEMA: PASS")

    recorded = json.loads((ARTIFACTS / "checksums.json").read_text(encoding="utf-8"))
    for name, checksum in recorded.items():
        assert sha256(ARTIFACTS / name) == checksum
        print(f"{name}: {checksum[:16]}...")
    print("CHECKSUMS: PASS")
    print("frozen: model.json, feature_spec.json, proof.json, checksums.json")


if __name__ == "__main__":
    main()
