# GLOSSARY.md — Outpost Domain Language

Read this at the start of every session. Use these words in code, tests, and UI. If a word is not here, do not invent a second name for it.

---

## Core Entities

| Term | What it means in Outpost | Never call it |
|---|---|---|
| **Shelf** | One product in one store. The unit of warning, fix, and proof. | SKU, item, row, store-product |
| **Store** | A physical shop that holds shelves. | Location, branch, node |
| **Product** | The item on the shelf. | SKU, article, item |
| **Empty shelf** | A shelf with no stock for at least one open hour. Sales understate demand. | Stockout in UI; zero sales |
| **Empty-shelf flag** | The daily record: `yes`, `no`, or `unknown`. | Null, missing, zero |
| **Hidden demand** | What people wanted but could not buy because the shelf was empty. | Lost sales, phantom demand |
| **Corrected demand** | An estimate of observed sales plus hidden demand. | True demand, real demand |
| **Sold vs usual** | The two lines on the evidence chart: what we sold, and about how much the shelf usually sells on the same day of the week. | Actual vs forecast |
| **Warning** | A daily alert that one shelf is likely to have an empty hour in the next 24 hours. | Prediction, alert, risk score |
| **Alert budget** | The top 20 warnings per day that are scored and shown. | Threshold, quota |
| **Warning band** | `high`, `medium`, or `low`, based on rank, not a claimed probability. | Risk level, confidence |
| **Reason** | One of the top three model contributions behind a warning. | Explanation, feature |
| **Fix** | One of three responses: move stock, reorder, or do nothing. | Action, recommendation, plan |
| **Safe surplus** | Stock above the sender's own expected demand until the next delivery, plus a safety margin, minus committed moves. | Excess, buffer |
| **Delivery time** | Days until the next delivery arrives. Also called lead time. | Restock time, replenishment |
| **Travel time** | Days for a move from one store to another to arrive. | Transit, route time |
| **Cover** | Days of stock left: current stock divided by expected daily demand. | Days of supply, DOC |
| **Mode** | The data-driven label that decides what the app may claim. | Tier, plan, level |
| **Full mode** | Sales plus usable empty-shelf labels. The learned warning is allowed. | Full claims, premium |
| **Rule mode** | Sales plus stock and delivery time, but no usable empty labels. A days-of-cover rule is allowed, labelled `rule`. | Fallback mode, basic mode |
| **Demand watch** | Sales only. Demand estimate and accuracy only. | Sales mode, basic |
| **No mode** | Under 28 days of history. A simple average and `not enough history` only. | Cold start, empty |
| **Active dataset** | The demo or the visitor's upload currently shown in the URL. | Selected dataset, current file |
| **Demo** | The shared, open, reset-able Full-mode dataset. | Sample, sandbox |
| **Visitor** | A browser with a signed cookie. Not an account. | User, member, customer |
| **Upload** | A dataset a visitor brings. Private to that visitor for 7 days. | Import, file, data source |
| **Claim** | A statement the app makes about what it can do or how well it did. | Metric, feature, promise |
| **Claim register** | The single table of every claim and its status in `CLAIMS.md`. | Scorecard, results |
| **Proof** | Three real scores plus one simulated replay plus the losses. | Results, report |
| **Primary proof** | The precomputed proof for the demo's unseen test cities. | Demo proof, main proof |
| **Upload proof** | The out-of-sample score on an upload's held-out days. | Custom proof |
| **Replay** | A simulated comparison of Outpost against doing nothing. | Backtest, simulation |
| **Loss** | A real missed shelf or a replay day where Outpost did worse. | Error, failure |
| **Assistant check** | The 40-question test of the assistant. | Quiz, eval |
| **Model artifact** | The frozen JSON with feature order, means, standard deviations, coefficients, intercept, and version. | Model, weights |
| **Feature spec** | The one JSON file that lists every feature, window, and transformation. | Schema, config |
| **Parity** | Python and TypeScript produce the same feature values on a frozen sample. | Consistency, match |
| **Study gate** | The fixed bars the offline study must pass before the app is built. | Threshold, criteria |
| **Test city** | One of the 3 cities the model never trains on. | Holdout city |
| **Reference day** | The representative demo day, chosen after the study. Not the proof. | Demo day, showcase |
| **Real** | Comes from the dataset or a saved record. | Actual |
| **Learned** | Comes from the model artifact, trained offline. | Predicted, AI |
| **Assumed** | Comes from a declared assumption: stock, price, travel, cost, or delivery. | Estimated, fake |
| **Simulated** | Comes from the replay or the fix simulation. Never real money. | Modelled, projected |

