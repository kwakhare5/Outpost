# Outpost: final merged engineering specification

Version: 2026-10-03. Status: build target, not a completion report.

## 1. Purpose and builder instructions

Outpost is a simulated dark-store replenishment exception console for a city inventory/replenishment planner. It is a technical case study for quick-commerce engineering interviews, not a SaaS product, a production system, or proof of company savings.

One loop: `risk -> evidence -> recommendation -> approval -> dispatch -> delayed arrival -> count confirmation -> measured result`.

### Requirements
1.1. Inspect the existing repository, run existing tests, and write a gap list before changing code. Preserve working engine code; do not rebuild from scratch.
1.2. Implement the complete loop before adding breadth. This spec replaces contradictory requirements in the old document.
1.3. Positioning: "Outpost is a working simulation of a dark-store replenishment loop, with explainable rules, human review of exceptions, delayed arrivals, and measured outcomes."
1.4. Complete small increments in section 16's order. Record evidence, not completion claims.

### Acceptance criteria
A reviewer can follow one milk risk through all stages in the app. README and UI state the simulation boundary upfront. No claim of company endorsement, production adoption, real autonomous execution, or proven ROI appears.

## 2. Persona, scope, and autonomy boundary

### Requirements
2.1. Default network: exactly three fictional Mumbai store nodes, Andheri West, Bandra, Powai, with stable IDs. Approximately 15 everyday grocery SKUs, including Amul Taaza Milk 500ml, Britannia Bread 400g, Farm Eggs (6), Mother Dairy Dahi 400g, Banana (1 dozen), Amul Butter 100g.
2.2. Prices, shelf lives, capacities, route times and thresholds are documented simulation assumptions, not company facts.
2.3. Guided story and sandbox use the same engine. Routine simulation and configured routine replenishment run in the background; humans review exceptions, not every order.
2.4. Demand generation, fulfillment, expiry, forecasting and risk evaluation run automatically. A separate explicit routine policy may generate replenishment; log its actions. "Auto-handled" counts actual routine events, not decoration.
2.5. Queue interventions, including transfers, exceptional reorders and simulated markdowns, require approval. Routine policy must not bypass this gate for the same exception.
2.6. Keep "SIMULATED DATA" visible. Qualify the approved footer as "Exception actions only run after approval. Routine simulation runs in the background." Literal "nothing runs" would contradict auto-tick and routine processing.
2.7. No store explorer, map page, general analytics suite, settings product, billing, SaaS layer, scraper, live company connector, new ML model or scale-out. Import/scenario controls stay in the console.

### Acceptance criteria
Three stores and the documented catalog load. Routine actions and exception approvals are visibly distinct. The planner can identify what runs automatically and what needs review.

## 3. Baseline and status honesty

Source: default-branch `docs/OUTPOST_SPEC.md` fetched on 2026-10-03. Its content matched commit `9579b42fe3307af3671fcc8d35f59ba0df7e8f42`. The approved October 3 conversation and supplied three-screen mockups define the updated design.

### Requirements
3.1. Maintain a requirement status table: `not implemented` (including verification pending), `implemented` (code inspected/wired), `tested` (acceptance check executed). Record files, command, commit, date and result. Unit tests alone do not prove frontend or deployment readiness.
3.2. The earlier audit reported 105 backend tests passing. This is a historical baseline, not a fresh run during this merge. Replace README's 270 and old spec's 123 claims; publish actual collected/passed/failed/skipped counts after rerunning.
3.3. Do not repeat "10/10 E2E", green build/lint or working deployment claims without checking. Source-grep tests are not E2E.
3.4. Remove unsourced industry percentages, quotations, turnover/footprint benchmarks and "industry-calibrated" thresholds. Label operational parameters as assumptions.
3.5. Favorita is `not implemented - provenance unverified` until exact source/files/version, terms, transformations and a runnable loader exist. Do not call synthetic Mumbai hourly demand real company data.
3.6. Outreach contacts, pitches and sequencing belong in a separate later document.

