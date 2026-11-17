# TASKS.md — Outpost Implementation Plan

This is the only implementation plan. Work top to bottom, one task at a time.

**Rules for the AI**

1. Pick the top unchecked task.
2. Write only what that task needs.
3. Run the verification.
4. Mark `[x]` only when the verification exits 0.
5. Log the result in `JOURNAL.md` with a 4-line card.
6. Do not start the next phase until the current phase's gate passes.

**Current sprint goal:** prove the warning and demand claims on real data, then build the smallest app that shows the proof.

**Hard stop:** no app code before the Phase 1 gate. If both real claims fail, stop and reframe with the owner.

---

## Phase 0 — Documents

- [x] **0.1 Write the full doc set.**
  - `PRD.md`, `ARCHITECTURE.md`, `AGENTS.md`, `GLOSSARY.md`, `STUDY.md`, `CLAIMS.md`, `DESIGN.md`, `TASKS.md`, `JOURNAL.md`, `README.md`, and ADRs 0006–0008.
  - _Verification:_ every required file exists; the consistency check prints `PASS`.
- [x] **0.2 Reconcile the three modes and the claim register.**
  - No `limited mode`, no `two modes`, no unlabelled claim anywhere.
  - _Verification:_ search finds no stale wording; every claim in `CLAIMS.md` has a status.
- [x] **0.3 Create the local verification skill.**
  - `.agents/skills/verify-outpost/SKILL.md` plus one feature file per surface.
  - _Verification:_ the skill loads and maps Today, shelf detail, decision, Proof, Bring data, modes, and the assistant.

---

## Phase 1 — Offline study (no app)

**Gate:** the learned warning and the demand correction either pass the bars or the fallback is recorded. No UI is built before this gate.

- [x] **1.1 Create the study skeleton.**
  - `study/` with `requirements.txt`, `src/`, `tests/`, `data/`, `artifacts/`.
  - _Verification:_ `python -m venv .venv` and `pip install -r study/requirements.txt` exit 0; `python -c "import pandas, sklearn; print('ok')"` prints `ok`.
- [x] **1.2 Download and checksum FreshRetailNet-50K.**
  - Download once; record the URL, size, and checksum.
  - _Verification:_ `python study/download.py` exits 0; prints 50,000 series, about 4.5M rows, about 106 MB for `data/train.parquet`; SHA-256 recorded (the publisher provides no checksum).
- [x] **1.2b Check the UCI license and columns.**
  - Read the UCI Online Retail II license and column list; record the result.
  - _Verification:_ `study/artifacts/second_dataset.json` exists with the license, columns, and pass/fallback decision. If the license fails, the fallback is M5 or Rossmann.
- [x] **1.3 Parse and validate the raw data.**
  - Required fields, duplicate shelf-days, negative quantities, empty-flag values, date range.
  - _Verification:_ `python -m pytest study/tests/test_parse.py -q` exits 0; zero duplicate keys; date range about 90 days.
- [x] **1.4 Build the shelf-day table.**
  - One row per store, product, and day; hourly fields preserved; empty flags normalized to yes/no/unknown.
  - _Verification:_ `python study/build.py` exits 0; prints row counts, the stockout-hour share (about 20% of open hours), the share of shelf-days with at least one stockout hour, and the unknown rate; writes `study/data/shelf_day.parquet`.
- [x] **1.5 Split cities and time.**
  - Use all 50,000 series; 15 train cities, 3 test cities chosen randomly with a seed drawn and frozen at the start; last 30 days held out in every city.
  - _Verification:_ `python study/split.py --seed <recorded>` exits 0; writes `study/artifacts/split.json`; no city overlap; 15/3 counts.
- [x] **1.6 Build identity-free features.**
  - Past-only windows; no store, product, city, or category identity.
  - _Verification:_ `python -m pytest study/tests/test_features.py -q` exits 0; a future-value change does not change a past feature; identity columns absent.
- [x] **1.7 Score the baselines.**
  - Simple rule: alert if the shelf had an empty hour on the same weekday in the last two weeks; ties by empty hours in the last 14 days.
  - Lazy demand guess: same weekday last week.
  - _Verification:_ `python study/baselines.py` exits 0; writes `study/artifacts/baselines.json`; scores cover all 3 test cities.
- [x] **1.8 Train and score the learned warning.**
  - Logistic regression on standardized features; train on 15 cities; test on 3 unseen cities. Primary target is one empty hour; primary budget is top 20.
  - _Verification:_ `python study/train_warning.py` exits 0; prints catch rate and false-alarm rate against the rule; prints the 2+ hour, top-50, and top-100 sensitivity; no test city appears in training.
