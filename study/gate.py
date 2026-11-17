"""Apply the pre-registered study gate and record the decision."""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ARTIFACTS = ROOT / "study" / "artifacts"
CATCH_GAIN = 0.10
FALSE_ALARM_SLACK = 0.10
DEMAND_GAIN = 0.10
MATERIALITY = 0.05


def main():
    warning = json.loads((ARTIFACTS / "warning.json").read_text(encoding="utf-8"))
    baselines = json.loads((ARTIFACTS / "baselines.json").read_text(encoding="utf-8"))
    demand = json.loads((ARTIFACTS / "demand.json").read_text(encoding="utf-8"))

    rule = warning["rule"]
    baseline_rule = baselines["simple_rule"]
    assert rule["alerts"] == baseline_rule["alerts"]
    assert rule["hits"] == baseline_rule["hits"]
    assert rule["empty_shelves"] == baseline_rule["empty_shelves"]

    catch_bar = baseline_rule["catch_rate"] * (1 + CATCH_GAIN)
    false_alarm_bar = baseline_rule["false_alarm_rate"] * (1 + FALSE_ALARM_SLACK)
    demand_bar = baselines["lazy_demand"]["avg_miss"] * (1 - DEMAND_GAIN)

    demand_pass = demand["avg_miss_corrected"] <= demand_bar
    warning_pass = (
        warning["learned"]["catch_rate"] >= catch_bar
        and warning["learned"]["false_alarm_rate"] <= false_alarm_bar
    )
    materiality_pass = warning["materiality"]["share"] >= MATERIALITY

    if warning_pass and demand_pass and materiality_pass:
        decision = "build_full_with_learned_warning_and_corrected_demand"
    elif warning_pass and not demand_pass and materiality_pass:
        decision = "learned_warning_simple_demand"
    elif not warning_pass and demand_pass:
        decision = "simple_rule_with_correction_if_material"
    elif not warning_pass and not demand_pass:
        decision = "stop_and_reframe_with_owner"
    else:
        decision = "correction_not_material"

    record = {
        "claims": {
            "1_demand_accuracy": {
                "pass": bool(demand_pass),
                "value": demand["avg_miss_corrected"],
                "bar": round(demand_bar, 6),
                "lazy_miss": baselines["lazy_demand"]["avg_miss"],
            },
            "2_warning_quality": {
                "pass": bool(warning_pass),
                "catch_rate": warning["learned"]["catch_rate"],
                "catch_bar": round(catch_bar, 6),
                "false_alarm_rate": warning["learned"]["false_alarm_rate"],
                "false_alarm_bar": round(false_alarm_bar, 6),
                "rule_catch_rate": baseline_rule["catch_rate"],
                "rule_false_alarm_rate": baseline_rule["false_alarm_rate"],
            },
            "3_correction_materiality": {
                "pass": bool(materiality_pass),
                "share": warning["materiality"]["share"],
                "bar": MATERIALITY,
                "changed_days": warning["materiality"]["changed_days"],
                "scored_days": warning["materiality"]["scored_days"],
            },
        },
        "decision": decision,
    }
    (ARTIFACTS / "gate.json").write_text(
        json.dumps(record, indent=2) + "\n", encoding="utf-8"
    )

    print(f"demand accuracy: {'PASS' if demand_pass else 'FAIL'} "
          f"(miss {demand['avg_miss_corrected']:.6f} vs bar {demand_bar:.6f})")
    print(f"warning quality: {'PASS' if warning_pass else 'FAIL'} "
          f"(catch {warning['learned']['catch_rate']:.4%} vs bar {catch_bar:.4%}; "
          f"false alarms {warning['learned']['false_alarm_rate']:.2%} vs bar {false_alarm_bar:.2%})")
    print(f"correction materiality: {'PASS' if materiality_pass else 'FAIL'} "
          f"({warning['materiality']['changed_days']}/{warning['materiality']['scored_days']} days, "
          f"share {warning['materiality']['share']:.1%} vs bar {MATERIALITY:.0%})")
    print(f"decision: {decision}")
    print("recorded study/artifacts/gate.json")


if __name__ == "__main__":
    main()
