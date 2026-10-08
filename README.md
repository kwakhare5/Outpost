# Outpost — Quick-Commerce Inventory Replenishment Decision Engine

[![Next.js](https://img.shields.io/badge/Next.js-16.2.6-black?style=flat&logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=flat&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.12+-3776AB?style=flat&logo=python)](https://python.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=flat&logo=typescript)](https://typescriptlang.org/)
[![Tests](https://img.shields.io/badge/Tests-109%20Passing-brightgreen?style=flat)]()

---

## 1. Live Demo Link
🔗 **Live Operations Cockpit:** [https://dark-store-operator.vercel.app](https://dark-store-operator.vercel.app) *(Deployment Link)*  
📂 **Engineering Design Decisions:** [`DESIGN_DECISIONS.md`](./DESIGN_DECISIONS.md)  
📋 **Master Specification & Operational Case Study:** [`OUTPOST_SPEC.md`](./docs/OUTPOST_SPEC.md)

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

## 4. The Problem (Sourced Quick-Commerce Cost Realities & Industry Citations)

Quick-commerce delivery networks (10-to-15 minute delivery promises) operate with hyper-compressed fulfillment cycles and single-digit margins in 2,000–4,000 sq ft micro-warehouses:

- **The "Availability Bias" & Censored Demand Trap:** As published by Swiggy Instamart's data science team (*Swiggy Bytes, Banik & Shedthikere 2023*), raw sales logs represent a censored proxy for true demand. When an SKU stocks out, recorded sales drop to zero; standard models evaluate this as low demand, systematically under-forecasting and under-replenishing in a destructive cycle.
- **Stockout Churn:** Quick-commerce grocery orders suffer an **8% to 15% out-of-stock rate** during demand surges, with over **40% of consumers switching to a rival platform** (Zepto, Blinkit, Instamart) when a staple SKU is unavailable (*Bain & Company / Redseer Quick Commerce Report 2024*). Stockouts above **5% OOS** trigger permanent churn.
- **"Dump-Related Cost Burns" (Perishable Wastage):** Blinkit engineering (*Lambda by Blinkit, Utkarsh Shukla*) highlights that quick-commerce dark stores lack walk-in clearance aisles to offload expiring stock; over-replenishment causes direct financial write-offs. Perishable inventory waste must stay strictly below **1.5% of GMV** (*Axis Capital / Zepto Financial Disclosures*) to preserve store contribution margins.
- **Continuous Replenishment vs. Emergency Overhead:** Blinkit engineering (*Manik Chawla*) notes that *"Continuous replenishment is a 0–1 problem; dark stores require continuous inventory flow with automated triggers when availability dips."* Unscheduled emergency reorders cost **2.5× to 4× standard distribution routing** (*McKinsey Supply Chain Review*).

Preventing these losses requires predictive intervention before stockouts occur, transparent tracking of requested vs. lost demand, and strict inventory mass conservation so operators can trust autonomous recommendations.

📂 *Full industry ground truth, quantitative benchmarks, architecture, and executive outreach machine available in [`OUTPOST_SPEC.md`](./OUTPOST_SPEC.md).*

---

## 5. System Architecture

The system coordinates four tightly coupled layers:

```
┌────────────────────────────────────────────────────────────────────────┐
│               Operations Deck (Next.js 16 + Tailwind CSS)              │
│  - Spatial Mumbai Fleet Mesh (3 Hubs)    - Candidate Action Drawer     │
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
| **Error Metric** | **WAPE & MAE** | Supply chains reject MAPE because low-volume actuals explode percentage errors. WAPE ($\frac{\sum |a - p|}{\sum a} \times 100$) provides robust volume-weighted accuracy. |
| **Demand Calibration** | Documented Intraday Assumptions | Intraday Mumbai delivery dynamics are modeled via an explicit `category × hour block × weekday` rate table without synthetic fabrication. |
| **Execution Engine** | 5-Node LangGraph DAG | Graph state machine provides explicit pre-check, invariant verification, rollback compensation, and event logging. |

*(For full architectural rationale, see [`DESIGN_DECISIONS.md`](./DESIGN_DECISIONS.md).)*

---

## 7. Honest Limits & Boundaries

1. **Simulated Fleet Environment:** The 3 Mumbai dark stores (Andheri West, Bandra, Powai) operate inside a deterministic simulator with simulated Western Express Highway travel times and Poisson order arrival.
2. **Demand Calibration Scope:** Intraday demand profiles are modeled via an explicit `category × hour block × weekday` rate table with Holt linear double exponential smoothing.
3. **POS Integration Not Implemented:** Discount actions are proposed recommendations only; point-of-sale pricing updates are not connected to a physical retail register.
4. **Single-Process Runtime State:** Simulation state is maintained in a single process with SQLite backing. Multi-instance production deployment would require distributed consensus and row-locked PostgreSQL storage.
5. **No Speculative ROI Claims:** We report empirical error metrics (MAE, WAPE) and simulated operational outcomes (stockouts prevented under scenario runs). We make zero unsubstantiated claims of dollar savings without a live controlled trial.

---

## 💻 Tech Stack & Test Suite

- **Backend:** Python 3.11+, FastAPI, SQLAlchemy (Async), SQLite WAL, LangGraph, Pydantic v2.
- **Frontend:** Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS v4, Lucide React, Sonner.
- **Test Suite:** **109 passing tests** (101 backend pytest unit tests + 8 domain invariant and conservation checks).

### Running Tests
```powershell
# Backend pytest suite (101 unit tests)
pytest backend/tests -q

# Frontend invariant verification (8 invariant checks)
npm test

# Linting
npm run lint
```

### Running Locally (Dual Mode)
```powershell
# 1. Full-Stack Connected Mode (Port 8000 + Port 3000)
# Terminal 1:
uvicorn backend.main:app --reload --port 8000

# Terminal 2:
npm run dev

# 2. Standalone UI Simulation Mode (Port 3000)
npm run dev
# The Next.js client seamlessly falls back to local deterministic state when FastAPI is offline.
```
Open [http://localhost:3000](http://localhost:3000) to view the Operations Cockpit.