### Acceptance criteria
Every completion claim has evidence. Documentation counts agree with the latest run. No unverified dataset or industry claim survives as fact.

## 4. Approved UI: shared shell

### Design assets
Before running Antigravity/Codex, place the three approved mockup images in a `design/` folder next to this spec. Use these exact filenames. The images are the visual design target; the requirements below define behavior. Keep this folder with the spec so the relative image references render and the builder can inspect the screens.

- `design/screen-1-main.png`: Queue, master-detail (section 5).
- `design/screen-2-inflight.png`: In-flight, arrival confirmation (section 6).
- `design/screen-3-outcomes.png`: Outcomes, measured versus expected (section 7).

### Requirements
4.1. Preserve restrained light ops-dashboard styling: navy top bar, pale gray background, white bordered panels, compact tables, green selected/action accents, red stockout and amber expiry/delay labels. No gamification.
4.2. Shared tabs: Queue / In-flight / Outcomes, with engine-derived counts. Outpost left; "Planner: Karan" right.
4.3. Shared simulated date/time, running/paused control labeled 1x, "Advance 1h", and "SIMULATED DATA" badge. All tabs share one clock/state revision.
4.4. Match layout and hierarchy, not invented constants. Compute weekday/date labels. October 3, 2026 is Saturday; October 4 is Sunday. Do not copy the mockups' inconsistent weekday labels.
4.5. Show loading, stale, rejected, failed and disconnected states. No success toast before a backend commit. Disable pending buttons, but still enforce backend idempotency.
4.6. No second frontend engine or fabricated stock defaults. Missing data displays "Unavailable". API failure preserves actual state.
4.7. Desktop is primary; narrow screens stack panes without dropping evidence. Keep keyboard access, visible focus and text labels alongside color.

### Acceptance criteria
Inspect rendered pixels against all three targets at desktop and narrow widths. No clipping, overlapping text, unreadable chart or hidden controls. Counts, time, stock and state agree across tabs.

## 5. Queue: briefing and master-detail

Design target: `design/screen-1-main.png`.

![Approved Queue screen: morning briefing, queue left, selected risk detail right](design/screen-1-main.png)

### Requirements
5.1. Left pane: "Good morning, Karan", date, exception summary, four tiles: fires needing attention, late vans, expiry risks, routine orders auto-handled. Define each count/window; overlapping counts need not sum to the queue length.
5.2. Urgency-sorted queue: SKU, store, risk, impact, recommended action, status, visible severity and "All stores" filter. Sort by earliest actionable impact. Watching items sit below urgent exceptions.
5.3. Click a row to update the right pane in place. Default selected risk: Amul Taaza Milk 500ml, Andheri West. Keep selected-row highlight.
5.4. Right pane contains SKU/store/risk reference; units available; stockout time; forecast demand rate; forecast-versus-actual-sales chart with now and stockout markers; incoming PO/van ID/source/ETA; proposed action/quantity/source/arrival/cost; plain-language reason; projected cost of doing nothing; Approve/Reject; other options considered with rejection/ranking reasons.
5.5. Actual sales stop at now; future points are forecasts. Label requested demand separately because stockout-censored sales are not true demand. Chart axes show units and time.
5.6. Guided milk seed: near 08:00, approximately 38 units, demand about 7.6 units/hour, stockout roughly five hours away; PO-4471 from RFC around 18:40, too late for the initial risk; transfer 40 units from Bandra around 10:15, modeled cost Rs 180.
5.7. Example donor evidence: 112 units against roughly 60 expected local units through 18:00. Validate reservations, safety buffer, shelf life, capacity and ETA. Do not rescue one store by creating a worse donor shortage.
5.8. Approximately Rs 1,390 lost sales and all screenshot arithmetic are illustrative. Derive projections from seed, prices, demand, stock and arrivals. One coherent timeline takes priority over matching placeholders.
5.9. Sandbox buttons under queue: Demand spike 2.5x / Supplier delay / Reset day. Advanced controls and CSV import use a small panel/modal, not another page.

