# STUDY.md — Offline Study and Model Card

The study proves the two real claims before the app is built. It runs offline in Python. It never runs in production.

**Hard stop:** if both real claims fail, stop before the app and reframe with the owner.

**Pre-registration:** the decisions in this document are fixed before scoring. The study may add sensitivity views, but it may not move a bar, change a split, or change the target after seeing results. Any change after scoring is recorded as a deviation.

---

## 1. Purpose

Answer three questions on data the model has never seen:

1. Does the corrected demand beat the lazy guess?
2. Does the learned warning beat the simple rule?
3. Does the correction change the warning enough to matter?

The assistant check is a separate proof run in the app. The replay is a simulated claim, not a study gate.

---

## 2. Dataset

**FreshRetailNet-50K** from Dingdong.

| Fact | Value |
|---|---|
| Store-product series | 50,000 |
| Stores | 898 |
| Cities | 18 |
| Products | 865 per the dataset card; the paper says 863 |
| History | About 90 days per series |
| Rows | About 4.5 million in `data/train.parquet` only |
| Size | About 106 MB |
| Stock signal | Hourly stock status |
| Stockout hours | About 20% of open hours, per the dataset card; measured 19.9% in `train.parquet` |
| Empty shelf-days | 44.3% have at least one stockout hour; 4.0% are empty for all 16 open hours |
| License | CC BY 4.0 |
| Credit | Dingdong and the 2025 paper |

The dataset was published for hidden-demand recovery. Outpost uses it for that purpose. A public baseline exists. Outpost does not claim research novelty or a win over it.

The published `data/eval.parquet` (350k rows, about 8.4 MB) is not used. It is why the published total is about 4.85 million rows. The study reads `data/train.parquet` only and makes its own split.

Download once. The publisher provides no checksum. Compute SHA-256 once, record it with the URL, size, and download date in `study/artifacts/source.json`, and compare every re-download against it.

---

## 3. Unit and target

**Unit:** one shelf-day. One store, one product, one day.

**Warning target:** at least one empty-shelf hour in the next 24 hours, which is the next day for daily data. This is the primary target. A sensitivity view uses 2+ empty hours; it is not the gate. An empty-shelf hour is an hour between 06:00 and 22:00, the window the dataset counts stockout hours over. The hourly arrays hold 24 buckets; the counted window is sixteen of them, array indices 6–21, and `stock_hour6_22_cnt` equals the number of empty buckets in that slice. "Open hours" means this sixteen-bucket window throughout the study.

**Demand target:** units wanted on a day. Observed sales are a lower bound when the shelf was empty. Sales are globally normalized by the publisher (a constant coefficient); the study treats one normalized unit as one unit throughout.

**Eligibility:** a shelf with fewer than 28 days of history is not scored for a warning and is labelled `not enough history`. This applies to uploads; the primary dataset has about 90 days per series.

---

## 4. Split

- Use all 50,000 store-product series across the 18 cities. No sampling. 15 cities train, 3 test.
- 15 cities train.
- 3 cities test. The 3 are chosen randomly with a seed recorded in `split.json` before any scoring. The seed is drawn at the start of the study and frozen.
- Each city's last 30 days are held out.
- The model may read a test city's earlier days as input, like a new company's own history. It never trains on them.
- Do not use the dataset's own train/eval split.
- Do not redraw the test cities after seeing results.
- Round 2 redraws the three test cities with a new recorded seed before scoring; cities 7, 9, and 16 from Round 1 return to the pool. The bars do not change.

The demo uses one of the 3 test cities. The demo day is chosen after the study.

---

## 5. Features

Only data up to and including the decision day. Nothing after it. No store, product, city, or category identity.

| Feature | Window |
|---|---|
| Sales mean | 7, 14, 28 days |
| Same-weekday mean | Last 4 weeks |
| Trend | Last 7 days vs the previous 7 |
| Empty-shelf days | 7, 14, 28 days |
| Days since the last empty shelf | Since the last `yes` |
| Empty rate | 14 days |
| Same-weekday empty, 1 week | Lag 6, boolean |
| Same-weekday empty, 2 weeks | Lag 13, boolean |
| Corrected demand mean | 7, 14, 28 days |
| Hourly fill share | When hourly sales and empty hours exist |
| Holiday | Current day |
| Promotion | Current day |
| Weather | Current day, when present |

`feature_spec.json` lists every feature, window, and transformation. Python and TypeScript must produce the same values on a frozen 100-row sample.