- [x] **1.9 Train and score the demand correction.**
  - Use the transparent estimator; estimate wanted demand on empty days; score on non-empty days against the lazy guess. No second demand model.
  - _Verification:_ `python study/train_demand.py` exits 0; prints average miss with and without correction; no test city appears in training.
- [x] **1.10 Apply the study gate.**
  - Warning: at least 10% relative catch-rate gain, false alarms no more than 10% relative worse.
  - Demand: at least 10% relative average-miss gain.
  - Materiality: the correction changes the top-20 warning set on at least 5% of scored days.
  - The gate uses the primary target, budget, and bars. Sensitivity views never replace them.
  - _Verification:_ `python study/gate.py` exits 0; prints `PASS` or `FAIL` for each claim; writes `study/artifacts/gate.json`.
  - **If the warning fails:** ship the simple rule, keep the learned loss in `CLAIMS.md`, and continue.
  - **If both real claims fail:** stop before the app and reframe with the owner.
- [x] **1.11 Freeze the artifacts.**
  - `model.json`, `feature_spec.json`, `proof.json`, `split.json`, `second_dataset.json`, checksums.
  - _Verification:_ `python study/export.py` exits 0; JSON schema check passes; checksums match.
- [x] **1.12 Export the parity fixture.**
  - 100 frozen rows with Python features and expected warning scores.
  - _Verification:_ `python study/export_parity.py` exits 0; fixture has 100 rows and every feature from the spec.
- [x] **1.13 Write the study results into the docs.**
  - Update `STUDY.md` and `CLAIMS.md` with the real numbers and statuses.
  - _Verification:_ every claim has a status and evidence; no `pending` claim is written as active UI copy.

---

## Phase 1R — Round 2 rescore

**Gate:** same bars as Phase 1. Re-registered before scoring; no app code before the Round 2 gate passes.

- [x] **1R.1 Re-register Round 2.**
  - Add the same-weekday-empty features and the demand-estimator selection rule to `STUDY.md`; file Round 1 artifacts under `round1/`; redraw the test cities with a new recorded seed. Bars unchanged.
  - _Verification:_ `STUDY.md` sections 4, 5, 8, and 10a describe Round 2; `study/artifacts/round1/` holds the Round 1 evidence; a new `split.json` exists with a new seed and three new cities.
- [x] **1R.2 Add the two same-weekday-empty features.**
  - `empty_same_weekday_1` (lag 6) and `empty_same_weekday_2` (lag 13), past-only.
  - _Verification:_ `python -m pytest study/tests -q` exits 0; the leakage test covers the new columns.
- [x] **1R.3 Freeze the demand estimator.**
  - Score candidates (a), (b), (c) on the 15 training cities' pre-holdout non-empty days; freeze the best.
  - _Verification:_ `python study/choose_demand.py` exits 0; writes `study/artifacts/demand_choice.json` naming the winner and each candidate's training miss.
- [x] **1R.4 Rerun the study.**
  - `baselines.py`, `train_warning.py`, `train_demand.py`, `gate.py`, `export.py`, `export_parity.py` in order.
  - _Verification:_ every command exits 0; `gate.json` prints PASS or FAIL per claim; checksums pass.
- [x] **1R.5 Record the Round 2 result.**
  - Update `STUDY.md`, `CLAIMS.md`, and `JOURNAL.md` with the measured numbers and statuses.
  - _Verification:_ every claim has a status from evidence, not memory.

---

## Phase 2 — Walking skeleton

- [ ] **2.1 Scaffold the app.**
  - Next.js, TypeScript, Tailwind, Postgres client, test runner.
  - _Verification:_ `npm run build` exits 0; `npm test` exits 0 with at least one passing test.
- [ ] **2.2 Connect Postgres.**
  - Local Docker database, migrations, env example.
  - _Verification:_ `npm run db:ping` prints `ok`; `npm run db:migrate` exits 0 on a fresh database.
- [ ] **2.3 Create the 12 tables and indexes.**
  - Match `ARCHITECTURE.md` section 5.
  - _Verification:_ migration test creates 12 tables; named indexes exist; unique constraints reject duplicates.
- [ ] **2.4 Seed the frozen demo.**
  - One unseen test city, the saved reference day, warnings, fixes, proof.
  - _Verification:_ `npm run seed:demo` exits 0; row counts match `proof.json`; reset returns to the saved start.
- [ ] **2.5 Port features to TypeScript and prove parity.**
  - Same `feature_spec.json`; no identity features.
  - _Verification:_ `npm test -- parity` exits 0; TypeScript features match the Python fixture within `1e-9`.
- [ ] **2.6 Load the model artifact at runtime.**
  - Parse, validate, cache once per process.
  - _Verification:_ unit test scores a known row and matches the Python score within `1e-9`.