### Acceptance criteria
Selecting another SKU changes all evidence/action fields. Milk projections reconcile with the seed. Zero demand gives no finite stockout horizon; missing data never becomes invented inventory.

## 6. In-flight: dispatch and confirmed receipt

Design target: `design/screen-2-inflight.png`.

![Approved In-flight screen: shipments, event log, arrival count confirmation](design/screen-2-inflight.png)

### Requirements
6.1. Approved milk transfer becomes a real shipment card with the same recommendation UUID, quantity, Bandra -> Andheri West, approval/pick/dispatch timestamps, transit progress and ETA.
6.2. Step trail: approved -> picked -> dispatched -> in transit -> awaiting count confirmation -> received. Progress is bounded/time-based and never credits units.
6.3. Additional cards: persisted evening PO-4471 and seeded bread shipment awaiting count confirmation. They are ledger fixtures, not static cards.
6.4. Event log displays committed events with simulated timestamps; failures stay visible.
6.5. Right pane shows arrival confirmation. Before ETA, label it preview and disable receipt. At/after arrival, confirm received units or report discrepancy. Show sent/received, current stock, projected after stock, cost and updated risk.
6.6. Reservation removes source availability; dispatch deducts source batch units into shipment stock. Destination available stock never increases at approval, pick, dispatch or ETA alone. Only eligible arrival plus committed count confirmation credits it.
6.7. Screenshot 34 -> 74 is a preview example, not a fixed balance. Recompute before-stock after intervening sales. Unconfirmed units cannot be sold.
6.8. Partial/missing/damaged units stay in a discrepancy bucket. Received units cannot exceed sent without a documented adjustment. Expired receipts are quarantined/write-offs, not sellable. Confirmation is idempotent.

### Acceptance criteria
Dispatch lowers donor stock but not receiver stock. UI and direct API reject early receipt. Arrival alone does not credit inventory. Repeated confirmation credits once; partial receipt credits only valid confirmed units. Restart preserves pending shipment/confirmation.

## 7. Outcomes: measured results and failures

Design target: `design/screen-3-outcomes.png`.

![Approved Outcomes screen: summary metrics and measured-versus-expected results](design/screen-3-outcomes.png)

### Requirements
7.1. Approved layout: title/day filter, tiles for resolved exceptions, stockout results, lost-sales value, waste units/value, prediction accuracy; table columns exception / action taken / outcome / measured vs expected / note.
7.2. Seeded history includes successful milk transfer, worse-than-expected dahi markdown, late egg arrival with residual lost sales, rejected banana action, bread transfer. Label it synthetic fixture history, not actual past business activity.
7.3. Freeze expected results at decision time; evaluate actual results over a defined window. Never rewrite a prediction after observing the result.
7.4. Show "Worse than expected" with a defined comparison rule. Include failures, rejections, stockout minutes and discrepancies beside wins.
7.5. Lost units = requested minus fulfilled. Lost-sales value uses documented selling price; waste value uses documented unit cost. Distinguish revenue at risk, expense and modeled net impact.
7.6. "Stockout avoided" requires a paired no-action/baseline replay that would stock out under the same demand path. Otherwise say "No stockout observed in this run". Predicted minus actual loss alone is not causal savings.
7.7. Replace undefined "within forecast error" with a documented tolerance and denominator, or MAE/WAPE. Show per-SKU forecast error with window/horizon/sample count.
7.8. All totals derive from decision/events. Empty history stays empty. No constant "+Rs 1,180 Saved" badges.

### Acceptance criteria
Date filter updates rows and totals together. Records reconcile to the ledger. Underperformance is visible. Counterfactual estimates state the baseline; observed metrics do not imply causal ROI.