"Promotion" means the published discount rate (1.0 is no discount) and the activity flag.

**Leakage test:** changing a future value must not change a past feature.

---

## 6. Baselines

**Simple warning rule**

- Alert a shelf if it had an empty hour on the same weekday in the last two weeks.
- Break ties by empty hours in the last 14 days.
- Rank by the tie-breaker. The top 20 per day are the primary alert budget. Sensitivity views use top 50 and top 100; they are not the gate.
- The rule is fixed in writing before scoring.

**Lazy demand guess**

- The same weekday last week.
- This is the bar the correction must beat.

---

## 7. Warning model

- Logistic regression on standardized features.
- Class weights handle the rare positive class.
- The threshold is replaced by the fixed top-20 alert budget; the score is used for ranking. Sensitivity views use top 50, top 100, and a 2+ empty-hour target; they are not the gate.
- Train on 15 cities. Test on 3 unseen cities.
- The top three positive contributions become the reasons, with plain labels.
- The artifact is one JSON file: feature order, means, standard deviations, coefficients, intercept, version, trained cities, test cities, and metrics.
- Inference in the app is a dot product plus a sigmoid in TypeScript. No Python in production.

**Why logistic regression:** the coefficients give exact reasons, the artifact is small, inference is fast, and the model is easy to audit. The study does not need a larger model to answer the question.

---

## 8. Demand correction

**Estimator choice:** this is the only demand estimator. There is no second demand model. The 10% bar decides whether it ships; if it fails, the simple demand method ships and the claim is marked failed.

**Normal weekday level:** the past-only mean observed demand for each weekday, using earlier days when the shelf was not empty, plus a short trend adjustment. The decision day is never part of its own mean. When a weekday has no non-empty day in the last four weeks, the 28-day non-empty mean fills in; a shelf with no non-empty day in 28 days gets a level of 0. The trend is the last 7 days' non-empty mean divided by the previous 7 days' non-empty mean, clipped to [0.5, 2], and 1 when undefined.

**Empty days:** the observed sales are a lower bound. The estimate for that day is the normal weekday level, adjusted for trend, never below the observed sales. The gap is hidden units.

**Hourly detail:** when hourly sales and empty hours exist, the fill share is `1 - empty hours / open hours`, where open hours are 06:00–22:00. The observed sales are scaled up to `observed / max(fill share, 0.2)`. On an empty day the estimate is the largest of the observed sales, the weekday level times trend, and that hourly estimate. The 0.2 floor is an assumption and is labelled; a near-empty day cannot explode beyond five times its observed sales.

**Future days:** the normal weekday level plus trend. No future empty flag. No peeking.

**Round 2 selection:** three transparent candidates are declared before scoring: (a) the current four-week same-weekday mean times trend; (b) a recency-weighted same-weekday mean (weights 0.4, 0.3, 0.2, 0.1 for weeks 1–4) times trend; (c) the median of the last four same-weekday non-empty values times trend. The fallbacks and hourly sharpening above apply to all three. The candidate with the lowest average miss on the 15 training cities' pre-holdout non-empty days is frozen before the test cities are scored.

**Score:** average miss on days the shelf was not empty, against the lazy guess. Report with and without the correction. Never report the estimate on empty days as recovered truth.

---

## 9. Metrics and bars

**Fixed before scoring.** The bars below do not move after results. Sensitivity views (2+ empty hours, top 50, top 100, top-5 set change, top-50 set change, 1/2/3-day stock) are reported but do not change the gate.

### Claim 1 — Demand accuracy

- Metric: average absolute miss on non-empty days.
- Bar: the corrected estimate beats the lazy guess by at least **10% relative**.
- Report with and without correction.
- A miss is a failed claim, not a hidden result.

### Claim 2 — Warning quality

- Metric: catch rate at the top-20 alert budget, and false-alarm rate.
- Bar: at least **10% relative catch-rate gain** over the simple rule.
- Guardrail: false alarms no more than **10% relative worse** than the simple rule.
- Report both arms on the 3 unseen cities and the held-out days.
- Sensitivity: 2+ empty hours, top 50, top 100. These do not change the gate.

### Claim 3 — Correction materiality