---

## Business Rules

1. An empty shelf hides demand. Never treat low sales on an empty day as low demand.
2. A zero-sales day is not an empty day unless the empty flag says `yes`.
3. A null or missing empty flag is `unknown`, never `no`.
4. The data decides the mode. The visitor cannot choose a higher mode.
5. Full mode needs a dataset range of at least 28 days and at least 7 known empty-flag days, with one `yes` and one `no`. A shelf with fewer than 28 days gets no warning, even in Full mode.
6. Rule mode is a rule, not a learned model. It never claims a catch rate.
7. Demand watch has no empty-shelf warning and no fixes.
8. No mode has no warning, no fix, and no proof.
9. No priced fix without stock, travel time, and price.
10. No replay outside Full mode with stock, travel time, and price.
11. No stock is ever created. A move subtracts from the sender and adds to the receiver.
12. The sender keeps enough stock for its own expected demand until the next delivery.
13. One decision per warning per visitor. Repeats return the same record.
14. A warning is one per shelf per morning. The top 20 are the alert budget.
15. A claim without a status is not shown.
16. `pending` and `failed` claims are never shown as active.
17. Every money number is either real, assumed, or simulated, and labelled.
18. Losses are part of the proof. They are never removed.
19. The demo is shared and reset-able. An upload never changes it.
20. Uploads are private to a visitor and expire after 7 days.
21. No raw rows leave the app. Only computed facts go to the model.
22. No store, product, city, or category identity enters the model.
23. No per-upload training. The artifact is fixed.
24. Only data up to the decision day is visible.
25. Every dataset is credited.
26. No passwords, no accounts, no login.

---

## User Roles

| Role | Can do | Cannot do |
|---|---|---|
| **Visitor** | Open the demo, upload data, browse warnings, ask the assistant, approve or reject, view proof, reset the demo | See another visitor's upload, change the mode, edit the model |
| **Planner** | The visitor's job in the story: decide which shelf to fix | Move stock without approving, see true demand |
| **Owner** | Approve scope, provider, host, and any change to the locked decisions | — |
| **Assistant** | Read the six tools and answer from saved records | Write, invent a number, propose a fourth fix, see raw rows |

---

## State Machines

**Claim status**

| Status | Meaning | Can become |
|---|---|---|
| `pending` | Not yet scored | `proven`, `failed`, `rule`, `watch`, `simulated` |
| `proven` | Scored and passed the bar on held-out data | `failed` only with new evidence |
| `failed` | Scored and missed the bar | Stays failed for that version |
| `rule` | A deterministic rule, not a learned claim | Stays `rule` |
| `watch` | Demand-only claim | Stays `watch` |
| `simulated` | From a labelled simulation | Stays `simulated` |

**Upload status**

| Status | Meaning | Can become |
|---|---|---|
| `created` | File received, not checked | `validating`, `failed` |
| `validating` | Columns, types, caps, and keys checked | `loading`, `failed` |
| `loading` | Rows inserted in batches | `ready`, `failed` |
| `ready` | Dataset usable | `expired` |
| `failed` | No rows kept | `created` on retry |
| `expired` | Past 7 days | Deleted |

**Decision status**

| Status | Meaning | Can become |
|---|---|---|
| `proposed` | A fix is shown, not chosen | `approved`, `rejected` |
| `approved` | One record saved; stock committed | `simulated` |
| `rejected` | No stock change | — |
| `simulated` | Outcome stored | — |

**Proof run status**

| Status | Meaning | Can become |
|---|---|---|
| `pending` | Run created | `running`, `failed` |
| `running` | Steps processing | `done`, `failed` |
| `done` | Scores and losses stored | — |
| `failed` | Error stored; no partial score shown | `pending` on retry |

**Warning band**

| Band | Meaning |
|---|---|
| `high` | Top 20 by rank |
| `medium` | Next 30 by rank |
| `low` | The rest |

---

## Key Workflows

