# Product Journal & Progress Log

A chronological, append-only record of real product work and verification evidence. Record facts, not marketing copy.

## Log entries

### [Outpost - full doc set and study-first plan] 2026-11-17

#### Work card 1: the docs did not agree on what the app could claim

- **Problem / tension:** The PRD and architecture used `full` and `limited` claims, but the accepted direction had three data modes and No mode. A sales-only upload could look like it had a learned warning.
- **Change / decision:** Added the three modes, the detection rules, the claim register, and mode labels to every screen. No mode can claim a higher mode.
- **Proof:** Doc check passed: `FILES: PASS`, `STALE: PASS`, `CLAIMS: PASS - 28 rows`, `PROMISE: 3 copies`.
- **Still broken / unproven:** Mode detection has not been run on a real upload. The 7-known-day threshold and the shelf-level `not enough history` rule need a fixture test.
- **Metric context:** Documentation only; no product run.
- **Engineering references:** `PRD.md` section 4, `ARCHITECTURE.md` sections 2 and 4, `CLAIMS.md`, ADR 0006.

#### Work card 2: the build could start before the proof existed

- **Problem / tension:** The study bars were decided but not written into one ordered plan. A UI could be built around an unproven model.
- **Change / decision:** Wrote `TASKS.md` as the only implementation plan, with the study gate first and a hard stop if both real claims fail.
- **Proof:** Doc check passed; Phase 0 checkboxes closed. The study gate is Phase 1.
- **Still broken / unproven:** The study has not run. The test cities, demo day, provider, host, caps, and UCI license are open.
- **Metric context:** Documentation only; no study metrics yet.
- **Engineering references:** `TASKS.md` Phase 1, `STUDY.md`, `CLAIMS.md`, ADR 0007.

#### Work card 3: the process rules were not operational

- **Problem / tension:** The global rules required read-only research, review, and verification, but the agent could skip them because there was no phase checklist or required subagent step.
- **Change / decision:** Added the Project Operating Model to the global rules and the phase checklist to the project rules. Read-only subagents are the default; builder subagents are a controlled exception with review and merge by the main agent.
- **Proof:** Global `AGENTS.md` section 6 and project `AGENTS.md` section 0 exist; the checklist names the loop, the stop list, and the builder exception.
- **Still broken / unproven:** The first real test is the study phase. The process has not been run end to end.
- **Metric context:** Process change; no product metrics.
- **Engineering references:** Global `AGENTS.md` section 6; project `AGENTS.md` section 0; grill Round 1.

#### Work card 4: the study decisions were in the chat, not in the record

- **Problem / tension:** The study target, budget, estimator, threshold, replay assumptions, and demo criteria were settled in conversation but not pre-registered. A result could be reinterpreted after the fact.
- **Change / decision:** Wrote the fixed study decisions into `STUDY.md` and `TASKS.md`, added ADR 0009, and added the UCI license check. Sensitivity views are reported but never replace the gate.
- **Proof:** `STUDY.md` has the pre-registration and sensitivity rules; `TASKS.md` Phase 1 has the UCI check and the primary/sensitivity split. Pending the study run.
- **Still broken / unproven:** The study has not run. The dataset facts and UCI license are being checked by a read-only scout.
- **Metric context:** Pre-registration only; no study metrics yet.
- **Engineering references:** `STUDY.md` sections 3–13; `TASKS.md` Phase 1; ADR 0009.

#### Work card 5: the study had no code and no environment

- **Problem / tension:** Phase 1 could not start: eight scout findings were unfixed in the docs, and the study had no skeleton, venv, or pinned packages.
- **Change / decision:** Applied the eight pre-scoring doc fixes (row math, 50,000-series wording, the without-correction arm, past-only weekday mean, 06:00–22:00 open hours, UCI aggregation rule, SHA-256 checksum rule, SKU count attribution). Created `study/` (src, tests, data, artifacts), `.venv`, `study/requirements.txt`, and `study/requirements.lock.txt` with exact pins.
- **Proof:** `python -m venv .venv` exit 0; `pip install -r study/requirements.txt` exit 0; venv python printed `ok` for `import pandas, sklearn`. Pins: pandas 3.1.1, scikit-learn 1.9.1, pyarrow 26.0.1, pytest 9.2.0.
- **Still broken / unproven:** Dataset not downloaded; no study scripts or tests yet. The process audit from the handoff still has not run.
- **Metric context:** Environment only; no study metrics.
- **Engineering references:** `STUDY.md` sections 2–4, 8, 9, 13; `TASKS.md` 1.1; `.gitignore`; `.scratch/HANDOFF.md`.

#### Work card 6: the datasets had no recorded identity