- Metric: the share of scored days where the top-20 warning set changes when the correction is used.
- The without-correction arm is the same feature set with the corrected-demand features replaced by observed-sales features, trained on the same 15 cities with the same procedure. Both arms are ranked on the same held-out days.
- Bar: at least **5% of scored days**.
- Sensitivity: top-5 and top-50 set changes. These do not change the gate.
- Below the bar: report the correction as not material. Do not sell it as the reason for the warning.

### Claim 4 — Assistant check (app, not study)

- 20 facts, 10 refusals, 10 paraphrases.
- Bars: 18/20, 10/10, 9/10.
- Speed: the slowest 1 in 20 answers. Cost per answer.
- A miss fails the release.

### Claim 5 — Replay (simulated, not a gate)

- Outpost against doing nothing on the same held-out days.
- Both arms use the same fixed approval rule.
- Losses are stored.
- Every money number is labelled simulated.
- Stock sensitivity: 1, 2, and 3 days of starting stock. The 2-day case is the primary simulated result; the others are sensitivity.

---

## 10. Gate and fallback

Run `python study/gate.py`. It prints `PASS` or `FAIL` for claims 1, 2, and 3. The gate uses the primary target, budget, and bars. Sensitivity views never replace them.

| Result | Decision |
|---|---|
| Warning passes, demand passes, correction material | Build Full mode with the learned warning and corrected demand |
| Warning fails, demand passes | Ship the simple rule; keep the learned loss in `CLAIMS.md`; build Full mode with the correction if material |
| Warning passes, demand fails | Ship the learned warning; keep the simple demand; mark the demand claim failed |
| Correction not material | Keep the correction out of the warning copy; report it as not material |
| Both real claims fail | Stop before the app; reframe with the owner |

No silent fallback. Every failed claim is written in `CLAIMS.md` and shown on Proof.

---

## 10a. Round 1 results (2026-11-17)

First run under the pre-registration above. Seed 726821; test cities 7, 9, 16; holdout 2024-05-27 to 2024-06-25.

| Check | Measured | Bar | Outcome |
|---|---|---|---|
| Demand accuracy (Claim 1) | average miss 0.430184 vs lazy 0.439178 (+2.05% relative) | +10% relative | **FAIL** |
| Warning catch (Claim 2) | 438 of 64,480 empty shelves at top 20 (0.6793%); rule 0.6870% | 0.7557% | **FAIL** |
| Warning false alarms (C3) | 24.48%; rule 23.62% | 25.98% | PASS |
| Materiality (Claim 3) | 29 of 29 scored days changed | 5% | PASS |

Sensitivity views, reported and not the gate: top-50 learned 1.667% vs rule 1.616%; top-100 learned 3.248% vs rule 3.119%; 2+ empty buckets learned 0.692% vs rule 0.749%. The learned arm beats the rule slightly at top-50 and top-100 and loses at top-20 and on the 2+ target.

Gate decision: `stop_and_reframe_with_owner`. Both real claims failed, so no app code is written. Evidence: `study/artifacts/round1/gate.json` and `round1/proof.json`.

### Round 2 (pre-registered 2026-11-17, before scoring)

Round 1 failed both real claims. Round 2 rescores under the same bars:

- Fresh test cities: three drawn with a new recorded seed; 7, 9, and 16 return to the pool.
- Two added features: empty on the same weekday one week and two weeks before the target day.
- Demand estimator chosen from the three candidates in section 8 on the 15 training cities, frozen before scoring.

Round 1 evidence is filed under `study/artifacts/round1/`.

Round 2 result (same bars; cities 1, 13, 17; seed 242921; demand candidate (a) won on training cities at 0.421171 vs 0.422321 and 0.425734):

| Check | Measured | Bar | Outcome |
|---|---|---|---|
| Demand accuracy (Claim 1) | average miss 0.423084 vs lazy 0.427613 (+1.06%) | +10% relative | **FAIL** |
| Warning catch (Claim 2) | 443 of 36,157 empty shelves at top 20 (1.2252%); rule 362 (1.0012%) | 1.1013% (+10% relative) | **PASS** |
| Warning false alarms (C3) | 23.62%; rule 37.59% | 41.34% | PASS |
| Materiality (Claim 3) | 29 of 29 scored days changed | 5% | PASS |

Gate decision: `learned_warning_simple_demand`. The learned warning ships; the simple demand method stays; Claim 1 is marked failed. Evidence: `study/artifacts/gate.json` and `proof.json`.

---

## 11. Artifacts