## 8. One engine and API contract

### Requirements
8.1. Backend owns inventory, clock, scenarios, demand, recommendations, approvals, shipments and outcomes. Frontend renders state and submits commands. Preserve suitable Next.js/Tailwind, FastAPI, SQLite and existing execution workflow; no LLM-made decisions.
8.2. Reuse LangGraph only if its workflow enforces this contract. Remove silent browser-engine fallback. Disconnected preview may show an explicitly labeled read-only fixture with mutations disabled.
8.3. Backend-issued recommendation UUID follows queue -> approval -> execution -> audit -> outcomes. No display index or locally invented replacement ID.
8.4. Document one command contract. Existing `/api/recommendations/{id}/approve` and `/api/agent/execute/{id}` can remain, but direct execute independently requires valid approval.
8.5. Entities: run/seed, store, SKU, batch, demand event/interval, movement, risk, recommendation/candidates, approval/rejection, shipment/PO, receipt/discrepancy, outcome. Include stable IDs, run, simulated timestamps and revisions.
8.6. Recommendations carry evidence revision, valid-until, action/quantity, constraints, reason codes, alternatives, ETA, modeled costs and evaluation window. Return explicit validation, stale/conflict, missing-data and failure states.
8.7. Approval/dispatch/receipt are transactional: stock/reservation changes, transition and audit commit together. Retries read/resume the existing result. Missing stock fails closed, never defaults to arbitrary units.

### Acceptance criteria
Network trace shows the same UUID throughout. API outage produces zero mutation and a visible error. Retry cannot create extra shipments/units. Backend and frontend agree after reload.

## 9. Inventory invariants and persistence

### Requirements
9.1. Batch-level quantity/expiry/location ledger; FIFO sale/pick from eligible batches only. Never sell expired/quarantined units. Available units exclude reservations. Revalidate donor balance, recipient capacity, shelf life and route before dispatch.
9.2. Internal transfer moves units from source to shipment/unconfirmed arrival to destination or discrepancy/write-off. Neither dispatch nor receipt creates units.
9.3. Reconcile opening units plus external receipts and positive adjustments against current on-hand/shipment units, fulfilled sales, waste and negative adjustments. Reservations are a subset of on-hand or a separate bucket, never counted twice. Document the model.
9.4. Internal transfer conserves accounted units. Sales, expiry and external receipts change physical sellable stock. Do not claim constant network inventory despite sales or POs.
9.5. Persist approvals, reservations, shipments/POs, receipts, clock, seed/RNG state, scenarios, expected outcomes and events in SQLite. Future arrivals cannot exist only in memory/timers.
9.6. Restart recovers pending work without duplicate dispatch/receipt, reset ETA or lost random-stream continuity. Process scheduled events once in deterministic order.

### Acceptance criteria
Conservation holds through every transition and a complete day. Depleted donors/full recipients block without partial mutation. Expired stock is never sold. Mid-trip restart preserves shipment, clock and pending confirmation.

## 10. Forecasting, risk rules, and reasons

### Requirements
10.1. Keep Holt linear double exponential smoothing and moving-average baseline. Existing 14-day moving-average and 3-day holdout approach is usable with enough history; disclose insufficient samples.
10.2. Forecast requested demand, not fulfilled sales. Record `requested = fulfilled + lost` for each store/SKU/interval. A simulated stockout must not imply true demand fell to zero.
10.3. Use chronological splits/rolling-origin evaluation. Tune/select on past training/validation only; report a separate later holdout. No random shuffling or test-window model selection.
10.4. MAE and WAPE use requested-demand residuals. `WAPE = sum(abs(actual - predicted)) / sum(actual) * 100`. Zero denominator is N/A. Show horizon/window/sample count; document non-negative forecast handling.
10.5. Project stock with demand schedule, expiry, reservations and eligible arrivals. Stock/rate is a constant-rate approximation, not the full model. Future receipts remain contingent on confirmation.
10.6. Thresholds are configurable simulation assumptions. Surface the hero risk about five hours out; do not retain an unexplained four-hour threshold that hides it.
10.7. Rank transfer, reorder, markdown and do-nothing candidates under explicit constraints. Explain late RFC arrival, insufficient cover, smaller transfer and other rejected options.
10.8. Preserve reason codes and double-checks. Inspect/document the actual enum before claiming a count such as 16. Each visible code has a plain-language explanation.
10.9. Markdown is a simulated price/demand rule with explicit elasticity assumption. No POS integration. Logging an event alone is not implementation.