---

## Phase 3 — Core demo app

- [ ] **3.1 Read warnings.**
  - `GET /api/datasets/demo/warnings` returns the top 20, bands, and three reasons.
  - _Verification:_ contract test exits 0; response matches saved warning rows; rank is stable.
- [ ] **3.2 Build the Today page.**
  - List on the left, selected shelf on the right; mode banner and claim labels.
  - _Verification:_ browser check on `/app`; selection loads the shelf; zero console errors.
- [ ] **3.3 Build the shelf detail.**
  - Sold-vs-usual chart, empty-shelf marks, reasons, three fixes, assumptions.
  - _Verification:_ browser check; chart uses saved rows; every fix shows its assumption; no invented number.
- [ ] **3.4 Build the decision transaction.**
  - Approve or reject; lock the sender; recompute surplus; insert once; subtract once; save the simulated outcome.
  - _Verification:_ integration test with two concurrent approvals; exactly one movement; second request returns the same record; no negative stock.
- [ ] **3.5 Build the decision UI.**
  - Approve and reject buttons; saved state after refresh.
  - _Verification:_ browser check; double click does not duplicate; refresh shows the saved decision.
- [ ] **3.6 Save the simulated outcome.**
  - Apply the fix assumptions; never claim real money.
  - _Verification:_ integration test; outcome row exists; label is `simulated`.

---

## Phase 4 — Proof page

- [ ] **4.1 Read the proof.**
  - `GET /api/datasets/demo/proof` returns the three real scores, the replay, and the losses.
  - _Verification:_ contract test; every number matches `proof.json`; labels are present.
- [ ] **4.2 Build the Proof page.**
  - Scores, model card, losses, assistant check, data credit.
  - _Verification:_ browser check; `real`, `learned`, `assumed`, and `simulated` labels are visible; losses are visible.
- [ ] **4.3 Show the losses.**
  - At least one real missed shelf and one replay day where Outpost did worse.
  - _Verification:_ each loss has a one-line reason; no cherry-picked success only.
- [ ] **4.4 Guard the claim register.**
  - One code constant mirrors `CLAIMS.md`; screens read it.
  - _Verification:_ unit test; every visible claim has a status from `proven`, `rule`, `watch`, or `simulated`; `pending` and `failed` are never shown as active.

---

## Phase 5 — Bring data and modes

- [ ] **5.1 Build the upload UI.**
  - File drop, header read, column mapping, unit scale, day boundary, currency, preview.
  - _Verification:_ browser flow with a fixture CSV; mapping and load work without code.
- [ ] **5.2 Validate and load all or nothing.**
  - Required columns, duplicates, negative quantities, flag values, dates, optional-field rules, caps.
  - _Verification:_ bad fixtures are rejected with the exact reason; zero partial rows remain.
- [ ] **5.3 Detect the data mode.**
  - `full` when the dataset range is at least 28 days and the empty flag has at least 7 known days, one `yes`, and one `no`.
  - `rule` when not full and stock plus delivery time exist.
  - `watch` when only sales exist.
  - `no_mode` when the dataset has under 28 days.
  - A shelf with fewer than 28 days gets `not enough history` and no warning, even in `full`.
  - _Verification:_ four fixtures return the correct mode and active claims; no visitor choice can override the mode.
- [ ] **5.4 Show the mode banner and claim labels.**
  - Every screen says the mode and what it can claim.
  - _Verification:_ browser check each mode; no claim outside the mode's list.
- [ ] **5.5 Isolate visitors.**
  - Signed HttpOnly cookie; each visitor sees only their uploads; the demo is shared and never overwritten.
  - _Verification:_ two cookie jars see different datasets; the demo is unchanged after an upload.
- [ ] **5.6 Expire and remove data.**
  - 7-day expiry; "Remove my data" cascades.
  - _Verification:_ expiry cleanup deletes the dataset and children; remove deletes in one transaction.
- [ ] **5.7 Enforce caps and rate limits.**
  - 25 MB per file, 100 MB uncompressed ZIP, 2M rows, 10k shelves; per-visitor limits.
  - _Verification:_ each cap is rejected with the cap named; abuse returns 429.
- [ ] **5.8 Compute the upload proof.**
  - Full: demand and warning scores on the last 30 days or 20% with a 7-day minimum.
  - Rule: demand accuracy only.
  - Watch: uncorrected demand accuracy only.
  - No mode: no proof.
  - _Verification:_ one fixture per mode; labels match the mode; no catch-rate claim in Rule or Watch.

---

## Phase 6 — Rule and Watch modes

