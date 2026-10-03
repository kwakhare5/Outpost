# Graph Report - Outpost  (2026-10-01)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1356 nodes · 3651 edges · 91 communities (68 shown, 23 thin omitted)
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 292 edges (avg confidence: 0.51)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f54f2fdc`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- test_agent.py
- core.py
- apiClient.ts
- dependencies
- Inventory
- test_decision_api.py
- test_forecast_api.py
- EventBus
- test_decision.py
- StockoutCalculator
- create_app
- schemas.py
- simulations.py
- test_risk_api.py
- compilerOptions
- test_phase2_simulator.py
- recommendations.py
- test_phase5_decision.py
- forecasting/engine.py
- SimulationEngine
- asyncio
- Batch
- ForecastingEngine
- decision/models.py
- transfer.py
- test_phase3_forecasting.py
- apply_scenario
- test_forecasting.py
- DemandPoint
- risks.py
- test_risk.py
- clear_active_pos
- ScoringWeights
- MultiBatchSpoilageInput
- test_sales_accounting.py
- test_phase10_demo_hardening.py
- agent.py
- forecasting.py
- DecisionOrchestrator
- test_phase4_risk.py
- asyncio
- products.py
- asyncio
- test_decision_lifecycle_approve_and_stage_action
- .prettierrc.json
- compute_confidence
- detect_anomalies
- .run
- .run
- seed_data.py
- fixture
- ._fit_and_predict
- datetime
- clear_active_transfers
- test_forecasting_engine_confidence_in_range
- test_health_endpoint_reports_db_status
- layout.tsx
- env.py
- ActionScorer
- RiskResult
- get_scenario_config
- client
- page.tsx
- health_check
- _enum_val
- agents/__init__.py
- services/__init__.py
- test_execute_unknown_recommendation_returns_404
- test_execute_pending_recommendation_returns_409
- test_execute_approved_hold_returns_completed
- test_execute_approved_transfer_returns_completed
- test_execute_response_has_status_field
- test_execute_response_has_action_type_field
- test_execute_response_has_events_list
- test_execute_stale_inventory_returns_requires_human_review
- test_execute_marks_recommendation_executed
- test_get_run_status_unknown_returns_404
- test_get_run_status_after_execution
- test_agent_state_can_be_constructed
- test_store_network_distance_matrix
- test_regional_fulfilment_centre_naming_convention
- eslint.config.mjs
- next.config.ts
- next-env.d.ts
- postcss.config.mjs

## God Nodes (most connected - your core abstractions)
1. `SimulationEngine` - 113 edges
2. `Inventory` - 71 edges
3. `Batch` - 64 edges
4. `Risk` - 62 edges
5. `Recommendation` - 59 edges
6. `Product` - 57 edges
7. `Store` - 56 edges
8. `ForecastingEngine` - 48 edges
9. `DecisionOrchestrator` - 48 edges
10. `RiskEngine` - 47 edges

## Surprising Connections (you probably didn't know these)
- `ExecutionRunner` --uses--> `AgentState`  [INFERRED]
  backend/agents/execution/runner.py → backend/agents/execution/state.py
- `RunResult` --uses--> `AgentState`  [INFERRED]
  backend/agents/execution/runner.py → backend/agents/execution/state.py
- `DecisionOrchestrator` --uses--> `Action`  [INFERRED]
  backend/services/decision/engine.py → backend/models/core.py
- `SimulationEngine` --uses--> `Customer`  [INFERRED]
  backend/services/simulation/engine.py → backend/models/core.py
- `EventBus` --uses--> `Event`  [INFERRED]
  backend/events/bus.py → backend/models/core.py

## Import Cycles
- None detected.

## Communities (91 total, 23 thin omitted)

### Community 0 - "test_agent.py"
Cohesion: 0.05
Nodes (88): build_execution_graph(), LangGraph StateGraph wiring for the GROCER v2 execution agent (spec section…, Fail fast if validate produced an error., Divert to recover if world state has changed., Divert to recover on execution error., Divert to recover if verification failed., Build and return the compiled LangGraph execution graph., _route_after_execute() (+80 more)

### Community 1 - "core.py"
Cohesion: 0.15
Nodes (57): Action, Customer, Event, Forecast, Order, OrderItem, Product, Scenario (+49 more)

### Community 2 - "apiClient.ts"
Cohesion: 0.07
Nodes (41): BackendAgentRun, BackendAgentRunEvent, BackendInventory, BackendProduct, BackendRecommendation, BackendRisk, BackendSimulation, BackendStore (+33 more)

### Community 3 - "dependencies"
Cohesion: 0.04
Nodes (47): clsx, eslint, eslint-config-next, framer-motion, lucide-react, next, dependencies, clsx (+39 more)

### Community 4 - "Inventory"
Cohesion: 0.15
Nodes (39): Inventory, Recommendation, Risk, approved_transfer_rec(), APPROVED TRANSFER recommendation ready for agent execution., _naive_now(), asyncio, datetime (+31 more)

### Community 5 - "test_decision_api.py"
Cohesion: 0.05
Nodes (38): client(), first_risk_id(), fixture, TDD API tests for Phase 5 Recommendation endpoints (spec sections 17, 18). Test…, 4. After evaluate, list returns the new recommendation., 5. GET /api/recommendations/{id} returns correct recommendation., 6. Unknown recommendation_id -> 404., 7. ?risk_id=<id> filters correctly. (+30 more)

### Community 6 - "test_forecast_api.py"
Cohesion: 0.07
Nodes (38): asyncio, TDD API tests for Phase 3 endpoints. Seams under test: 1. GET /api/stores —…, GET /api/stores/{id}/inventory returns correct structure., Inventory response has product entries with correct fields., GET /api/stores/{id}/forecasts returns empty list before any forecasts…, GET /api/products returns all 25 seeded products., Each product has the required schema fields., GET /api/products/{id} returns the correct product. (+30 more)

### Community 7 - "EventBus"
Cohesion: 0.09
Nodes (26): EventBus, Any, AsyncSession, UUID, In-process event bus for GROCER v2. LOCKED (spec §30): async in-process pub/sub…, Simple in-process async event pub/sub bus. Usage: bus = EventBus()…, Decorator to register a handler for a given event type., Programmatically register a handler. (+18 more)

### Community 8 - "test_decision.py"
Cohesion: 0.14
Nodes (29): Compute how many units a source store can safely transfer away., Return number of units safely transferable (>=0)., SafeExcessCalculator, _discount(), _hold(), _product(), UUID, TDD tests for the Decision Engine pure models (spec sections 14-17, Phase 5).… (+21 more)

### Community 9 - "StockoutCalculator"
Cohesion: 0.09
Nodes (29): Evaluates stockout risk from current inventory vs forecast demand. Algorithm:…, Configurable thresholds and weights for the Risk Engine., All information needed to evaluate stockout risk for one (store, product)., RiskConfig, StockoutCalculator, StockoutInput, Low forecast confidence widens the required safety buffer, increasing risk., Custom RiskConfig thresholds alter the severity cutoffs. (+21 more)

### Community 10 - "create_app"
Cohesion: 0.10
Nodes (24): Settings, get_db(), AsyncSession, create_app(), lifespan(), client(), db_session(), event_loop() (+16 more)

### Community 11 - "schemas.py"
Cohesion: 0.14
Nodes (28): BaseSchema, BatchResponse, EventResponse, ForecastResponse, InventoryItemResponse, Pydantic v2 response schemas for GROCER v2 API. Covers: stores, products,…, StoreDetailResponse, StoreInventoryResponse (+20 more)

### Community 12 - "simulations.py"
Cohesion: 0.14
Nodes (29): advance_simulation(), AdvanceTimeRequest, ApplyScenarioRequest, create_simulation(), CreateSimulationRequest, get_active_simulation(), _get_or_restore_engine(), get_simulation() (+21 more)

### Community 13 - "test_risk_api.py"
Cohesion: 0.09
Nodes (29): client(), asyncio, fixture, TDD API tests for Phase 4 Risk endpoints. Seams under test: 1. GET /api/risks —…, GET /api/risks/{risk_id} returns risk details., GET /api/risks/{random_uuid} returns 404., GET /api/risks?store_id=X returns only risks for that store., GET /api/risks?risk_type=stockout returns only stockout risks. (+21 more)

### Community 14 - "compilerOptions"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 15 - "test_phase2_simulator.py"
Cohesion: 0.10
Nodes (26): apply_supplier_delay(), Apply an unexpected shipment delay to an existing purchase order., asyncio, TDD tests for Phase 2: Operational Simulator. Verifies: - Seam 1: Haversine…, Creating a supplier PO tracks lead time and delivers fresh batches upon arrival., Supplier delay extends arrival ETA and postpones batch receipt., Bandra to Andheri distance should be ~7.4 km., network_imbalance creates severe excess in Bandra and drains Andheri. (+18 more)

### Community 16 - "recommendations.py"
Cohesion: 0.16
Nodes (25): approve_recommendation(), batch_evaluate_recommendations(), evaluate_recommendation(), get_recommendation(), list_recommendations(), AsyncSession, get, post (+17 more)

### Community 17 - "test_phase5_decision.py"
Cohesion: 0.18
Nodes (24): HoldInput, PureDecisionEvaluator, Context for a hold decision., Evaluates all candidate actions and returns the ranked recommendation., All information needed to evaluate a reorder candidate., ReorderInput, _product(), UUID (+16 more)

### Community 18 - "forecasting/engine.py"
Cohesion: 0.17
Nodes (20): GROCER v2 Forecasting Engine. Orchestrates forecast generation over simulator…, Perform empirical rolling-origin backtesting across historical orders. Splits…, baseline_predict(), clean_demand_series(), evaluate_forecast(), holt_linear_predict(), ModelEvaluationResult, GROCER v2 Forecasting — Pure mathematical models. Implements spec §12: Level 1… (+12 more)

### Community 19 - "SimulationEngine"
Cohesion: 0.17
Nodes (14): Any, AsyncSession, UUID, Core simulation engine for GROCER v2. Handles: - Database seeding (stores,…, Seed all base data and generate historical orders. Returns the created…, Advance simulation time, generate new orders, handle batch expiry. Returns…, Reset simulation: clear generated data, re-seed, restart clock., Create initial inventory and batches for all store-product pairs. (+6 more)

### Community 20 - "asyncio"
Cohesion: 0.12
Nodes (23): AsyncClient, asyncio, AsyncSession, Same seed should produce same number of orders., Inventory quantities should never be negative after orders., Advancing time should create new orders and update simulation., A Simulation record should be created in the DB., POST /api/simulations/ should create a simulation. (+15 more)

### Community 21 - "Batch"
Cohesion: 0.17
Nodes (19): Batch, get_current_scenario_config(), Operational Scenario Driver for GROCER v2 (Phase 2). Encapsulates the 5…, Retrieve currently active scenario configuration parameters., Set the currently active scenario and return its config., ScenarioConfig, set_current_scenario(), create_purchase_order() (+11 more)

### Community 22 - "ForecastingEngine"
Cohesion: 0.14
Nodes (22): ForecastingEngine, Generates Forecast rows from historical Order data in the simulation DB. Usage:…, Detects inventory stockout and batch spoilage risks. Usage: engine =…, RiskEngine, Full seeded DB: sim + forecast + risks evaluated., seeded_db(), test_recalculate_options_creates_new_recommendation(), RiskEngine resolves multi-horizon 24h/48h forecasts cleanly. (+14 more)

### Community 23 - "decision/models.py"
Cohesion: 0.15
Nodes (15): Decision Engine service package., CandidateAction, DecisionResult, DiscountInput, ExplainabilityFacts, str, GROCER v2 Decision Engine -- Pure deterministic models. Implements spec section…, All information needed to evaluate a discount candidate. (+7 more)

### Community 24 - "transfer.py"
Cohesion: 0.15
Nodes (19): calculate_haversine_distance(), calculate_transfer_eta_minutes(), dispatch_transfer(), get_active_transfers(), get_store_distance_matrix(), InTransitTransfer, process_arriving_transfers(), AsyncSession (+11 more)

### Community 25 - "test_phase3_forecasting.py"
Cohesion: 0.13
Nodes (20): asyncio, TDD tests for Phase 3: Measured Demand Forecasting. Verifies: - Seam 1: Dense…, POST /api/forecasts/generate accepts multiple horizons., GET /api/forecasts/evaluate returns empirical backtest metrics., All generated forecasts must have non-negative demand and confidence in [0, 1]., Forecasting generation MUST NOT mutate orders, items, batches, or inventory…, Running forecasting over identical database state yields identical forecast…, Aggregation must pad missing days with 0.0 quantity and continuous day indices. (+12 more)

### Community 26 - "apply_scenario"
Cohesion: 0.14
Nodes (20): apply_scenario(), Any, AsyncSession, Inject scenario conditions into the live simulation database., asyncio, AsyncSession, Spec §34.2: Perishable batch approaching expiry -> Spoilage risk -> Markdown…, Spec §34.1: Normal -> Demand Spike -> Risk -> Recommendation -> Approval ->… (+12 more)

### Community 27 - "test_forecasting.py"
Cohesion: 0.10
Nodes (19): TDD tests for the forecasting engine (spec §12). Test seams, in order of the…, Baseline works with as few as 3 data points., Perfect forecasts yield MAE=0, RMSE=0, MAPE=0., MAE is correctly computed from a worked example., RMSE is correctly computed from a worked example., MAPE is correctly computed from a worked example., evaluate_forecast returns a ModelEvaluationResult dataclass., Time-series model returns a positive demand forecast for 30d history. (+11 more)

### Community 28 - "DemandPoint"
Cohesion: 0.11
Nodes (18): _compute_dow_multiplier(), DemandPoint, Return the seasonal multiplier for a given day-of-week. Multiplier =…, A single daily demand observation., Verify model identifiers use honest statistical names and zero 'ML' or 'AI'…, Verify that Holt linear is selected when data exhibits strong trend where it…, test_lower_mae_candidate_selected_trend_selects_holt_linear(), test_no_machine_learning_claim_in_model_identifiers() (+10 more)

### Community 29 - "risks.py"
Cohesion: 0.21
Nodes (16): evaluate_risks(), get_risk(), list_risks(), AsyncSession, get, post, UUID, Risk REST API — spec §32. Endpoints: GET /api/risks — list risks with optional… (+8 more)

### Community 30 - "test_risk.py"
Cohesion: 0.20
Nodes (16): All information needed to evaluate spoilage risk for one (store, product)., Evaluates spoilage risk for expiring batches. Supports both single-batch legacy…, SpoilageCalculator, SpoilageInput, TDD tests for the Risk Engine (spec §5, §13, §29.10, Phase 4). Test seams in…, Product expiring in 3 days with low inventory → no spoilage risk., Large stock, expiry in 4h, demand won't cover it → critical spoilage., Probability always in [0.0, 1.0]. (+8 more)

### Community 31 - "clear_active_pos"
Cohesion: 0.24
Nodes (17): clear_active_pos(), Reset active purchase orders., _naive_now(), asyncio, AsyncSession, datetime, Spec §4.B.2 & §4.B.3: PO remains in-transit before ETA; arrival updates…, Spec §4.B.4: Reprocessing the same approval or arrival event does not duplicate… (+9 more)

### Community 32 - "ScoringWeights"
Cohesion: 0.13
Nodes (12): Applies hard reject rules before scoring any transfer., All scoring weights in one place -- no magic numbers scattered., ScoringWeights, TransferValidator, Good transfer: source has excess, short distance, dest needs it now., Transfer qty exceeds safe excess., Travel time > destination hours of stock., test_scoring_weights_are_overridable() (+4 more)

### Community 33 - "MultiBatchSpoilageInput"
Cohesion: 0.17
Nodes (14): BatchInfo, MultiBatchSpoilageInput, Evaluate single-batch spoilage input., Evaluate multiple batches under FIFO cumulative depletion., Represents one physical batch for multi-batch spoilage analysis., Information needed to evaluate multi-batch spoilage risk for one (store,…, When projected demand absorbs inventory before expiry, net spoilage is 0 and…, Near-expiry batch (<6h) with low sell-through triggers CRITICAL risk and 30%… (+6 more)

### Community 34 - "test_sales_accounting.py"
Cohesion: 0.17
Nodes (14): get_demand_rate_multiplier(), Calculate demand rate multiplier from category x hour block x weekday rate…, asyncio, Deterministic tests for Sales Accounting & Demand Rate Tables (Spec §4).…, When on-hand stock is 0, fulfillment is 0 and 100% of requested demand is…, Advance simulation and verify that every generated OrderItem strictly…, Verify that the demand rate table correctly modulates demand by hour block and…, When on-hand stock exceeds requested quantity, fulfilled == requested and lost… (+6 more)

### Community 35 - "test_phase10_demo_hardening.py"
Cohesion: 0.21
Nodes (11): Execution agent subpackage -- LangGraph 5-node execution graph., ExecutionRunner, Agent ExecutionRunner -- async entry point for the execution graph. Usage:…, Async runner that drives the LangGraph execution graph for a single…, _naive_now(), datetime, Phase 10: Testing & Demo Hardening Suite (GROCER v2 Master Spec Section 29, 33,…, Spec §27: Stale inventory at source causes pre-check failure -> Dynamic… (+3 more)

### Community 36 - "agent.py"
Cohesion: 0.21
Nodes (13): execute_recommendation(), get_run_status(), list_runs(), AsyncSession, get, post, UUID, Agent Execution REST API -- spec sections 19-21. Endpoints: POST… (+5 more)

### Community 37 - "forecasting.py"
Cohesion: 0.21
Nodes (13): evaluate_models(), generate_forecasts(), list_forecasts(), AsyncSession, get, post, UUID, Forecast REST API — spec §32. Endpoints: GET /api/forecasts — list forecasts… (+5 more)

### Community 38 - "DecisionOrchestrator"
Cohesion: 0.22
Nodes (10): DecisionOrchestrator, _naive_now(), AsyncSession, datetime, UUID, Scan all active risks without pending recommendations and generate decisions.…, Set recommendation status to APPROVED and stage a pending Action (spec §18, §21…, Set recommendation status to REJECTED. (+2 more)

### Community 39 - "test_phase4_risk.py"
Cohesion: 0.29
Nodes (10): GROCER v2 Risk Engine. Orchestrates risk detection across inventory, forecasts,…, discount_tier_for_hours(), DiscountTier, str, GROCER v2 Risk Engine — Pure deterministic risk models. Implements spec §5…, Map hours-to-expiry to the correct discount tier per spec §14.3., RiskSeverityLevel, TDD tests for Phase 4: Risk Engine. Verifies: - Seam 2: RiskConfig &… (+2 more)

### Community 40 - "asyncio"
Cohesion: 0.15
Nodes (13): asyncio, Derivation invariant: sum of active batch quantities matches inventory for all…, POST /api/simulations/{id}/reset cleans and creates a new simulation ID., GET /api/simulations/active creates and initializes a default simulation if…, Subsequent calls to /api/simulations/active return the same simulation., POST /api/simulations/{id}/advance updates current_time in DB and returns state., Simulation operations succeed even when in-memory _engines dict is wiped., test_active_simulation_creates_default_when_empty() (+5 more)

### Community 41 - "products.py"
Cohesion: 0.29
Nodes (10): get_product(), list_products(), AsyncSession, get, UUID, Products REST API — spec §32.4. Endpoints: GET /api/products — list all catalog…, List all 25 catalog products., Get a single product by ID. (+2 more)

### Community 42 - "asyncio"
Cohesion: 0.18
Nodes (11): asyncio, When forecast table is empty, RiskEngine falls back gracefully to priors…, Running RiskEngine repeatedly on unchanged state updates existing active risks…, engine.resolve() marks risk as RESOLVED and records status., API endpoints for evaluate, filter by risk_type, severity, status, and store., Evaluating risks does not mutate physical inventory and produces bit-for-bit…, test_risk_api_evaluate_and_filters(), test_risk_engine_cold_start_fallback_when_no_forecasts() (+3 more)

### Community 43 - "test_decision_lifecycle_approve_and_stage_action"
Cohesion: 0.18
Nodes (11): asyncio, DecisionOrchestrator evaluates an active risk and persists a structured…, evaluate_all processes all active risks and avoids duplicate pending…, Approving a recommendation sets status to APPROVED and stages a pending Action., Rejecting a recommendation sets status to REJECTED., API endpoints for batch evaluate, listing with filters, and approve/reject…, test_decision_api_batch_evaluate_and_filters(), test_decision_lifecycle_approve_and_stage_action() (+3 more)

### Community 44 - ".prettierrc.json"
Cohesion: 0.18
Nodes (10): arrowParens, bracketSpacing, endOfLine, jsxSingleQuote, printWidth, semi, singleQuote, tabWidth (+2 more)

### Community 45 - "compute_confidence"
Cohesion: 0.20
Nodes (10): compute_confidence(), Return a composite confidence score in [0.0, 1.0]. Four factors combined…, compute_confidence always returns a value in [0.0, 1.0]., Higher coefficient of variation yields lower confidence., More anomalies in history → lower confidence., Fewer data points → lower confidence., test_confidence_lower_for_high_variance(), test_confidence_lower_for_more_anomalies() (+2 more)

### Community 46 - "detect_anomalies"
Cohesion: 0.20
Nodes (10): detect_anomalies(), _percentile(), Return list of indices in *series* whose quantity is a statistical outlier.…, Compute a percentile from a pre-sorted list using linear interpolation., Z-score > 3 on a 6x spike is flagged as anomaly., No anomalies detected when demand is perfectly uniform., Empty series yields empty anomaly list without error., test_detect_anomalies_empty_series_returns_empty() (+2 more)

### Community 47 - ".run"
Cohesion: 0.22
Nodes (7): _naive_now(), AsyncSession, datetime, UUID, Typed result returned by ExecutionRunner.run()., Run the execution graph for the given recommendation. Returns a RunResult…, RunResult

### Community 48 - ".run"
Cohesion: 0.25
Nodes (7): _naive_now(), AsyncSession, datetime, UUID, Mark an active risk as RESOLVED and emit RISK_RESOLVED event., Return naive current UTC datetime for database compatibility., Scan all inventory and batches, evaluate risks, persist rows and emit events.…

### Community 49 - "seed_data.py"
Cohesion: 0.25
Nodes (8): _id(), UUID, Deterministic seed data catalog for the GROCER v2 simulator. Defines 5 dark…, Generate a deterministic UUID from a name., SeedCustomer, SeedProduct, SeedStore, SeedSupplier

### Community 50 - "fixture"
Cohesion: 0.22
Nodes (9): client(), client_with_hold(), client_with_pending(), client_with_transfer(), fixture, HTTP client wired to seeded DB., HTTP client wired to DB that has an approved transfer rec., HTTP client wired to DB that has an approved hold rec. (+1 more)

### Community 52 - "._fit_and_predict"
Cohesion: 0.32
Nodes (5): AsyncSession, UUID, Query all delivered orders and aggregate demand by (store, product, day) with…, Fit both models, optionally compare on holdout, return (prediction, model_name,…, Generate forecasts for every (store, product) pair across specified horizons.…

### Community 53 - "datetime"
Cohesion: 0.25
Nodes (3): datetime, Reset clock to start time., Advance simulation time by N hours. Returns new current time.

### Community 54 - "clear_active_transfers"
Cohesion: 0.25
Nodes (8): clear_active_transfers(), Reset active transfer registry., Attempting to dispatch more than available stock raises ValueError., GET /api/simulations/{id}/in-transit returns active transfers and purchase…, Advancing simulation time automatically delivers transfers whose ETA has passed., test_api_advance_delivers_in_transit_transfers(), test_api_in_transit_tracking(), test_transfer_cannot_exceed_available_stock()

### Community 55 - "test_forecasting_engine_confidence_in_range"
Cohesion: 0.29
Nodes (7): asyncio, ForecastingEngine runs on seeded simulation data and writes Forecast rows., All generated Forecast rows have confidence in [0.0, 1.0]., ForecastingEngine emits FORECAST_UPDATED events for each forecast generated., test_forecasting_engine_confidence_in_range(), test_forecasting_engine_emits_event(), test_forecasting_engine_generates_forecasts()

### Community 56 - "test_health_endpoint_reports_db_status"
Cohesion: 0.38
Nodes (6): AsyncClient, asyncio, Health endpoint should report database connectivity., Health endpoint should return 200 with status healthy., test_health_endpoint_reports_db_status(), test_health_endpoint_returns_200()

### Community 57 - "layout.tsx"
Cohesion: 0.40
Nodes (3): geistMono, geistSans, metadata

### Community 58 - "env.py"
Cohesion: 0.60
Nodes (3): do_run_migrations(), run_async_migrations(), run_migrations_online()

### Community 60 - "RiskResult"
Cohesion: 0.40
Nodes (4): Computed risk assessment for one (store, product, risk_type) combination., RiskResult, RiskResult dataclass exposes all required output fields., test_risk_result_has_required_fields()

### Community 61 - "get_scenario_config"
Cohesion: 0.40
Nodes (4): get_scenario_config(), Retrieve scenario configuration parameters., All 5 canonical scenarios exist with distinct demand and lead-time…, test_scenario_catalog_and_modifiers()

### Community 62 - "client"
Cohesion: 0.40
Nodes (5): client(), fixture, Seed simulator data and return the db session., HTTP client wired to the seeded test DB via dependency override., seeded_db()

### Community 64 - "health_check"
Cohesion: 0.50
Nodes (4): health_check(), AsyncSession, get, Health check endpoint. Verifies API and database connectivity.

## Knowledge Gaps
- **88 isolated node(s):** `BackendAgentRun`, `BackendAgentRunEvent`, `BackendInventory`, `BackendProduct`, `BackendRecommendation` (+83 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **23 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `SimulationEngine` connect `SimulationEngine` to `test_agent.py`, `core.py`, `Inventory`, `test_decision_api.py`, `test_forecast_api.py`, `simulations.py`, `test_risk_api.py`, `test_phase2_simulator.py`, `test_phase5_decision.py`, `asyncio`, `Batch`, `ForecastingEngine`, `transfer.py`, `test_phase3_forecasting.py`, `apply_scenario`, `test_forecasting.py`, `test_risk.py`, `test_sales_accounting.py`, `test_phase10_demo_hardening.py`, `test_phase4_risk.py`, `asyncio`, `test_decision_lifecycle_approve_and_stage_action`, `seed_data.py`, `clear_active_transfers`, `test_forecasting_engine_confidence_in_range`, `get_scenario_config`, `client`?**
  _High betweenness centrality (0.188) - this node is a cross-community bridge._
- **Why does `Event` connect `core.py` to `test_agent.py`, `test_phase10_demo_hardening.py`, `Inventory`, `EventBus`, `SimulationEngine`, `Batch`, `transfer.py`, `apply_scenario`, `test_forecasting.py`, `test_risk.py`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **Why does `ForecastingEngine` connect `ForecastingEngine` to `test_agent.py`, `core.py`, `forecasting.py`, `test_decision_api.py`, `test_phase4_risk.py`, `test_risk_api.py`, `test_phase5_decision.py`, `forecasting/engine.py`, `._fit_and_predict`, `Batch`, `test_forecasting_engine_confidence_in_range`, `test_phase3_forecasting.py`, `apply_scenario`, `test_forecasting.py`, `DemandPoint`, `test_risk.py`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **Are the 19 inferred relationships involving `SimulationEngine` (e.g. with `Batch` and `Customer`) actually correct?**
  _`SimulationEngine` has 19 INFERRED edges - model-reasoned connections that need verification._
- **Are the 19 inferred relationships involving `Inventory` (e.g. with `ActionStatus` and `ActionType`) actually correct?**
  _`Inventory` has 19 INFERRED edges - model-reasoned connections that need verification._
- **Are the 18 inferred relationships involving `Batch` (e.g. with `ActionStatus` and `ActionType`) actually correct?**
  _`Batch` has 18 INFERRED edges - model-reasoned connections that need verification._
- **Are the 13 inferred relationships involving `Risk` (e.g. with `ActionStatus` and `ActionType`) actually correct?**
  _`Risk` has 13 INFERRED edges - model-reasoned connections that need verification._