### Acceptance criteria
Requested demand remains visible while sales drop under stockout. Fixed input produces fixed ranking. Errors reproduce from saved holdout predictions. Publish when Holt loses to the baseline; never assume it wins.

## 11. Approval, rejection, and recovery

### Requirements
11.1. Lifecycle supports proposed, approved, scheduled/picked, dispatched, awaiting confirmation, received, evaluated; also rejected, stale, failed and discrepancy.
11.2. Approval stores UUID/version/actor. Recheck evidence at approval and immediately before dispatch. Stale/expired recommendations need a newly presented decision.
11.3. Reject offers at most one feasible alternative in that decision chain. Its new UUID links to the original; it needs approval too. If none is feasible, say so.
11.4. Rejecting/dismissing the alternative closes the chain. Do not recreate the same recommendation every tick. A material new circumstance can create a new risk explaining changed evidence.
11.5. Persist idempotency and state for concurrency, lost responses and interruptions. Button disabling is not the safety boundary.

### Acceptance criteria
Rejected/stale/expired approvals cannot execute through any route. Repeated approval executes once. Second rejection stays respected while time advances. Interrupted work resumes or reports failure without duplicate dispatch.

## 12. Clock, guided story, and sandbox

### Requirements
12.1. One persisted clock auto-ticks fast enough for the demo. Document wall-time mapping; 1x is the configured demo base speed. Provide pause and Advance 1h.
12.2. Advance processes all intervening demand, expiry and arrival events in order, not a timestamp jump that bypasses confirmation.
12.3. Seed randomness; fixed initial data/seed/commands reproduce events independent of render timing.
12.4. Guided flow: morning milk evidence -> approval -> dispatch without destination credit -> advance to arrival -> confirm -> outcome. Run a separate matched no-action replay for comparison.
12.5. Demand spike 2.5x changes requested-demand generation over a documented scope/window, then changes risks and outcomes. Supplier delay changes actual targeted PO/shipment ETA, then risk/candidate feasibility. Show applied parameter and affected records.
12.6. Reset restores a clearly identified seeded run; warn before discarding sandbox state. Do not silently delete unrelated runs. Distinguish synthetic prior-day history from current results.
12.7. Advanced panel can expose bounded multiplier/delay and valid batch stock/demand overrides. All submit backend-validated recorded scenario events.

### Acceptance criteria
UI scenario commands alter backend demand/ETA/inventory/results, not just labels. Same seed/actions reproduce events. Auto-tick and manual advance agree for the same interval.

## 13. CSV import/export and company-data replay

The practical test path is offline replay, not immediate live-company access. Engineers can try sample CSVs and their assumptions locally; a permissioned anonymized extract can follow. Synthetic performance does not establish production benefit.

