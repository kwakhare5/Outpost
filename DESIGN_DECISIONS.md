# Dark Store Operator — Engineering Design Decisions & Architecture Document

This document records the architectural decisions, trade-offs, and operational boundaries of the **Dark Store Operator** decision engine.

---

## 1. Why the Decision Engine is Deterministic
Quick-commerce inventory replenishment operates under tight time constraints (10–15 minute delivery windows) and razor-thin gross margins. In this domain, stochastic decision-making (such as unbounded LLM generative output or non-reproducible heuristic sampling) introduces severe failure modes:
- **Uncontrolled Capital Commitment:** An autonomous system placing non-reproducible purchase orders can trigger working capital lockup or localized warehouse congestion.
- **Inability to Perform Root Cause Analysis (RCA):** If an order decision causes an emergency stockout during an IPL demand spike, supply-chain engineers must be able to replay the exact state transitions with the same random seed to understand why the decision was taken.
- **Verifiable Invariants:** A deterministic decision engine allows mathematical invariants—such as conservation of mass during store transfers, FIFO batch depletion, and transit lead-time boundaries—to be verified with unit and regression test suites.

Every simulation run in this platform accepts an explicit integer seed. Under the same seed and scenario inputs, demand generation, Holt linear forecasts, risk evaluations, and agent execution graphs produce identical outcomes.

---

## 2. Why Every Action Requires Human Approval (Level-2 Autonomy)
Full autonomy (Level 5) in physical replenishment is dangerous without mature fallback boundaries. An algorithm that detects a phantom spike could drain a regional dark store's safety stock via emergency transfers.

The platform implements **Level-2 Human-in-the-Loop (HITL) Autonomy**:
1. **The Engine Proposes:** The risk engine identifies stockout or spoilage hazards and constructs prioritized action candidates (`TRANSFER`, `REORDER`, `DISCOUNT`, `HOLD`).
2. **The Operator Reviews:** The Operations Cockpit presents candidate recommendations alongside explicit reason codes (e.g. `TRANSFER_FASTEST_TRANSIT`, `HIGH_STOCKOUT_RISK`), confidence scores, and alternatives.
3. **Execution Gate:** No inventory mutation or purchase order dispatch occurs until an operator approves the action. The backend enforces this server-side; unauthorized POST requests to `/api/agent/execute/{id}` return `HTTP 409 Conflict`.
4. **Stale-State Protection:** If an operator approves a recommendation after warehouse conditions have changed (e.g., source store inventory depleted while the recommendation was sitting in queue), the pre-execution node rejects the execution and re-routes the task to human review (`requires_human_review`).

---

## 3. Why an Auditable State Machine Was Chosen over Unbounded LLM Reasoning
Rather than using an LLM to freely decide replenishment actions via generic function calling, the execution engine is built as a **deterministic 5-node LangGraph Directed Acyclic Graph (DAG)**:

```
[Pre-Execution Check] ──> [Policy & Invariants] ──> [Inventory Mutation] ──> [Audit Log Sourcing]
          │                          │
          └───(Invalid State)────────┴────────> [Recovery & Human Review]
```

- **Node 1 (Pre-Execution Safety Check):** Verifies batch availability, lock status, and transfer transit feasibility at time of execution.
- **Node 2 (Policy & Constraint Verification):** Validates dark store capacity limits and supplier minimum order constraints.
- **Node 3 (Execution & FIFO Mutation):** Executes two-phase state changes. Reorders enter in-transit purchase orders; transfers enter in-transit dispatches with calculated arrival ETAs. On-hand destination inventory is never altered until physical arrival.
- **Node 4 (Audit Logging):** Commits immutable audit events to the event ledger.
- **Node 5 (Recovery Handler):** Safely halts execution, preserves inventory invariants, and emits alert diagnostics when a constraint fails.

This structure guarantees that execution steps are auditable, predictable, and provably conform to domain rules.

---

## 4. Why the Environment is Simulated
Live quick-commerce dark stores cannot be used as trial sandboxes for unproven autonomous agents. Running experiments in production dark stores risks actual customer stockouts, food waste, and rider dispatch failures.

