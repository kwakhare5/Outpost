# Outpost Architecture

Status: locked direction, 2026-11-17. Companion to `PRD.md`. This document covers the backend, the data path, the model path, the decision path, and the proof. Design tokens and components live in `DESIGN.md` (next).

---

## 1. The shape

```
Browser
  landing / control room / method
          |
          v
Next.js app  (pages + route handlers)
          |                         \
          |                          \-- assistant tools --> model provider (open choice)
          v
Postgres
  datasets, sales, ops, routes, quality, warnings, fixes,
  decisions, outcomes, assistant runs, proof runs, model versions
          ^
          |
Offline Python study  (never runs in production)
  download -> clean -> features -> train/test -> model artifact + proof results
```

Four parts:

1. **One Next.js app.** Pages and API in one deployable unit.
2. **One Postgres.** Every dataset, warning, fix, decision, answer, and score.
3. **One offline Python study.** Trains and scores the model once. It never runs in the app.
4. **One model provider plug.** The provider is chosen later. The interface is fixed now.

Principles:

- One app, one database. No queue, no worker, no separate service.
- The study never runs in production. It produces two files: the model artifact and the proof results.
- The app never trains on an upload. The artifact is fixed.
- Everything on screen traces to a saved row.
- No store, product, city, or category identity enters the model.
- No passwords. A signed cookie scopes a visitor's uploads.

---

## 2. Two modes and the reference day

**Demo mode**

- The primary FreshRetailNet dataset is seeded once.
- Warnings and the full proof are precomputed by the offline study.
- The demo is shared. Decisions are shared. A reset clears the decisions and returns to the saved start.
- The decision day is the last observed day. Warnings target the next day, which exists in the dataset but is hidden from the model at decision time. The warning is scored against the real next day. The fix effect is simulated.

**Upload mode**

- A visitor uploads a dataset. It is validated, stored, and computed at load.
- The decision day is the last observed day in the upload. Warnings target the next day.
- The proof is computed on the upload's own held-out days: the last 30 days, or 20% of the history, whichever is smaller, with a minimum of 7 days. Below 28 days of history, only a simple average and a demand watch.
- Uploads are private to the visitor. They never change the demo.

**Active dataset**

The app resolves the active dataset from the URL: `/app` means the demo, `/app?dataset=<id>` means an upload. The server checks that the dataset is the demo or belongs to the visitor. There is no server-side "selected dataset" state.

---

## 3. The runtime flow

1. Middleware reads the signed visitor cookie, or sets one if missing.
2. The request resolves the active dataset and its quality report.
3. **Today** reads saved warnings for the demo, or computed warnings for an upload.
4. Opening a warning reads its evidence and its three fixes.
5. **Ask** calls the assistant with the dataset, the warning, and the question.
6. **Approve** or **reject** saves one decision in a transaction and applies the simulated outcome.
7. **Proof** reads saved scores. The assistant check and the replay run on demand.

Every write is idempotent. Every read is scoped to the visitor or the demo.

---

## 4. Ingestion and the data contract

Required fields: store, product, date, quantity, empty shelf (yes, no, unknown).
Optional fields: hourly sales, current stock, price, delivery time, travel time, holidays, promotions, weather.

**Upload flow**

1. The browser reads the selected files' headers and suggests a mapping. If the headers match, the mapping is automatic.
2. The visitor confirms the unit scale, the day boundary, and the currency.
3. `POST /api/datasets` sends the files and the mapping as multipart.
4. The server checks size caps, parses the files as a stream, validates every row, and inserts in batches.
5. The dataset starts as `loading`. On success it becomes `ready`. On failure every row is deleted; there is no partial dataset.
6. Features and warnings are computed before the response when the dataset is under the cap. The response returns the dataset id, the quality report, and the active claims.
7. The browser goes to `/app?dataset=<id>`.

**Caps (initial, tunable)**

- 25 MB per file, 100 MB uncompressed per ZIP.
- 2 million sales rows, 10,000 shelves.
- A ZIP archive is unpacked with one small library; a compressed bomb is rejected by the uncompressed cap.

**Validation**

- Required columns present and parseable.
- No duplicate store, product, and day.
- No negative quantities.
- Empty flag is yes, no, or unknown.
- Dates are inside the declared range.
- Every store and product referenced by the optional files exists in the sales file.
- Unknown zero days: quantity is zero and the empty flag is unknown.
- Missing optional fields reduce the claims; they never fail the load.

**Dataset declaration**

The unit scale, day boundary, and currency are stored with the dataset. Normalized sales are never shown as packs or rupees. Every screen shows the declaration.

---

## 5. Database

Twelve tables.