- **Problem / tension:** Scoring needs a fixed dataset fingerprint; the publisher ships no checksum, and the second dataset's license was unconfirmed. TASKS 1.2 and 1.2b could not close.
- **Change / decision:** `study/download.py` streams `train.parquet` once, records SHA-256, size, date, and counts in `study/artifacts/source.json`, and re-verifies on rerun. UCI Online Retail II checked on the official page on 2026-11-17: CC BY 4.0 confirmed, 8 columns, 1,067,371 instances, cancellation rule is the `C` invoice prefix; decision `pass`, recorded in `study/artifacts/second_dataset.json`.
- **Proof:** `download.py` exit 0: rows 4,500,000; series 50,000; stores 898; cities 18; size 106.4 MB; sha256 `6706832db892bbae4969c19d87e07975d2543d2ba7d7d4756360654785de5a3d`.
- **Still broken / unproven:** Nothing committed. Parse tests and the shelf-day build are not written yet. `stock_hour6_22_cnt > 0` holds for about 44% of shelf-days (2.0M of 4.5M), so the doc's "about 20% organic stockouts" needs a verified definition before `build.py` reports a rate.
- **Metric context:** Data acquisition only; no model metrics.
- **Engineering references:** `STUDY.md` sections 2 and 13; `TASKS.md` 1.2 and 1.2b; `study/artifacts/source.json`; `study/artifacts/second_dataset.json`.

#### Work card 7: the stockout window was assumed, not verified

- **Problem / tension:** Build and features depend on which hourly buckets count as open hours; the docs said 06:00–22:00 but the hour mapping was untested.
- **Change / decision:** Wrote `study/tests/test_parse.py` (required fields, nulls, duplicate shelf-days, negative sales, date range, binary hourly flags). The first run failed the window check: `stock_hour6_22_cnt` equals sum of indices 6–21, sixteen one-hour buckets, not 6–22. Updated the test and pinned the identity in `STUDY.md` section 3.
- **Proof:** `python -m pytest study/tests/test_parse.py -q` → `6 passed in 1.82s`, exit 0. Raw checks: 0 duplicate shelf-days, 0 negative sales, 0 nulls, 90 dates (2024-03-28 → 2024-06-25).
- **Still broken / unproven:** `build.py` not written; the "about 20% organic stockouts" figure is unverified — 44% of shelf-days have at least one stockout bucket.
- **Metric context:** Data validation only; no model metrics.
- **Engineering references:** `study/tests/test_parse.py`; `STUDY.md` section 3; `TASKS.md` 1.3.

#### Work card 8: the shelf-day table had no normalized empty flag

- **Problem / tension:** The raw file carries stockout-hour counts but no empty-day flag; the target needs yes/no/unknown, and the doc's "about 20% empty" figure was untested.
- **Change / decision:** `study/build.py` writes `shelf_day.parquet` with `empty_flag` (yes when `stock_hour6_22_cnt > 0`, no when 0, unknown when null) and preserves all raw columns. The dataset card confirmed two facts now in `STUDY.md`: the 20% is the share of open hours that are out of stock, and sales are globally normalized.
- **Proof:** `python study/build.py` exit 0: rows 4,500,000; shelves 50,000; days 90; empty_flag yes 44.3%, no 55.7%, unknown 0.0%; stockout_hour_share 19.9%; wrote 60.8 MB. The 19.9% matches the card's about 20%.
- **Still broken / unproven:** No split, features, or scores yet. Empty days (≥1 stockout hour) are 44.3% of shelf-days, far more common than empty hours.
- **Metric context:** Data build only; no model metrics.
- **Engineering references:** `study/build.py`; `TASKS.md` 1.4; `STUDY.md` sections 2, 3, 5.

#### Work card 9: the cities and holdout were not frozen

- **Problem / tension:** The gate requires 3 unseen test cities drawn once with a recorded seed and each city's last 30 days held out; nothing recorded the draw.
- **Change / decision:** `study/split.py` draws the seed with `secrets.randbelow(1_000_000)` on first run, samples 3 of 18 cities with `random.Random(seed)`, asserts 15/3 with no overlap, and writes `study/artifacts/split.json`. A later run with a different `--seed` refuses; the split is frozen.
- **Proof:** first run exit 0: `seed: 726821`; train cities 15; test cities 3 `[7, 9, 16]`; holdout 2024-05-27 to 2024-06-25 (30 days per city). Rerun with `--seed 726821` exits 0 and prints `split already frozen; nothing changed`.
- **Still broken / unproven:** Features, baselines, training, and the gate are not written. The seed and test cities are fixed; do not redraw after scoring.
- **Metric context:** Split only; no scores yet.
- **Engineering references:** `study/split.py`; `study/artifacts/split.json`; `TASKS.md` 1.5; `STUDY.md` section 4.

#### Work card 10: the features had no leakage guarantee

- **Problem / tension:** The warning model must never see identity or future data; nothing tested that, and the corrected-demand series had no code.
- **Change / decision:** `study/src/features.py` builds the 21 documented features with shift-only (past-only) windows, an identity-free column list, the demand correction (past-only same-weekday level, 7-vs-7 trend clipped 0.5–2, never below observed), the next-day empty target, and a per-day `demand_estimate` for demand scoring.
- **Proof:** `python -m pytest study/tests/test_features.py -q` → `5 passed in 1.23s`, exit 0: no identity columns, a future-row change leaves past features identical, target equals the next-day flag, corrected means ≥ observed means, no NaNs after a 28-day warmup.
- **Still broken / unproven:** Baselines, training, and the gate are not written. The identity columns stay in `shelf_day.parquet` but never enter features.
- **Metric context:** Feature build only; no scores yet.
- **Engineering references:** `study/src/features.py`; `study/tests/test_features.py`; `TASKS.md` 1.6; `STUDY.md` sections 5 and 8.