- [ ] **6.1 Build the rule warning.**
  - Days of cover = current stock / expected daily demand; warn when cover is below lead time plus one safety day; rank by cover.
  - _Verification:_ fixture with stock and delivery time; warnings ranked; reasons say the cover and the delivery days; label says `rule`, not learned.
- [ ] **6.2 Build rule fixes.**
  - Move, reorder, hold; assumptions visible; no replay.
  - _Verification:_ integration test; amounts never exceed safe surplus; no replay row is created.
- [ ] **6.3 Build Demand watch.**
  - Demand estimate and accuracy only; no warning, no fixes.
  - _Verification:_ fixture with sales only; page says it cannot predict empty shelves; no warning row exists.
- [ ] **6.4 Build No mode.**
  - Simple average; "not enough history"; no claims.
  - _Verification:_ fixture under 28 days; no warning, no proof, no fix.
- [ ] **6.5 Test the mode copy and refusals.**
  - The assistant refuses questions the mode cannot support.
  - _Verification:_ one refusal fixture per reduced mode; no unsupported number is spoken.

---

## Phase 7 — Assistant

- [ ] **7.1 Build the six read-only tools.**
  - Shelf history, demand estimate, warning reasons, safe surplus, delivery and travel, saved decisions and outcomes.
  - _Verification:_ unit tests; each tool returns saved facts; no raw rows.
- [ ] **7.2 Build the provider interface and offline provider.**
  - One function; provider chosen later; offline provider uses the same tools.
  - _Verification:_ offline provider answers the 40-question check with no network calls.
- [ ] **7.3 Build the answer validator.**
  - Every number must match a tool result; retry once; then refuse.
  - _Verification:_ adversarial fixtures; wrong numbers are rejected; unsupported questions are refused.
- [ ] **7.4 Run the 40-question check.**
  - 20 facts, 10 refusals, 10 paraphrases; bars 18/20, 10/10, 9/10.
  - _Verification:_ check run exits 0; progress is stored in small steps; a miss fails the release.
- [ ] **7.5 Plug the chosen provider.**
  - Provider is still open; do not commit one before the owner chooses.
  - _Verification:_ same 40 questions with the chosen provider; speed and cost stored; no raw rows leave the app.
- [ ] **7.6 Build the assistant UI.**
  - Ask box; answer; "Where this came from"; refusal copy.
  - _Verification:_ browser check; answer numbers match sources; refusal is clear.

---

## Phase 8 — Replay and losses

- [ ] **8.1 Build the replay engine.**
  - Full mode only; stock, travel time, and price required; both arms use the same fixed approval rule; no future peeking.
  - _Verification:_ integration test; both arms get every valid proposal; no future row is read.
- [ ] **8.2 Store the replay proof.**
  - Simulated label; losses; one-line reasons.
  - _Verification:_ proof row matches the run; every money number is labelled simulated.
- [ ] **8.3 Show the replay.**
  - Proof page block with the losses.
  - _Verification:_ browser check; "simulated" label is visible; losses are not hidden.

---

## Phase 9 — Landing, Method, design

- [ ] **9.1 Apply the design system.**
  - Tokens and components from `DESIGN.md`; no hardcoded colours outside tokens.
  - _Verification:_ visual check; no glass, no nested boxes, no fake charts.
- [ ] **9.2 Build the landing page.**
  - Promise, proof strip, how it works, real vs assumed, the miss, bring data; one call to action.
  - _Verification:_ browser check; copy is everyday language; one `Open the demo` button.
- [ ] **9.3 Build the Method page.**
  - Contract, baselines, splits, study gate, assistant check, limits, data credit.
  - _Verification:_ browser check; every claim links to its status.
- [ ] **9.4 Check the landing on a phone.**
  - 375px and 768px.
  - _Verification:_ zero horizontal overflow; buttons reachable; no tiny text.
- [ ] **9.5 Audit copy and accessibility.**
  - No jargon; focus states; contrast; reduced motion.
  - _Verification:_ checklist passes; keyboard-only path works.

---

## Phase 10 — Verification skill, deploy, final audit

- [ ] **10.1 Finish the verification skill.**
  - One feature file per surface; one command per feature.
  - _Verification:_ skill loads; each feature command exits 0 on the demo.
- [ ] **10.2 Deploy.**
  - Host is open; one app plus one Postgres; seed the demo, artifact, and proof.
  - _Verification:_ public URL loads; health check passes; upload, reset, and proof work.
- [ ] **10.3 Run the final audit.**
  - Every claim has a status; every screen has a label; losses are visible; the assistant check is reported.
  - _Verification:_ audit checklist passes; no contradiction between docs and UI.
- [ ] **10.4 Write the final journal card.**
  - Problem, change, proof, still broken.
  - _Verification:_ card exists with the exact run output.