| Table | Key columns | Purpose |
|---|---|---|
| `datasets` | id, visitor_id, name, source, license, unit_label, day_boundary, currency, mode, is_demo, status | One row per dataset. `visitor_id` is null for the demo. |
| `sales` | dataset_id, store_id, product_id, day, quantity, empty_flag, hourly | One row per shelf per day. `hourly` is optional JSON. |
| `ops` | dataset_id, store_id, product_id, stock, price, lead_time_hours | Optional inputs for priced fixes. |
| `routes` | dataset_id, from_store, to_store, hours | Optional travel times. |
| `data_quality` | dataset_id, report | The validation report. |
| `warnings` | id, dataset_id, store_id, product_id, as_of_day, target_day, score, band, rank, reasons, model_version | One warning per shelf per day. |
| `fixes` | id, warning_id, kind, amount, from_store, arrive_at, cost, cover_days, assumptions, recommended | Move, reorder, or hold. |
| `decisions` | id, warning_id, fix_id, visitor_id, action, snapshot, idempotency_key, created_at | One decision per warning per visitor. |
| `outcomes` | decision_id, simulated_available, simulated_lost, empty_hours, notes | The simulated result of a decision. |
| `assistant_runs` | id, dataset_id, visitor_id, question, answer, facts, sources, tool_calls, latency_ms, cost, provider, model, validation, check_run_id | One row per answer. |
| `proof_runs` | id, dataset_id, kind, status, progress, scores, losses, split, model_version, policy_version, started_at, finished_at | Primary proof, upload proof, assistant check, or replay. |
| `model_versions` | id, kind, artifact, feature_spec, trained_cities, test_cities, metrics, created_at | The fixed artifact and its training record. |

**Indexes**

- `sales(dataset_id, store_id, product_id, day)` and `sales(dataset_id, day)`.
- `warnings(dataset_id, as_of_day, rank)` and a unique index on `(dataset_id, store_id, product_id, as_of_day)`.
- `fixes(warning_id)`.
- A unique index on `decisions(warning_id, coalesce(visitor_id, 'demo'))`.
- `assistant_runs(dataset_id, created_at)`.
- `proof_runs(dataset_id, kind, created_at)`.
- `datasets(visitor_id, created_at)`.
- `routes(dataset_id, from_store, to_store)`.
- `ops(dataset_id, store_id, product_id)`.

**Retention**

- Uploads expire after 7 days. A cleanup command deletes expired datasets and their rows.
- "Remove my data" deletes the visitor's dataset and everything that hangs off it in one transaction.
- The demo is stable and reset-able.
- No raw rows leave the database.

---

## 6. Features

Features are computed for a shelf on a decision day, using only days before that day.

- Mean sales over the last 7, 14, and 28 days, using the corrected demand.
- Mean for the same weekday over the last 4 weeks.
- Trend: last 7 days against the previous 7.
- Empty-shelf days in the last 7, 14, and 28 days.
- Days since the last empty shelf.
- Empty rate over the last 14 days.
- Optional: holiday, promotion, weather.

No store, product, city, or category identity is a feature.

**Feature parity**

- One `feature_spec.json` lists every feature, its window, and its transformation.
- Python builds training features from the spec.
- TypeScript builds runtime features from the same spec.
- A parity test compares both outputs on a frozen 100-row sample. Drift fails the build.

---

## 7. Demand estimate and hidden demand

**Normal level.** For each shelf, the mean corrected demand for each weekday, using days when the shelf was not empty. A short trend adjustment is added.

**Empty days.** When a day is marked empty, the observed sales are a lower bound. The estimated demand for that day is the normal weekday level, adjusted for trend, never below the observed sales. The gap is the hidden units.

**Hourly detail.** When hourly sales and empty hours exist, the fill share is `1 - empty hours / open hours`. The estimate is sharpened by the fill share, with a floor so a near-empty day cannot explode. The floor is an assumption and is labelled.

**Future days.** The estimate for the next day is the normal weekday level plus trend. There is no future empty flag and no peeking.

**Scoring.** The demand score is the average miss on days the shelf was not empty, against the lazy guess: the same weekday last week. The correction's effect is reported separately, never as recovered truth.

---

## 8. Warning model

**Target.** At least one empty-shelf hour in the next 24 hours, which is the next day for daily data.

**Model.** Logistic regression on standardized features. Default choice: the coefficients give the top three reasons exactly, and inference is a dot product plus a sigmoid in TypeScript.

**Training.** 15 cities, 3 cities never seen, each city's last 30 days held out. The test cities are chosen before looking at results. No dataset split is used as-is.

**Artifact.** A JSON file with the feature order, means, standard deviations, coefficients, intercept, version, trained cities, test cities, and metrics. It is loaded once per process.