#### Work card 11: the baselines were unscored

- **Problem / tension:** The gate needs the simple rule and the lazy demand guess on the unseen cities; nothing had scored them. My first shared-scoring refactor dropped the rule's 14-day tie-breaker, and the rerun produced different numbers.
- **Change / decision:** `study/src/scoring.py` now holds the rule, the top-budget ranking, and the budget metrics, used by every scorer. `study/baselines.py` scores both baselines on the 3 test cities' holdout.
- **Proof:** `python study/baselines.py` exit 0: 29 scored days (2024-05-27..2024-06-24); 149,901 scored rows across city 7 (12,876), 9 (5,713), 16 (131,312); rule catch rate 0.687%, false-alarm rate 23.6%, 443 hits of 580 alerts, 64,480 empty-next rows; lazy demand average miss 0.439178 on 88,002 non-empty rows. The tie-breaker fix restored the first run's numbers exactly.
- **Still broken / unproven:** The learned warning and the demand correction are not trained. Absolute catch is under 1% because about 2,200 shelves go empty per day and the budget is 20 alerts per day; the gate compares arms relatively.
- **Metric context:** Baselines only; no learned-arm scores yet.
- **Engineering references:** `study/baselines.py`; `study/src/scoring.py`; `study/artifacts/baselines.json`; `TASKS.md` 1.7.

#### Work card 12: the learned warning was untrained

- **Problem / tension:** Claim 2 needs a learned arm against the rule on unseen cities. The review found my leakage test too weak and the STUDY §8 hourly sharpening unimplemented, so both were fixed before scoring.
- **Change / decision:** `study/train_warning.py` trains two arms (corrected and observed-only features) on 15 cities and scores the 3 unseen cities. Review fixes: fill-share sharpening `observed / max(fill share, 0.2)` in the correction, same-weekday fallback, unknown-next-day targets, a stricter leakage test (mutated day included, other shelf checked), and split freeze checks on rerun.
- **Proof:** final run exit 0: train 2,645,029 rows over 59 days; test 149,901 rows over 29 days. Learned top-20 catch 438/64,480 = 0.6793%, false alarms 24.48%; rule catch 0.6870%, false alarms 23.62%; uncorrected 0.6234%/30.69%; materiality 29/29 days.
- **Still broken / unproven:** The learned warning does not beat the rule at the pre-registered top-20 budget (bar 0.7557%). Sensitivity: learned beats the rule slightly at top-50 (1.667% vs 1.616%) and top-100 (3.248% vs 3.119%).
- **Metric context:** Bar 0.7557%; measured 0.6793%. Exact output pasted from the run.
- **Engineering references:** `study/train_warning.py`; `study/artifacts/warning.json`, `model.json`; `TASKS.md` 1.8.

#### Work card 13: the demand correction was unscored

- **Problem / tension:** Claim 1 needs the corrected estimate against the same-weekday guess on non-empty days in unseen cities.
- **Change / decision:** `study/train_demand.py` scores the pre-registered estimator (past-only weekday level × trend, hourly sharpening on empty days) on the 30 holdout days.
- **Proof:** exit 0: 88,002 non-empty rows; average miss 0.430184 vs lazy 0.439178; relative gain 2.05%.
- **Still broken / unproven:** Far below the 10% bar; the correction does not beat the lazy guess.
- **Metric context:** Bar = lazy miss 0.439178 × 0.90 = 0.395260; measured 0.430184.
- **Engineering references:** `study/train_demand.py`; `study/artifacts/demand.json`; `TASKS.md` 1.9.

#### Work card 14: both real claims failed

- **Problem / tension:** The pre-registered gate decides whether the app may be built, and there was no recorded verdict.
- **Change / decision:** `study/gate.py` applied the fixed bars; `export.py` froze `feature_spec.json`, `proof.json`, `checksums.json`; `export_parity.py` wrote the 100-row fixture. Both real claims failed, so per STUDY §10 and TASKS 1.10 no app code is written; the reframe decision goes to the owner.
- **Proof:** gate exit 0: demand FAIL (0.430184 vs bar 0.395260); warning FAIL (catch 0.6793% vs bar 0.7557%; false alarms 24.48% vs bar 25.98%); materiality PASS (29/29 days). export.py: `SCHEMA: PASS`, `CHECKSUMS: PASS`. export_parity.py: 100 rows, 21 features, scores 0.262–0.756.
- **Still broken / unproven:** No app exists. The process audit from the earlier handoff still has not run. Nothing is committed.
- **Metric context:** Gate evidence in `study/artifacts/gate.json`; the bars did not move after scoring.
- **Engineering references:** `study/gate.py`, `study/export.py`, `study/export_parity.py`; `study/artifacts/gate.json`, `proof.json`, `checksums.json`, `parity_fixture.json`; `CLAIMS.md` C1–C4.