1. **Bring data:** drop files → read headers → map columns → declare unit, day, currency → validate → detect mode → load all or nothing → show the report and active claims.
2. **Morning loop:** open Today → see the ranked warnings → open one shelf → read the sold-vs-usual chart, reasons, and fixes → ask a question → approve or reject.
3. **Approve:** lock the sender → recompute safe surplus → verify the fix → save one decision → subtract once → save the simulated outcome.
4. **Proof:** open Proof → read the three real scores → read the simulated replay → read the losses → check the model card and data credit.
5. **Assistant:** ask → the assistant calls read-only tools → every number is checked → answer with sources, or refuse.
6. **Study:** download → parse → build shelf-days → split 15/3 cities → build features → score baselines → train warning → train demand → apply gate → freeze artifacts → write results.
7. **Demo reset:** clear demo decisions and simulated outcomes → keep warnings and proof → return to the saved start.

---

## Study Terms

| Term | What it means in Outpost | Never call it |
|---|---|---|
| **Pre-registration** | The fixed study decisions written before scoring: split, target, budget, bars, estimator, replay assumptions. | Plan, draft |
| **Primary target** | One empty-shelf hour in the next 24 hours. The gate uses this target. | Main metric |
| **Primary budget** | The top 20 warnings per day. The gate uses this budget. | Alert limit |
| **Sensitivity view** | A secondary cut reported for context: 2+ empty hours, top 50, top 100, top-5 set change, 1/2/3-day stock. It never changes the gate. | Second gate, backup result |
| **Clear win** | A high-band warning that came true and a fix that would have prevented at least one empty hour. | Good example |
| **Clear miss** | A shelf that emptied with no high-band warning. | Failure story |

---

## Naming Conventions

| Thing | Convention | Example |
|---|---|---|
| Database tables | snake_case, plural | `proof_runs` |
| Database columns | snake_case | `empty_flag`, `lead_time_hours` |
| TypeScript types | PascalCase | `Warning`, `Fix`, `ClaimStatus` |
| React components | PascalCase | `ShelfDetail`, `ProofScore` |
| API routes | kebab-case | `/api/datasets/:id/warnings` |
| Modes | lowercase strings | `full`, `rule`, `watch`, `no_mode` |
| Claim statuses | lowercase strings | `proven`, `failed`, `rule`, `watch`, `simulated` |
| Python modules | snake_case | `train_warning.py` |
| JSON artifacts | snake_case | `model.json`, `feature_spec.json`, `proof.json` |
| UI: shelf | "shelf" | "This shelf may run out" |
| UI: product | "product" | "Milk" |
| UI: demand | "about how much it usually sells" | "What we sold vs about how much it usually sells" |
| UI: correction | "our estimate" | "Our estimate, not true demand" |
| UI: warning | "chance this shelf runs out" | "High chance" |
| Code: stockout | `stockout` is allowed internally | `empty_flag`, `stockout_hour` |

---

## ADRs — Architecture Decision Records

| Date | Decision | Why |
|---|---|---|
| 2026-11-17 | [0001](docs/adr/0001-fixed-model-artifact.md) Fixed model artifact trained offline | Works on any dataset; no per-upload training; no circular proof |
| 2026-11-17 | [0002](docs/adr/0002-per-visitor-uploads.md) Per-visitor uploads behind a signed cookie | Open demo without accounts; no leaks; no overwrites |
| 2026-11-17 | [0003](docs/adr/0003-proof-protocol.md) Precomputed primary proof, out-of-sample upload proof | Honest, comparable, and fixed before scoring |
| 2026-11-17 | [0004](docs/adr/0004-assistant-boundary.md) Tool-grounded, provider-agnostic assistant | No invented numbers; provider can change |
| 2026-11-17 | [0005](docs/adr/0005-one-app-batched-jobs.md) One app, Postgres, client-polled steps | Simple deploy; no queue or worker |
| 2026-11-17 | [0006](docs/adr/0006-three-data-modes.md) Three data modes plus No mode | Claims match the data; no silent overclaiming |
| 2026-11-17 | [0007](docs/adr/0007-study-gate-and-claim-register.md) Study gate and claim register | No app around an unproven model; losses visible |
| 2026-11-17 | [0008](docs/adr/0008-second-dataset.md) UCI Online Retail II for Demand watch only | Proves the front door without diluting the core claim |
| 2026-11-17 | [0009](docs/adr/0009-study-preregistration.md) Fixed study pre-registration | No moving the split, target, budget, or bars after scoring |
