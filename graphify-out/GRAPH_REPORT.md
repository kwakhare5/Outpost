# Graph Report - Outpost  (2026-10-03)

## Corpus Check
- 85 files · ~60,845 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1068 nodes · 2667 edges · 72 communities (65 shown, 7 thin omitted)
- Extraction: 88% EXTRACTED · 12% INFERRED · 0% AMBIGUOUS · INFERRED: 307 edges (avg confidence: 0.51)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9579b42f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- tools.py
- core.py
- AgentState
- devDependencies
- Engineering Journal — Outpost
- Outpost — Quick-Commerce Inventory Replenishment Decision Engine
- AGENTS.md — Outpost Project Rules
- bus.py
- test_decision.py
- test_risk.py
- main.py
- stores.py
- simulations.py
- _seed_transfer_scenario
- compilerOptions
- Outpost — Engineering Design Decisions & Architecture Document
- recommendations.py
- test_csv_upload.py
- forecasting/engine.py
- SimulationEngine
- AGENTS.md — Outpost Project Rules
- 2026-10-03: Operations Test Lab, End-to-End Hybrid API Integration, Style B Plain-Language Renaming & Industry Problem Verification
- test_agent.py
- Outpost: final merged engineering specification
- Event
- 2026-10-01: Charcoal Anti-Slop Refactor, Zero-Emoji Purge & Modular Deck Decomposition
- test_scenarios_deterministic.py
- test_forecasting.py
- ForecastingEngine
- risks.py
- ARCHITECTURE.md — Outpost
- Batch
- 4. Approved UI: shared shell
- 10. Forecasting, risk rules, and reasons
- 11. Approval, rejection, and recovery
- schemas.py
- forecasting.py
- 12. Clock, guided story, and sandbox
- 13. CSV import/export and company-data replay
- 14. Evaluation and metrics
- get_product
- 15. Behavioral test plan
- 16. Build order and gates
- .prettierrc.json
- 17. Deployment and done checklist
- detect_anomalies
- runner.py
- 1. Purpose and builder instructions
- simulation/engine.py
- 3. Baseline and status honesty
- 5. Queue: briefing and master-detail
- ._fit_and_predict
- 6. In-flight: dispatch and confirmed receipt
- 7. Outcomes: measured results and failures
- 8. One engine and API contract
- 9. Inventory invariants and persistence
- layout.tsx
- 2026-10-02: Dashboard UI Comprehensive Audit, Deduplication & Architecture Overhaul (High-Signal Separation, Tabular Monospace Hardening, Dead Code Purge & Live IST Ticking Telemetry)
- Inventory
- page.tsx
- health_check
- agents/__init__.py
- services/__init__.py
- eslint.config.mjs
- next.config.ts
- next-env.d.ts
- postcss.config.mjs

## God Nodes (most connected - your core abstractions)
1. `SimulationEngine` - 67 edges
2. `Inventory` - 48 edges
3. `Batch` - 47 edges
4. `Product` - 41 edges
5. `Store` - 38 edges
6. `DecisionOrchestrator` - 38 edges
7. `Event` - 36 edges
8. `Risk` - 34 edges
9. `Recommendation` - 33 edges
10. `ForecastingEngine` - 31 edges

## Surprising Connections (you probably didn't know these)
- `HeaderProps` --references--> `DeckTab`  [EXTRACTED]
  components/dashboard/Header.tsx → lib/types.ts
- `MetricsOverviewProps` --references--> `DeckTab`  [EXTRACTED]
  components/dashboard/MetricsOverview.tsx → lib/types.ts
- `SidebarProps` --references--> `DeckTab`  [EXTRACTED]
  components/dashboard/Sidebar.tsx → lib/types.ts
- `StoreTableProps` --references--> `StoreHub`  [EXTRACTED]
  components/dashboard/StoreTable.tsx → lib/types.ts
- `Home()` --calls--> `applyLiveScenario()`  [EXTRACTED]
  app/page.tsx → lib/api.ts

## Import Cycles
- None detected.

## Communities (72 total, 7 thin omitted)

### Community 0 - "tools.py"
Cohesion: 0.14
Nodes (27): _enum_val(), Any, LangGraph node functions for the Outpost execution agent. Node graph: validate…, apply_discount(), _assert_approved(), create_reorder(), create_transfer(), _enum_val() (+19 more)