| File | Contents |
|---|---|
| `study/artifacts/source.json` | URL, size, checksum, download date |
| `study/artifacts/split.json` | Seed, train cities, test cities, holdout window |
| `study/artifacts/baselines.json` | Simple rule and lazy demand scores |
| `study/artifacts/model.json` | Feature order, means, standard deviations, coefficients, intercept, version |
| `study/artifacts/feature_spec.json` | Every feature, window, transformation |
| `study/artifacts/proof.json` | Demand score, warning score, materiality, replay, losses, model card |
| `study/artifacts/parity_fixture.json` | 100 frozen rows with Python features and expected scores |
| `study/artifacts/gate.json` | PASS/FAIL per claim and the fallback decision |
| `study/artifacts/second_dataset.json` | UCI license, columns, and fallback decision |

Checksums are recorded. The app seeds these files; it does not recompute the primary proof.

---

## 12. Demo selection

After the study:

1. Pick one of the 3 unseen test cities.
2. Pick one representative day with one clear win and one clear miss. A clear win is a high-band warning that came true and a fix that would have prevented at least one empty hour. A clear miss is a shelf that emptied with no high-band warning.
3. Do not change the model, the split, or the proof to make the day look better.
4. Label the day `a representative day, not the proof`.
5. The proof is the three-city score.
6. End the story on the miss.

The demo's replay assumptions are fixed:

| Assumption | Value | Label |
|---|---|---|
| Starting stock | 2 days of expected demand | assumed |
| Safety margin | 1 day of demand | assumed |
| Travel time | 1 day | assumed |
| Delivery time | 2 days | assumed |
| Price | 1 price unit per unit | assumed |
| Approval rule | Approve every recommended fix that arrives before the expected empty hour and fits the safe surplus | fixed rule |

These are demo assumptions, not real store data. An upload with real ops inputs uses its own values. The app labels every one. The primary simulated result uses 2 days of starting stock; the study also reports 1-day and 3-day sensitivity. The sensitivity is not the proof.

---

## 13. Second dataset

**UCI Online Retail II**

- Real, public, a different business.
- About 1 million rows, one shop.
- Aggregation: cancellations (invoices starting with `C`) and negative-quantity rows are excluded before aggregation. The rest are summed to product-day with one constant store and `empty = unknown`. The no-negative-quantity check applies to the aggregated product-day values.
- Product-day sales and prices.
- No stock or empty-shelf flags.
- Used only to prove the Demand watch mode and the data contract.
- Never carries a headline claim.
- License and columns checked first. The decision is recorded in `study/artifacts/second_dataset.json`.
- Fallback: M5 or Rossmann.

The second dataset test:

1. Map the columns to the contract.
2. Load all or nothing.
3. Detect `watch`.
4. Compute the uncorrected demand accuracy.
5. Show no warning, no fixes, no catch-rate claim.

---

## 14. Reproducibility

- Record the Python version, package versions, dataset checksum, and split seed.
- One command per step: `download.py`, `build.py`, `split.py`, `baselines.py`, `train_warning.py`, `train_demand.py`, `gate.py`, `export.py`, `export_parity.py`.
- The study is deterministic with the recorded seed.
- No manual edits to the artifacts.
- No test hardcodes a success number.
- The study report is written from the run, not typed by hand.

---

## 15. Model card

**Intended use:** rank shelves by the chance of an empty hour in the next day, for a grocery planner, when the data meets the contract and the mode is `full`. An upload is used only with its own out-of-sample proof shown.

**Not intended for:** true demand recovery, causal claims, real-money savings, other businesses without their own upload proof, long-horizon forecasts, automated ordering, or decisions without a human.

**Training data:** 15 cities from FreshRetailNet-50K; last 30 days held out; 3 unseen test cities.

**Features:** identity-free behavior only. No store, product, city, or category identity.

**Evaluation:** catch rate and false alarms at the top-20 budget; demand average miss on non-empty days; correction materiality. Sensitivity views are reported separately and are not the gate.

**Limitations:** observational data; no randomized experiment; the correction is an estimate; the replay uses assumptions; the primary dataset is one business; the demo day is representative, not proof.

**Ethical note:** no personal data. The dataset uses anonymized IDs. The app never invents store or product names.

---

## 16. What the study does not prove

- That the corrected demand is the true demand.
- That Outpost causes fewer empty shelves in a real store.
- That the replay's money is real.
- That the model works on every business.
- That the assistant is correct. That is the app's 40-question check.
- That the public deployment performs like the local study.
