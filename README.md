# Outpost — Quick-Commerce Inventory Replenishment Decision Engine

[![Next.js](https://img.shields.io/badge/Next.js-16.2.6-black?style=flat&logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=flat&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.12+-3776AB?style=flat&logo=python)](https://python.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=flat&logo=typescript)](https://typescriptlang.org/)
[![Tests](https://img.shields.io/badge/Tests-270%20Passing-brightgreen?style=flat)]()

---

## 1. Live Demo Link
🔗 **Live Operations Cockpit:** [https://dark-store-operator.vercel.app](https://dark-store-operator.vercel.app) *(Deployment Link)*  
📂 **Engineering Design Decisions:** [`DESIGN_DECISIONS.md`](./DESIGN_DECISIONS.md)  
📋 **Specification & Audit Document:** [`DarkStore-Spec.md`](./DarkStore-Spec.md)

---

## 2. 30-Second "What It Does" Explanation

Quick-commerce dark stores lose money to stockouts and expired stock. **Outpost** is a deterministic decision engine that monitors a multi-node dark store network in real time, forecasts localized demand, and proposes inventory transfers and purchase orders—**with a human operator approving every high-consequence action before execution**.

The platform is designed around **Level-2 Autonomy**:
- **Proactive Proposal, Never Silent Action:** The engine identifies risks (e.g. stockout in 3.4 hours) and prepares candidates (`TRANSFER` from adjacent hub, `REORDER` from Regional Fulfilment Centre).
- **Physical Realism:** Replenishment is never instant. Transfers and purchase orders operate with transit lead times and arrival ETAs; stock increases only when items physically arrive.
- **Auditable Safety Gate:** Double-checked pre-execution validation, stale-state detection, idempotency tokens, and recovery fallbacks prevent phantom stock creation or duplicate executions.

> **Note on Environment:** All dark-store operations, topologies, rider transits, and batch expiries are evaluated against a **deterministic simulator stated upfront**, not a live dark store network.

---

## 3. Demo Video
📹 **60–90 Second Video Walkthrough:** [Watch Demo Video (IPL Demand Spike Flow)](https://github.com/kwakhare5/Outpost#demo-video) *(Coming in release assets)*

### Suggested 60–90s Demo Flow:
1. **0–10s:** State the tension: An IPL evening rush drains dairy and snacks in Bandra while excess stock sits in Andheri.
2. **10–25s:** Trigger the `demand_spike` scenario. Observe demand rate tables shift and Holt linear forecasts revise upward.
3. **25–45s:** Review the proposed inter-store `TRANSFER`. Highlight the human approval gate, score breakdown, and reason codes.
4. **45–60s:** Approve the transfer. Watch the order enter the `in_transit` state with an estimated arrival timestamp (ETA). Destination stock remains unchanged.
5. **60–75s:** Advance simulation clock by 2 hours. Physical transfer arrives, batches are added, and stockouts are avoided.
6. **75–90s:** Summarize honest limits: Favorita-calibrated demand backbone, deterministic LangGraph DAG, and what real dark-store WMS telemetry would replace.

---

## 4. The Problem (Sourced Quick-Commerce Cost Realities)

Quick-commerce delivery networks (10-to-15 minute delivery promises) operate with hyper-compressed fulfillment cycles and single-digit margins:

- **Stockout Churn:** Quick-commerce grocery orders suffer an **8% to 15% out-of-stock rate** during demand surges, with over **40% of consumers switching to a rival platform** (Zepto, Blinkit, Instamart) when a staple SKU is unavailable (*Bain & Company / Redseer Quick Commerce Report 2024*).
- **Perishable Food Waste:** Approximately **4% to 7% of fresh dairy, bakery, and produce inventory** in dark stores is written off as shrinkage due to shelf-life expiration (*USDA Economic Research Service; BCG Retail Waste Benchmarks*).
- **Emergency Replenishment Overhead:** Ad-hoc, unscheduled intraday warehouse reorders and point-to-point courier runs cost **2.5× to 4× standard distribution routing**, eroding net unit economics (*McKinsey Supply Chain Review*).

Preventing these losses requires predictive intervention before stockouts occur, while strictly enforcing inventory mass conservation so operators can trust autonomous recommendations.

---

## 5. System Architecture

The system coordinates four tightly coupled layers:

```
┌────────────────────────────────────────────────────────────────────────┐
│               Operations Deck (Next.js 16 + Tailwind CSS)              │
│  - Spatial Mumbai Fleet Mesh (5 Hubs)    - Candidate Action Drawer     │
│  - Human-in-the-Loop Approval Gate       - Real-Time Simulation Clock  │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │ REST / Server-Sent Events
┌──────────────────────────────────▼─────────────────────────────────────┐
│                       FastAPI Operational Core                         │
│  - Deterministic Poisson/Rate Table     - Physical FIFO Batch Ledger   │
│  - Conservation of Mass Enforcer        - Event Bus & Audit Logging    │
└───────────────────┬───────────────────────────────┬────────────────────┘
                    │                               │
┌───────────────────▼──────────────┐   ┌────────────▼────────────────────┐
│   Intelligence & Forecasting     │   │   LangGraph Execution State     │
│  - Holt Linear (Double Smoothing)│   │  - Node 1: Pre-Check & Locks    │
│  - 3-Day Holdout Model Selection │   │  - Node 2: Capacity & Invariant │
│  - Rolling MAE & WAPE Reporting  │   │  - Node 3: FIFO Batch Mutation  │
│  - 7-D Hazard / Lead Time Score  │   │  - Node 4: Event Bus Audit      │
│                                  │   │  - Node 5: Recovery Handler     │
└──────────────────────────────────┘   └─────────────────────────────────┘
```

### Physical Invariants Enforced by the System:
1. **Batches as Absolute Truth:** Inventory is stored as physical manufacturing batches with discrete expiration timestamps. Depletions and transfers strictly follow FIFO.
2. **Conservation of Mass:** Store transfers deduct units from source batches upon dispatch and credit destination batches upon arrival. Phantom inventory creation is impossible.
3. **Realistic In-Transit Replenishment:**
   - **Reorders:** Modeled as formal Purchase Orders to Regional Fulfilment Centres (RFCs) with supplier lead times. Stock arrives only after elapsed transit time.
   - **Transfers:** Handled via `dispatch_transfer` with road distance and transit ETAs. Destination inventory remains unchanged while items are in transit.
4. **Sales Accounting:** Requested demand, fulfilled units, and lost sales are tracked separately (`requested == fulfilled + lost`). Unfulfilled demand is never recorded as completed revenue.

---

## 6. Design-Decisions Summary

| Decision | Chosen Architecture | Rationale & Trade-off |
|---|---|---|
| **Execution Model** | Deterministic Seeded State Machine | Replenishment commits capital; stochastic agents prevent RCA and testing. Fixed seeds enable exact replay of edge cases. |
| **Autonomy Level** | Level-2 (Human Approval Gate) | Autonomous execution without human oversight risks inventory drain during false spikes. The machine proposes; the human signs off. |
| **Forecasting Method** | **Holt Linear** (Double Exponential Smoothing) | Pure mathematical time series (Level + Trend). Evaluated against a 14-day moving average over a 3-day holdout; lower MAE candidate is selected. **Zero machine learning hype.** |
| **Error Metric** | **WAPE & MAE** | Supply chains reject MAPE because low-volume actuals explode percentage errors. WAPE ($\frac{\sum \|a - p\|}{\sum a} \times 100$) provides robust volume-weighted accuracy. |
| **Demand Calibration** | **Favorita Grocery Dataset** | Real Kaggle grocery sales dataset (Ecuador, 4+ years) calibrates baseline category volumes, price elasticities, and weekend lifts without synthetic fabrication. |
| **Execution Engine** | 5-Node LangGraph DAG | Graph state machine provides explicit pre-check, invariant verification, rollback compensation, and event logging. |

*(For full architectural rationale, see [`DESIGN_DECISIONS.md`](./DESIGN_DECISIONS.md).)*

---

## 7. Honest Limits & Boundaries

1. **Simulated Fleet Environment:** The 5 Mumbai dark stores (Bandra West, Andheri East, Powai Galleria, Lower Parel, Thane West) operate inside a deterministic simulator with simulated road travel times and Poisson order arrival.
2. **Favorita Dataset Scope:** The Favorita dataset provides real daily grocery demand profiles, but originates from Ecuadorian retail stores. It does not reflect Mumbai intraday delivery dynamics; intraday patterns are modeled via an explicit `category × hour block × weekday` rate table.
3. **POS Integration Not Implemented:** Discount actions are proposed recommendations only; point-of-sale pricing updates are not connected to a physical retail register.
4. **Single-Process Runtime State:** Simulation state is maintained in a single process with SQLite backing. Multi-instance production deployment would require distributed consensus and row-locked PostgreSQL storage.
5. **No Speculative ROI Claims:** We report empirical error metrics (MAE, WAPE) and simulated operational outcomes (stockouts prevented under scenario runs). We make zero unsubstantiated claims of dollar savings without a live controlled trial.

---

## 💻 Tech Stack & Test Suite

- **Backend:** Python 3.12, FastAPI, SQLAlchemy (Async), SQLite WAL, LangGraph, Pydantic v2.
- **Frontend:** Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS v4, Framer Motion, Lucide React, Recharts.
- **Test Suite:** **270+ passing tests** across 23 test suites covering deterministic scenarios, two-phase replenishment, sales accounting, and invariant conservation.

### Running Backend Tests
```bash
cd backend
python -m pytest tests/ -v
```

### Running Frontend Locally
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the Operations Cockpit.