The environment simulates a 5-node Mumbai dark store network:
- **Topology:** Bandra West (BW-01), Andheri East (AE-02), Powai Galleria (PG-03), Lower Parel (LP-04), and Thane West (TW-05).
- **Spatial Transit Matrix:** Road distance, vehicle transit times (15–35 minutes), and dispatch capacity constraints between nodes.
- **Physical Dynamics:** Discrete manufacturing batches, shelf-life countdowns, and Poisson-distributed customer order generation.

We state clearly upfront: **this platform is evaluated against a deterministic simulated environment, not in a live production facility.**

---

## 5. Favorita Dataset: Demand Backbone & Exact Limitations
To ground simulated demand in empirical consumer grocery patterns rather than arbitrary uniform distributions, the simulator's demand volume calibration is modeled on the **Favorita Grocery Sales** dataset (Kaggle):
- **What Favorita Provides:** Daily grocery transaction histories across perishable and staple categories, capturing seasonality, promotional lift, and day-of-week demand variance across 4+ years.
- **How It Is Used:** Calibrates daily baseline category velocity, weekend uplift ratios, and relative SKU demand weightings across dairy, bakery, produce, staples, and packaged goods.
- **Where It Does Not Fit (Boundaries):**
  - Favorita captures traditional brick-and-mortar supermarket purchases in Ecuador, not sub-10-minute Indian quick-commerce orders.
  - Ecuadorian grocery data cannot identify Mumbai intraday micro-spikes (e.g. 7 AM milk rushes, 11 PM snack surges).
  - Intraday order distributions are driven by our explicit `category × hour block × weekday` rate table rather than interpolated daily totals.

---

## 6. What Would Change with Real Operational Dark Store Data
Deploying this decision engine into a real quick-commerce network (e.g. Zepto, Blinkit, Swiggy Instamart) would require replacing simulation models with real operational telemetry:
1. **WMS & Scanner Telemetry:** Live barcode scan events for bin replenishment, picker item pick times, and dock receipt acknowledgments.
2. **Real Intraday Order Streams:** True Indian quick-commerce checkout streams with basket abandonment signals and real-time customer substitution selections.
3. **Hyperlocal Rider Fleet State:** Live rider availability, route congestion indices, and delivery batching constraints.
4. **Physical Point of Sale (POS) Integration:** Automated shelf markdown execution and dynamic discounting on the consumer-facing app.
5. **Cold-Chain Sensor Telemetry:** IoT temperature monitoring in chillers to adjust dynamic shelf-life decay rates.

---

## 7. Single-Process In-Memory State vs Multi-Instance Production Architecture
The simulation engine currently maintains state in a single process with SQLite backing (WAL mode):
- **Why It Is Acceptable Here:** For an interactive case study and single-operator command center, single-process state guarantees zero-overhead synchronization, deterministic stepping, and immediate event propagation without distributed consensus delays.
- **Why It Is Unsafe for Multi-Instance Production:** In a production multi-worker deployment (e.g. Kubernetes pods behind an ingress load balancer), in-process state would cause split-brain anomalies, double-execution of replenishment recommendations, and lost clock advances.
- **Production Path:** Transition to PostgreSQL with row-level locks (`SELECT FOR UPDATE`), Redis Streams for the event bus, and distributed leader election for the simulation clock.

---

## 8. Known Operational Limits
- **POS Discount Integration is Not Implemented:** Discount actions are proposed recommendations only. They do not trigger live consumer app pricing updates.
- **Single-Echelon Dark Store Focus:** The platform models store-to-store transfers and Regional Fulfilment Centre (RFC) purchase orders. It does not model national primary distribution warehouses or multi-echelon port logistics.
- **No Causal Business Impact Claims:** We report measured numbers from controlled, same-seed simulation runs (e.g. stockout units, fulfilled orders, transit times). We make zero speculative claims of real-world gross margin improvements or counterfactual financial savings without an empirical live A/B trial.