**Runtime.** TypeScript computes the same features, standardizes them, and applies the artifact. No Python runs in production.

**Ranking and bands.** The top 20 warnings per day are the scored budget. `min(20, shelves)` when the dataset is small. Band: high for the top 20, medium for the next 30, low for the rest. The band is rank-based, not a claimed probability.

**Reasons.** The top three positive contributions, each with a plain label, the feature value, and its contribution. No invented explanations.

**Model card.** The Proof page shows the trained cities, the test cities, the feature list, and the explicit no-identity rule.

---

## 9. Fix engine

The fix engine is calculation, not AI. It never calls the assistant.

**Move stock.** Find another store with the same product. Safe surplus is current stock minus expected demand until the next delivery, minus a safety margin, minus amounts already committed to approved moves. The amount is the smaller of the need and the surplus. Arrival is the route time. Cost and cover come from the declared assumptions.

**Reorder.** Arrival is the lead time. The option is marked too late when it arrives after the expected empty hour. Cost is the declared assumption.

**Do nothing.** Shows the expected empty hours and lost sales under the stated assumptions.

**Recommendation.** The in-time option with the lowest cost per covered unit. No optimizer, no multi-product plan. A simple, explainable choice.

**Approval transaction**

1. Lock the sender's stock row.
2. Recompute the safe surplus inside the lock.
3. Verify the fix still fits. Scale down or fail with the new number; never hide it.
4. Insert the decision once. A unique index makes repeats return the same record.
5. Subtract the committed amount; the simulation never creates stock.
6. Store the simulated outcome.

If two approvals compete for the same stock, the database decides, not the UI.

---

## 10. Assistant

**Six read-only tools**

1. Shelf history: sales, empty days, corrected demand.
2. Demand estimate: the estimate, the lazy guess, the correction.
3. Warning: score, band, reasons, rank.
4. Safe surplus: another store's surplus and its committed moves.
5. Delivery and travel: lead time, route time, next delivery.
6. Saved decisions and outcomes: what was approved, rejected, and what happened.

**Provider interface.** One function: given a question and tool results, return text, tool calls, and usage. The provider is chosen later. An offline provider answers the 40-question check from the same tools. No provider is committed yet.

**Grounding.** Every number in an answer must match a tool result within a tolerance. Every tool call is recorded. An answer that fails validation is rejected and retried once; if it fails again, the assistant says it cannot prove the answer.

**Privacy.** Only computed facts go to the provider. Raw rows never leave the app.

**The 40-question check.** 20 facts, 10 refusals, 10 never-seen wordings, instantiated from the loaded dataset's records. Expected facts are computed from records. Pass bars: 18 of 20, 10 of 10, 9 of 10. The check runs in small steps and stores progress. A miss fails the release. An offline run is marked not run.

**Limits.** Rate limit per visitor. Speed and cost are stored per answer. The slowest 1 in 20 and the median cost appear on Proof.

---

## 11. Proof

**Primary dataset.** The offline study produces a proof file with the three real scores, the replay, the losses, the split, and the model card. It is seeded into `proof_runs`. The app reads it. It is never recomputed in production.

**Uploaded dataset.** The fixed artifact was never trained on it, so the proof is out-of-sample. The app computes demand and warning scores on the held-out window. The assistant check runs on demand. The replay runs only when stock, travel time, and prices exist.

**The claims**

1. Demand accuracy: average miss against the lazy guess, with and without the correction, on days without empty shelves.
2. Warning quality: catch rate and false alarms at the alert budget, against the fixed simple rule, on unseen cities and future days.
3. Assistant: the 40-question check, speed, cost.
4. Replay: Outpost against doing nothing, labelled simulated.

**Replay rules**

- Both arms get every valid proposal approved by the same fixed rule.
- The hold arm does nothing.
- The demand estimate at decision time is used; the app never reads the future.
- The outcome is simulated, never a real-store rupee claim.
- Losses are stored and shown.

**Losses.** Real missed shelves from the warning score, and replay days where Outpost did worse. Each with a one-line reason.

---

## 12. API

| Route | Method | Purpose |
|---|---|---|
| `/api/datasets` | POST | Upload and load a dataset. Multipart. |
| `/api/datasets` | GET | The visitor's datasets plus the demo. |
| `/api/datasets/:id` | GET | Dataset, quality, mode, active claims. |
| `/api/datasets/:id` | DELETE | Remove my data. Visitor check. |
| `/api/datasets/:id/warnings` | GET | Ranked warnings for the decision day. |
| `/api/warnings/:id` | GET | Evidence, reasons, fixes. |
| `/api/decisions` | POST | Approve or reject. Idempotent. |
| `/api/assistant` | POST | Ask a question. Rate-limited. |
| `/api/datasets/:id/proof` | GET | Saved proof runs and scores. |
| `/api/datasets/:id/proof` | POST | Start an assistant check or replay. |
| `/api/proof/runs/:id/step` | POST | Process the next small batch. |
| `/api/proof/runs/:id` | GET | Progress and results. |
| `/api/demo/reset` | POST | Reset the shared demo decisions. |