### Community 1 - "core.py"
Cohesion: 0.39
Nodes (29): Action, Customer, Forecast, Order, OrderItem, Product, Recommendation, Risk (+21 more)

### Community 2 - "AgentState"
Cohesion: 0.12
Nodes (25): build_execution_graph(), LangGraph StateGraph wiring for the Outpost execution agent. Graph topology:…, Fail fast if validate produced an error., Divert to recover if world state has changed., Divert to recover on execution error., Divert to recover if verification failed., Build and return the compiled LangGraph execution graph., _route_after_execute() (+17 more)

### Community 3 - "devDependencies"
Cohesion: 0.05
Nodes (43): clsx, eslint, eslint-config-next, lucide-react, next, dependencies, clsx, lucide-react (+35 more)

### Community 4 - "Engineering Journal — Outpost"
Cohesion: 0.10
Nodes (21): 2026-09-20: Quick-Commerce Case Study Hardening & Deterministic Execution, 2026-09-30: Complete 3-Tier Operations Cockpit in Plain English, 2026-09-30: E2E-First Testing Architecture & Low-Signal Unit Test Pruning, 2026-09-30: Geospatial Dispatch Desk & Standard shadcn/ui Refactor, 2026-09-30: Linear-Grade Command Deck & Shadcn UI System, 2026-09-30: Original UI Scale Restoration & High-Signal E2E Operations Deck, 2026-09-30: The Replenishment Flow Cockpit (Corridor + Split Matrix Deck), 2026-09-30: UI Prototype Suite & High-Legibility Linear Triage Architecture (+13 more)

### Community 5 - "Outpost — Quick-Commerce Inventory Replenishment Decision Engine"
Cohesion: 0.15
Nodes (13): 1. Live Demo Link, 2. 30-Second "What It Does" Explanation, 3. Demo Video, 4. The Problem (Sourced Quick-Commerce Cost Realities & Industry Citations), 5. System Architecture, 6. Design-Decisions Summary, 7. Honest Limits & Boundaries, Outpost — Quick-Commerce Inventory Replenishment Decision Engine (+5 more)

### Community 6 - "AGENTS.md — Outpost Project Rules"
Cohesion: 0.20
Nodes (9): 1. PROJECT IDENTITY, 2. TECH STACK, 3. CODING LOOP & TESTING INVARIANTS (DEV COMMANDS), 4. LOCAL RULES & DESIGN INVARIANTS, 7. SESSION RESUME, AGENTS.md — Outpost Project Rules, Architectural Knowledge Graph, Testing Invariants & Philosophy (+1 more)

### Community 7 - "bus.py"
Cohesion: 0.15
Nodes (10): EventBus, Any, AsyncSession, UUID, In-process event bus for Outpost. LOCKED (spec Section 30): async in-process…, Simple in-process async event pub/sub bus. Usage: bus = EventBus()…, Decorator to register a handler for a given event type., Programmatically register a handler. (+2 more)