### Requirements
13.1. Supply sample CSVs/schema in the sandbox panel/repository. Preserve snapshot export but distinguish it from demand-history evaluation: one stock snapshot cannot validate forecasting.
13.2. Minimum import tables:
- Catalog: `sku_id, name, selling_price_inr, unit_cost_inr`.
- Opening inventory: `store_id, sku_id, batch_id, quantity, expires_at`, at a declared opening timestamp.
- Demand history: `timestamp, store_id, sku_id, requested_units, fulfilled_units`, when requested demand is known.
- Pending inbound: `shipment_id, type, source_id, destination_id, sku_id, quantity, dispatched_at, eta`, with batch expiry for transfers.
- Config: documented route times, buffers, capacities, risk horizons, forecast interval and evaluation horizon.
13.3. Validate IDs/references, duplicates, timestamps/timezone, non-negative integer units, expiry and reconciliation. Preview file/row/field errors. Invalid import cannot partially mutate the run.
13.4. Add `python-multipart` to backend requirements and test real multipart upload. CSV is data, never executable instructions.
13.5. Sales-only extracts do not measure all unmet demand. Use an explicit sales-proxy mode, ideally with availability intervals. Do not call sales true demand, claim unbiased forecasts or invent actual lost sales.
13.6. Private extracts run offline/local by default. No confidential uploads to the public demo; no customer identifiers. Document local retention/deletion. Hosted experiments require permission and a clear data policy.
13.7. A small anonymized sample can illustrate behavior. One week is not a promise of robust validation: use sufficient training history and a separate holdout. Replay baseline and policy on identical inputs and inspect failures.
13.8. Optional public dataset use requires source/terms/files/version/transformation manifest and loader. Favorita hourly demand, Mumbai mapping, routes and expiry must be marked synthetic where generated. No scraping substitute for sales data.

### Acceptance criteria
Sample import reproduces a run; invalid rows yield useful errors and no mutation. Export reconciles and includes seed/config/run metadata. Sales-proxy limitations are visible. Reviewers can test locally without live access.

## 14. Evaluation and metrics

### Requirements
14.1. Baseline is a documented routine policy without exception intervention. Compare using identical opening batches, exogenous requested-demand streams, delays, prices, seeds and windows. Pre-generate demand or use separate random streams so action choices do not change comparison inputs.
14.2. Report requested/fulfilled/lost units, fill rate, stockout duration, waste units/cost, transfer/reorder costs, inventory and forecast MAE/WAPE per SKU/store where measurable.
14.3. Fill rate = fulfilled/requested, zero demand N/A. Define stockout duration and observation interval. Lost-sales value = lost units * selling price, not profit. Waste uses unit cost.
14.4. Net modeled impact, if shown, lists paired lost-sales-value difference minus incremental modeled costs. Revenue at risk is not gross margin. Different seed runs cannot be compared as causal savings.
14.5. Publish per-scenario and aggregate results with sample sizes, seeds/config, method, window and baseline. Include negative/inconclusive results and failures alongside improvements.
14.6. Separate forecasts, observed simulated results, paired simulated impact and real-data replay. None proves actual company ROI or guarantees trust.

### Acceptance criteria
Baseline/policy share exogenous data. All metrics recalculate from export. Rejected, late and infeasible scenarios are included, not cherry-picked out.

## 15. Behavioral test plan

### Requirements
15.1. Unit tests: forecast/error formulas and zero demand; requested/fulfilled/lost reconciliation; risk horizons; FIFO eligibility; candidate constraints; reasons and metrics.
15.2. Integration tests prove conservation across reservation/dispatch/arrival/receipt/discrepancy/expiry; no unavailable stock shipped; no expired stock sold; no receipt before ETA; repeated approval/dispatch/receipt executes once; rejected/stale approvals cannot execute; concurrency cannot overspend; rollback leaves no partial mutation.
15.3. Restart tests preserve pending shipments/POs, clock, ETA, approvals, reservations and scheduled events.
15.4. Seeded cases: milk rescue/no-action, demand spike, supplier delay, expiry, depleted donor, missing/zero demand, partial receipt and second rejection.
15.5. Real browser E2E runs actual frontend/API with isolated seeded database: select risk/UUID, approve, verify dispatch without receiver credit, advance, confirm receipt, read Outcomes. Exercise CSV upload, reject/stale paths, backend failure and restart. Source-grep is not E2E.
15.6. Forecast tests use time-based holdout/saved predictions. Policy-versus-baseline tests share seeds and demand paths; report failures alongside wins.
15.7. Run actual repo build/lint scripts. Record command, commit, environment, date and collected/pass/fail/skip counts. Generate test reports from execution, not hand-written success JSON.
15.8. Inspect actual rendered screens at desktop/narrow widths for dates, chart readability, stock arithmetic, preview distinction and failure states.