All write routes check the origin, the visitor cookie, and the rate limit. All SQL is parameterized.

---

## 13. Sessions, security, privacy

- A signed HttpOnly cookie holds a random visitor id. `SameSite=Lax`, `Secure` in production. No accounts, no passwords.
- The cookie is not a login. It scopes uploads and assistant runs. Clearing it loses access to an upload; the data expires.
- Write routes require the `Origin` header to match `APP_ORIGIN`.
- Rate limits use stored counts: uploads per visitor per hour, assistant runs per visitor per hour, proof steps per run.
- Upload caps and ZIP-bomb protection.
- "Remove my data" cascades in one transaction.
- Only computed facts are sent to the model provider. No raw rows.
- No PII. The primary dataset uses anonymized IDs. The demo never invents names.
- Secrets live in environment variables. No secret reaches the client.
- The app never fetches external data at runtime. The dataset is downloaded or uploaded once.

---

## 14. Failure modes

| Failure | Behavior |
|---|---|
| Required column missing | Refuse with the exact column name. No dataset is created. |
| Optional column missing | Load in limited mode; show what cannot be claimed. |
| Duplicate shelf-day rows | Refuse with the count. |
| Negative quantity | Refuse with the count. |
| Too large | Refuse with the cap. |
| Under 28 days | No warnings; simple average and a demand watch. |
| No empty-shelf history | Demand watch only; no empty-shelf claim. |
| No stock, route, or price | Warnings only; no priced fixes. |
| No provider key | Offline answers; the 40-question check is not run. |
| Provider error | Offline answer for that question; the run is marked. |
| Duplicate approval | Return the same record. No double move. |
| Concurrent move over surplus | The lock decides; scale down or fail with the new number. |
| Proof step interrupted | Progress is saved; the next step resumes. |
| Upload fails mid-load | Delete every row; never a partial dataset. |
| Demo reset | Clear demo decisions; warnings and proof stay. |

No silent degradation. Every reduced claim is visible.

---

## 15. Performance

- The demo is precomputed. Pages read indexed rows; they never scan four million rows.
- Uploads are capped and inserted in batches. A streaming parser keeps memory bounded.
- The model artifact is loaded once and cached.
- The warning computation is one pass per shelf over its history.
- The assistant check is batched; each step answers a few questions.
- The replay is precomputed for the primary dataset and capped for uploads.
- Indexes cover every page query.

---

## 16. Testing

- **Unit:** parser, validator, feature computation, demand correction, warning score, safe surplus, fix recommendation, idempotency, proof math, answer validator.
- **Integration:** upload, load, warnings, decision, proof against a real test Postgres. No mocks of the database.
- **Parity:** Python and TypeScript features on a frozen sample.
- **Golden:** the saved primary proof reproduces exactly from the saved data and artifact.
- **Assistant:** the offline provider is a real code path; deterministic. The live provider check is a separate run.
- **UI:** the local verification skill drives the golden path and the reduced modes.
- No test hardcodes a success number. The proof numbers come from the run.

---

## 17. Deployment

- Local: Docker Postgres, Next.js dev server, Python study on the machine.
- Public: one Next.js host and one Postgres. The primary dataset, the artifact, and the proof file are seeded at deploy time. The Python study is not deployed.
- Env: `DATABASE_URL`, `TEST_DATABASE_URL`, `SESSION_SECRET`, `APP_ORIGIN`, and later the model provider key.
- No queue, no worker. The assistant check uses client-polled steps.
- The deploy host is open; the architecture is host-agnostic.

---

## 18. Build order

1. Offline study: download, clean, split, train, score, export the artifact and proof.
2. Schema, migrations, and the primary dataset seed.
3. TypeScript features and the parity test.
4. Demand, warnings, fix engine, Today and One shelf.
5. Upload, validation, sessions, and Bring data.
6. Proof engine, Proof page, and upload proof.
7. Assistant tools, offline provider, and the 40-question check.
8. The provider plug.
9. Replay and the losses table.
10. Landing, Method, and the design pass.
11. The verification skill and deploy.

---

## 19. Open decisions

- The model provider.
- The deploy host.
- The second real public dataset.
- The exact caps after the first real upload test.
- The three test cities, chosen before the study is scored.
- The demo's reference day.
- The risk band thresholds, set from the alert budget.
- The final feature list, decided by the study.