### Community 8 - "test_decision.py"
Cohesion: 0.06
Nodes (72): DecisionOrchestrator, _naive_now(), AsyncSession, datetime, UUID, Outpost Decision Engine -- DB orchestration layer. Loads risk + inventory +…, Scan all active risks without pending recommendations and generate decisions.…, Set recommendation status to APPROVED and stage a pending Action (spec Section… (+64 more)

### Community 9 - "test_risk.py"
Cohesion: 0.05
Nodes (66): _naive_now(), AsyncSession, datetime, UUID, Outpost Risk Engine. Orchestrates risk detection across inventory, forecasts,…, Mark an active risk as RESOLVED and emit RISK_RESOLVED event., Return naive current UTC datetime for database compatibility., Detects inventory stockout and batch spoilage risks. Usage: engine =… (+58 more)

### Community 10 - "main.py"
Cohesion: 0.12
Nodes (20): Products REST API — spec Section 32.4. Endpoints: GET /api/products — list all…, Settings, get_db(), AsyncSession, create_app(), lifespan(), client(), db_session() (+12 more)

### Community 11 - "stores.py"
Cohesion: 0.12
Nodes (37): BaseSchema, BatchResponse, ForecastResponse, InventoryItemResponse, RiskResponse, StoreDetailResponse, StoreInventoryResponse, StoreResponse (+29 more)

### Community 12 - "simulations.py"
Cohesion: 0.11
Nodes (35): advance_simulation(), AdvanceTimeRequest, ApplyScenarioRequest, create_simulation(), CreateSimulationRequest, get_active_simulation(), _get_or_restore_engine(), get_simulation() (+27 more)

### Community 13 - "_seed_transfer_scenario"
Cohesion: 0.25
Nodes (9): Read-only validation: re-check whether the approved transfer is still feasible.…, validate_transfer(), Happy path: APPROVED transfer -> completed status., Create two stores, a product, two inventory rows, and an APPROVED transfer rec., _seed_transfer_scenario(), test_create_transfer_applies_transfer_successfully(), test_full_graph_happy_path_approved_transfer_completes(), test_validate_transfer_feasible_when_sufficient_source() (+1 more)

### Community 14 - "compilerOptions"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 15 - "Outpost — Engineering Design Decisions & Architecture Document"
Cohesion: 0.22
Nodes (9): 1. Why the Decision Engine is Deterministic, 2. Why Every Action Requires Human Approval (Level-2 Autonomy), 3. Why an Auditable State Machine Was Chosen over Unbounded LLM Reasoning, 4. Why the Environment is Simulated, 5. Favorita Dataset: Demand Backbone & Exact Limitations, 6. What Would Change with Real Operational Dark Store Data, 7. Single-Process In-Memory State vs Multi-Instance Production Architecture, 8. Known Operational Limits (+1 more)

### Community 16 - "recommendations.py"
Cohesion: 0.17
Nodes (23): approve_recommendation(), batch_evaluate_recommendations(), evaluate_recommendation(), get_recommendation(), list_recommendations(), AsyncSession, get, post (+15 more)

### Community 17 - "test_csv_upload.py"
Cohesion: 0.32
Nodes (7): AsyncClient, asyncio, High-signal domain test: CSV Dark Store Upload & Dynamic Rebalancing Invariant., Verify that uploading store CSV text accurately identifies deficits and…, Verify friendly auto-sanitization clamps negative units to zero., test_csv_upload_auto_sanitizes_negative_units(), test_csv_upload_text_generates_recommendation()

### Community 18 - "forecasting/engine.py"
Cohesion: 0.17
Nodes (20): Outpost Forecasting Engine. Orchestrates forecast generation over simulator…, Perform empirical rolling-origin backtesting across historical orders. Splits…, baseline_predict(), clean_demand_series(), evaluate_forecast(), holt_linear_predict(), ModelEvaluationResult, Outpost Forecasting — Pure mathematical models. Implements spec Section 12:… (+12 more)

### Community 19 - "SimulationEngine"
Cohesion: 0.10
Nodes (30): Any, AsyncSession, UUID, Core simulation engine for Outpost. Handles: - Database seeding (stores,…, Seed all base data and generate historical orders. Returns the created…, Advance simulation time, generate new orders, handle batch expiry. Returns…, Reset simulation: clear generated data, re-seed, restart clock., Create initial inventory and batches for all store-product pairs. (+22 more)

### Community 20 - "AGENTS.md — Outpost Project Rules"
Cohesion: 0.29
Nodes (6): 1. PROJECT IDENTITY, 2. TECH STACK, 3. DEV COMMANDS, 4. LOCAL RULES & DESIGN INVARIANTS, 7. SESSION RESUME, AGENTS.md — Outpost Project Rules

### Community 21 - "2026-10-03: Operations Test Lab, End-to-End Hybrid API Integration, Style B Plain-Language Renaming & Industry Problem Verification"
Cohesion: 0.33
Nodes (6): 2026-10-03: Operations Test Lab, End-to-End Hybrid API Integration, Style B Plain-Language Renaming & Industry Problem Verification, Work Card: Codebase Audit & Deep Cleanup Execution, Work Card: Dynamic Dark Store CSV Ingest, Van Delivery Lifecycle & Clean Operations Dashboard, Work Card: Low-Signal Unit Tests Purge (Anti-Test Slop Enforcement), Work Card: Operations Test Lab, Hybrid API Integration & Industry Problem Verification, Work Card: Single-Modal Test Lab Consolidation & Surgical UI Layer Cleanup

### Community 22 - "test_agent.py"
Cohesion: 0.13
Nodes (24): node_execute(), node_pre_check(), node_validate(), Dispatch to the appropriate tool based on action_type. HOLD: no-op execution…, Validate that the recommendation exists and is in APPROVED status. Fails fast…, Re-verify world state before executing the action. For TRANSFER: check source…, get_recommendation(), Return a dict snapshot of the Recommendation row, or None if not found. (+16 more)

### Community 23 - "Outpost: final merged engineering specification"
Cohesion: 0.40
Nodes (5): 18. Merge notes and non-goals, 2. Persona, scope, and autonomy boundary, Acceptance criteria, Outpost: final merged engineering specification, Requirements

### Community 24 - "Event"
Cohesion: 0.25
Nodes (12): Event, calculate_transfer_eta_minutes(), dispatch_transfer(), InTransitTransfer, process_arriving_transfers(), AsyncSession, datetime, UUID (+4 more)

### Community 25 - "2026-10-01: Charcoal Anti-Slop Refactor, Zero-Emoji Purge & Modular Deck Decomposition"
Cohesion: 0.40
Nodes (5): 2026-10-01: Charcoal Anti-Slop Refactor, Zero-Emoji Purge & Modular Deck Decomposition, Work Card: Charcoal Black Theme, Zero-Emoji Purge, 8px/6px Radius Scale & Component Decomposition, Work Card: Implementation of Linear-Inspired Operations Dashboard with Tabbed Views & Tactical Design System, Work Card: Production Cockpit Architecture, 4 Definitive Views, Zero Micro-Text & Anti-Slop Terminology, Work Card: Total Purge of UI Scaffolding, Zero-Dependency Plain HTML & Invariant Verification

### Community 26 - "test_scenarios_deterministic.py"
Cohesion: 0.14
Nodes (23): apply_scenario(), get_current_scenario_config(), get_scenario_config(), Any, AsyncSession, Operational Scenario Driver for Outpost (Phase 2). Encapsulates the 5 canonical…, Inject scenario conditions into the live simulation database., Retrieve scenario configuration parameters. (+15 more)

### Community 27 - "test_forecasting.py"
Cohesion: 0.07
Nodes (39): compute_confidence(), _compute_dow_multiplier(), DemandPoint, Return the seasonal multiplier for a given day-of-week. Multiplier =…, Return a composite confidence score in [0.0, 1.0]. Four factors combined…, A single daily demand observation., TDD tests for the forecasting engine (spec Section 12). Test seams, in order of…, Baseline works with as few as 3 data points. (+31 more)

### Community 28 - "ForecastingEngine"
Cohesion: 0.18
Nodes (13): ForecastingEngine, Generates Forecast rows from historical Order data in the simulation DB. Usage:…, Verify model identifiers use honest statistical names and zero 'ML' or 'AI'…, Verify that Holt linear is selected when data exhibits strong trend where it…, test_lower_mae_candidate_selected_trend_selects_holt_linear(), test_no_machine_learning_claim_in_model_identifiers(), asyncio, ForecastingEngine runs on seeded simulation data and writes Forecast rows. (+5 more)

### Community 29 - "risks.py"
Cohesion: 0.21
Nodes (15): evaluate_risks(), get_risk(), list_risks(), AsyncSession, get, post, UUID, Risk REST API — spec Section 32. Endpoints: GET /api/risks — list risks with… (+7 more)

### Community 30 - "ARCHITECTURE.md — Outpost"
Cohesion: 0.50
Nodes (3): 1. System Topology, 2. Core Invariants, ARCHITECTURE.md — Outpost

### Community 31 - "Batch"
Cohesion: 0.13
Nodes (36): Batch, apply_supplier_delay(), clear_active_pos(), create_purchase_order(), get_active_pos(), process_supplier_deliveries(), PurchaseOrder, AsyncSession (+28 more)

### Community 33 - "4. Approved UI: shared shell"
Cohesion: 0.50
Nodes (4): 4. Approved UI: shared shell, Acceptance criteria, Design assets, Requirements

### Community 34 - "10. Forecasting, risk rules, and reasons"
Cohesion: 0.67
Nodes (3): 10. Forecasting, risk rules, and reasons, Acceptance criteria, Requirements

### Community 35 - "11. Approval, rejection, and recovery"
Cohesion: 0.67
Nodes (3): 11. Approval, rejection, and recovery, Acceptance criteria, Requirements

### Community 36 - "schemas.py"
Cohesion: 0.14
Nodes (21): execute_recommendation(), get_run_status(), list_runs(), AsyncSession, get, post, UUID, Agent Execution REST API -- spec sections 19-21. Endpoints: POST… (+13 more)

### Community 37 - "forecasting.py"
Cohesion: 0.23
Nodes (11): evaluate_models(), generate_forecasts(), list_forecasts(), AsyncSession, get, post, UUID, Forecast REST API — spec Section 32. Endpoints: GET /api/forecasts — list… (+3 more)

### Community 38 - "12. Clock, guided story, and sandbox"
Cohesion: 0.67
Nodes (3): 12. Clock, guided story, and sandbox, Acceptance criteria, Requirements

### Community 39 - "13. CSV import/export and company-data replay"
Cohesion: 0.67
Nodes (3): 13. CSV import/export and company-data replay, Acceptance criteria, Requirements

### Community 40 - "14. Evaluation and metrics"
Cohesion: 0.67
Nodes (3): 14. Evaluation and metrics, Acceptance criteria, Requirements

### Community 41 - "get_product"
Cohesion: 0.33
Nodes (7): get_product(), list_products(), AsyncSession, get, UUID, List all 25 catalog products., Get a single product by ID.

### Community 42 - "15. Behavioral test plan"
Cohesion: 0.67
Nodes (3): 15. Behavioral test plan, Acceptance criteria, Requirements

### Community 43 - "16. Build order and gates"
Cohesion: 0.67
Nodes (3): 16. Build order and gates, Acceptance criteria, Requirements

### Community 44 - ".prettierrc.json"
Cohesion: 0.18
Nodes (10): arrowParens, bracketSpacing, endOfLine, jsxSingleQuote, printWidth, semi, singleQuote, tabWidth (+2 more)

### Community 45 - "17. Deployment and done checklist"
Cohesion: 0.67
Nodes (3): 17. Deployment and done checklist, Acceptance criteria, Requirements

### Community 46 - "detect_anomalies"
Cohesion: 0.20
Nodes (10): detect_anomalies(), _percentile(), Return list of indices in *series* whose quantity is a statistical outlier.…, Compute a percentile from a pre-sorted list using linear interpolation., Z-score > 3 on a 6x spike is flagged as anomaly., No anomalies detected when demand is perfectly uniform., Empty series yields empty anomaly list without error., test_detect_anomalies_empty_series_returns_empty() (+2 more)

### Community 47 - "runner.py"
Cohesion: 0.18
Nodes (11): Execution agent subpackage -- LangGraph 5-node execution graph., ExecutionRunner, _naive_now(), AsyncSession, datetime, UUID, Agent ExecutionRunner -- async entry point for the execution graph. Usage:…, Typed result returned by ExecutionRunner.run(). (+3 more)

### Community 48 - "1. Purpose and builder instructions"
Cohesion: 0.67
Nodes (3): 1. Purpose and builder instructions, Acceptance criteria, Requirements

### Community 49 - "simulation/engine.py"
Cohesion: 0.14
Nodes (14): datetime, Outpost Simulation Engine. Handles deterministic simulation: time control,…, Reset clock to start time., Manages simulated time for a simulation instance., Advance simulation time by N hours. Returns new current time., SimulationClock, _id(), UUID (+6 more)

### Community 50 - "3. Baseline and status honesty"
Cohesion: 0.67
Nodes (3): 3. Baseline and status honesty, Acceptance criteria, Requirements

### Community 51 - "5. Queue: briefing and master-detail"
Cohesion: 0.67
Nodes (3): 5. Queue: briefing and master-detail, Acceptance criteria, Requirements

### Community 52 - "._fit_and_predict"
Cohesion: 0.32
Nodes (5): AsyncSession, UUID, Query all delivered orders and aggregate demand by (store, product, day) with…, Fit both models, optionally compare on holdout, return (prediction, model_name,…, Generate forecasts for every (store, product) pair across specified horizons.…

### Community 53 - "6. In-flight: dispatch and confirmed receipt"
Cohesion: 0.67
Nodes (3): 6. In-flight: dispatch and confirmed receipt, Acceptance criteria, Requirements

### Community 54 - "7. Outcomes: measured results and failures"
Cohesion: 0.67
Nodes (3): 7. Outcomes: measured results and failures, Acceptance criteria, Requirements

### Community 55 - "8. One engine and API contract"
Cohesion: 0.67
Nodes (3): 8. One engine and API contract, Acceptance criteria, Requirements

### Community 56 - "9. Inventory invariants and persistence"
Cohesion: 0.67
Nodes (3): 9. Inventory invariants and persistence, Acceptance criteria, Requirements

### Community 58 - "2026-10-02: Dashboard UI Comprehensive Audit, Deduplication & Architecture Overhaul (High-Signal Separation, Tabular Monospace Hardening, Dead Code Purge & Live IST Ticking Telemetry)"
Cohesion: 0.67
Nodes (3): 2026-10-02: Dashboard UI Comprehensive Audit, Deduplication & Architecture Overhaul (High-Signal Separation, Tabular Monospace Hardening, Dead Code Purge & Live IST Ticking Telemetry), Work Card: Dashboard UI Comprehensive Audit, Deduplication & Architecture Overhaul, Work Card: Operations Deck Usability & Polish Overhaul

### Community 59 - "Inventory"
Cohesion: 0.18
Nodes (15): Inventory, get_demand_rate_multiplier(), Calculate demand rate multiplier from category x hour block x weekday rate…, asyncio, Deterministic tests for Sales Accounting & Demand Rate Tables (Spec Section 4).…, When on-hand stock is 0, fulfillment is 0 and 100% of requested demand is…, Advance simulation and verify that every generated OrderItem strictly…, Verify that the demand rate table correctly modulates demand by hour block and… (+7 more)

### Community 63 - "page.tsx"
Cohesion: 0.08
Nodes (43): Home(), INITIAL_BATCHES, INITIAL_RFC_ORDERS, INITIAL_STORES, INITIAL_TRANSFERS, ArchitectureModal(), ArchitectureModalProps, BatchLedgerTable() (+35 more)

### Community 64 - "health_check"
Cohesion: 0.50
Nodes (4): health_check(), AsyncSession, get, Health check endpoint. Verifies API and database connectivity.

## Knowledge Gaps
- **163 isolated node(s):** `semi`, `singleQuote`, `jsxSingleQuote`, `trailingComma`, `printWidth` (+158 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `SimulationEngine` connect `SimulationEngine` to `core.py`, `test_forecasting.py`, `test_risk.py`, `simulations.py`, `simulation/engine.py`, `test_agent.py`, `Event`, `test_scenarios_deterministic.py`, `Inventory`, `ForecastingEngine`, `Batch`?**
  _High betweenness centrality (0.083) - this node is a cross-community bridge._
- **Why does `DecisionOrchestrator` connect `test_decision.py` to `tools.py`, `core.py`, `recommendations.py`, `test_scenarios_deterministic.py`, `Inventory`?**
  _High betweenness centrality (0.053) - this node is a cross-community bridge._
- **Why does `ForecastingEngine` connect `ForecastingEngine` to `core.py`, `forecasting.py`, `test_risk.py`, `forecasting/engine.py`, `._fit_and_predict`, `test_agent.py`, `test_scenarios_deterministic.py`, `test_forecasting.py`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Are the 19 inferred relationships involving `SimulationEngine` (e.g. with `Batch` and `Customer`) actually correct?**
  _`SimulationEngine` has 19 INFERRED edges - model-reasoned connections that need verification._
- **Are the 20 inferred relationships involving `Inventory` (e.g. with `CsvTextPayload` and `CsvUploadResponse`) actually correct?**
  _`Inventory` has 20 INFERRED edges - model-reasoned connections that need verification._
- **Are the 19 inferred relationships involving `Batch` (e.g. with `CsvTextPayload` and `CsvUploadResponse`) actually correct?**
  _`Batch` has 19 INFERRED edges - model-reasoned connections that need verification._
- **Are the 20 inferred relationships involving `Product` (e.g. with `CsvTextPayload` and `CsvUploadResponse`) actually correct?**
  _`Product` has 20 INFERRED edges - model-reasoned connections that need verification._