### Acceptance criteria
Clean-checkout commands reproduce results. Tests fail on stock teleport, approval bypass or label-only scenarios. Unresolved failures remain documented.

## 16. Build order and gates

### Requirements
16.1. First: stop false success, stock teleport and fake metrics. Remove fabricated stock defaults, local success, fixed savings and dispatch-time receiver credit.
16.2. Second: one engine contract end to end, with real UUIDs, approval, delay, receipt and all three tabs. Finish milk before broad fixtures.
16.3. Third: scenarios through engine, shared clock/reset and CSV validation. Implement simulated markdown behavior or mark absent.
16.4. Fourth: persistence and real E2E; pending transfers/POs survive restart; add invariant tests.
16.5. Fifth: docs/test-count honesty, assumptions, API/import contract, dataset provenance, reproducible evaluation and limitations. Remove unrelated Grocer leftovers only after checking dependencies.
16.6. Sixth: deploy verified frontend/API/persistence and record honest 60-90s video. Outreach last, outside this spec.

### Acceptance criteria
Each gate records changes, executed checks and remaining gaps. Later polish does not hide earlier failures. No schedule promise substitutes for an end-to-end loop.

## 17. Deployment and done checklist

### Requirements
17.1. Document a clean local run and dependencies/env variables without secrets. Public demo is synthetic only. Distinguish connected engine from read-only fixture.
17.2. Host reachable API and durable SQLite-compatible storage or documented equivalent. Ephemeral storage cannot support a restart-persistence claim. Check cold start/error/reset behavior.
17.3. Isolate demo runs so one reviewer cannot reset/approve another's story; no production-auth product needed.
17.4. Verify live link in fresh browser; old printed URL is not proof. State cold-start expectation where applicable.
17.5. Video: simulation/persona -> milk evidence -> approve -> in-transit, not teleported -> count confirmation -> outcome plus a failure/limitation. 60-90 seconds, no fabricated responses.
17.6. Done means: three screens visually checked; three-store seeded loop reproducible; routine/exception distinction; no false success/default stock/fake metrics; UUID/stale/reject/idempotent approval; delayed confirmed receipt; reconciled units; engine-backed clock/scenarios/import; requested-demand Holt/baseline with holdout; restart persistence and real E2E; honest outcomes including failures; docs/counts/provenance aligned; verified deployment/local run/video.

### Acceptance criteria
Live app completes the loop without silent fallback. A reviewer can inspect/reproduce/import/understand limits without trusting a pitch.

## 18. Merge notes and non-goals

Retained: case-study framing, deterministic rules, Holt/moving-average evaluation, reason codes, FIFO, requested-versus-fulfilled accounting, approval of exceptions, delayed RFC/transfer movement, stale/idempotency checks, scenario controls and CSV path.

Added: city planner; exceptions-first workflow; three stores/about 15 SKUs; combined queue/detail; guided/sandbox and clock; count confirmation; measured-versus-expected outcomes; one alternative after rejection; failures and offline evaluation path.

Removed/replaced: five-node map-first fleet; blanket approval of every routine action; dispatch/automatic-arrival credit; silent client fallback; invented savings/counts; unsourced stats/quotes; unproven Favorita provenance; completed-tense promises; outreach roster/pitches.

The mockups approve composition/interaction. Their placeholder arithmetic and date labels do not override one coherent engine timeline. Future work is not required: live WMS/POS, production access controls, route optimization, broader scale, advanced ML, commercial product and actual business ROI validation.

Repository source: https://github.com/kwakhare5/Outpost
