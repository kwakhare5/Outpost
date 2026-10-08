# Outpost — Quick-Commerce Inventory Replenishment Decision Engine

[![Next.js](https://img.shields.io/badge/Next.js-16.2.6-black?style=flat&logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=flat&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat&logo=python)](https://python.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=flat&logo=typescript)](https://typescriptlang.org/)
[![Tests](https://img.shields.io/badge/Tests-109%20Passing-brightgreen?style=flat)]()

---

## 1. Live Operations Console
- 🔗 **Production Deployment:** [https://outtpost.vercel.app](https://outtpost.vercel.app)
- 📂 **Engineering Design Decisions:** [`DESIGN_DECISIONS.md`](./DESIGN_DECISIONS.md)
- 📋 **Master Specification & Operational Case Study:** [`OUTPOST_SPEC.md`](./docs/OUTPOST_SPEC.md)

---

## 2. What It Does (Level-2 Autonomy)

Quick-commerce dark stores lose margin to preventable stockouts and perishable write-offs. **Outpost** is a deterministic replenishment decision engine that monitors localized demand across a multi-node dark store network, forecasts unconstrained demand rates, and proposes lateral stock transfers and purchase orders—**with a human planner reviewing and approving every high-consequence action before physical execution**.

### Core Operational Principles:
- **Proactive Proposal, Never Silent Action:** The engine detects inventory risks (e.g. stockout in ~5.0 hours) and ranks candidates (`TRANSFER` from adjacent hub, `REORDER` from Regional Fulfilment Centre, `DISCOUNT` on expiring batches).
- **Physical Realism:** Replenishment is never instantaneous. Lateral transfers operate with modeled road transit times and arrival ETAs along Mumbai corridors. Destination stock credits only after physical crate counting at the dock door.
- **Auditable Safety Gate:** Double-checked pre-execution validation, stale-state detection, idempotency tokens, and reversible decisions prevent phantom stock creation or duplicate dispatches.

> **Simulation Boundary:** All store operations, topologies, highway transits, and batch expiries are evaluated against a **deterministic simulator stated upfront**, not a live dark store network.

---

## 3. The Problem: Quick-Commerce Economics & Censored Demand

Quick-commerce delivery networks (10-to-15 minute delivery promises) operate with hyper-compressed fulfillment cycles and single-digit margins in 2,000–4,000 sq ft micro-warehouses:

- **The "Availability Bias" & Censored Demand Trap:** As published by Swiggy Instamart's data science team (*Swiggy Bytes, Banik & Shedthikere 2023*), raw sales logs represent a censored proxy for true demand. When an SKU stocks out, recorded sales drop to zero; standard models evaluate this as low demand, systematically under-forecasting and under-replenishing in a destructive cycle.
- **Stockout Churn:** Quick-commerce grocery orders suffer an **8% to 15% out-of-stock rate** during demand surges, with over **40% of consumers switching to a rival platform** (Zepto, Blinkit, Instamart) when a staple SKU is unavailable (*Bain & Company / Redseer Quick Commerce Report 2024*). Stockouts above **5% OOS** trigger permanent churn.
- **Perishable Wastage ("Dump Burns"):** Blinkit engineering (*Lambda by Blinkit, Utkarsh Shukla*) highlights that quick-commerce dark stores lack walk-in clearance aisles to offload expiring stock; over-replenishment causes direct financial write-offs. Perishable inventory waste must stay strictly below **1.5% of GMV** (*Axis Capital / Zepto Financial Disclosures*) to preserve store contribution margins.
- **Continuous Replenishment vs. Emergency Overhead:** Blinkit engineering (*Manik Chawla*) notes that *"Continuous replenishment is a 0–1 problem; dark stores require continuous inventory flow with automated triggers when availability dips."* Unscheduled emergency reorders cost **2.5x to 4x standard distribution routing** (*McKinsey Supply Chain Review*).

Preventing these losses requires predictive intervention before stockouts occur, transparent tracking of requested vs. lost demand ($requested = fulfilled + lost$), and strict inventory mass conservation so operators can trust autonomous recommendations.

---

## 4. System Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│               Operations Deck (Next.js 16 + Tailwind CSS)              │
│  - 3-Node Mumbai Fleet Deck (Andheri, Bandra, Powai)                   │
│  - Level-2 Human Approval Gate           - Dynamic Hourly Demand Chart │
│  - Dock Count Confirmation Gate          - Reversible Decisions        │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │ REST / Server-Sent Events
┌──────────────────────────────────▼─────────────────────────────────────┐
│                       FastAPI Operational Core                         │
│  - Deterministic Rate Table             - Physical FIFO Batch Ledger   │
│  - Conservation of Mass Enforcer        - Event Bus & Audit Logging    │
└───────────────────┬───────────────────────────────┬────────────────────┘
                    │                               │
┌───────────────────▼──────────────┐   ┌────────────▼────────────────────┐
│   Intelligence & Forecasting     │   │   LangGraph Execution State     │
│  - Holt Linear (Double Smoothing)│   │  - Node 1: Pre-Check & Locks    │
│  - 3-Day Holdout Model Selection │   │  - Node 2: Capacity & Invariant │
│  - Rolling MAE & WAPE Reporting  │   │  - Node 3: FIFO Batch Mutation  │
│  - Unconstrained Demand Tracker  │   │  - Node 4: Event Bus Audit      │
│                                  │   │  - Node 5: Recovery Handler     │
└──────────────────────────────────┘   └─────────────────────────────────┘
```

### Physical Invariants Enforced by the System:
1. **Batches as Absolute Truth:** Inventory is stored as physical manufacturing batches with discrete expiration timestamps. Depletions and transfers strictly follow FIFO.
2. **Conservation of Mass ($\Delta = 0.00$):** Store transfers deduct units from source batches upon dispatch and credit destination batches upon physical arrival. Discrepancies route to the transit shrinkage ledger.
3. **Realistic In-Transit Replenishment:**
   - **Reorders:** Modeled as formal Purchase Orders to Regional Fulfilment Centres (RFCs) with supplier lead times. Stock arrives only after elapsed transit time.
   - **Transfers:** Handled via `dispatch_transfer` with road distance and transit ETAs. Destination inventory remains unchanged while items are in transit.
4. **Unconstrained Demand Accounting:** Requested demand, fulfilled units, and lost sales are tracked separately ($requested = fulfilled + lost$). Unfulfilled demand is never recorded as completed revenue.

---

## 5. Design Decisions Summary

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

## 6. Honest Limits & Boundaries

1. **Simulated Fleet Environment:** The 3 Mumbai dark stores (Andheri West, Bandra, Powai) operate inside a deterministic simulator with simulated Western Express Highway travel times and Poisson order arrival.
2. **Demand Calibration Scope:** Intraday demand profiles are modeled via an explicit `category × hour block × weekday` rate table with Holt linear double exponential smoothing.
3. **POS Integration Not Implemented:** Discount actions are proposed recommendations only; point-of-sale pricing updates are not connected to a physical retail register.
4. **Single-Process Runtime State:** Simulation state is maintained in a single process with SQLite backing. Multi-instance production deployment would require distributed consensus and row-locked PostgreSQL storage.
5. **No Speculative ROI Claims:** We report empirical error metrics (MAE, WAPE) and simulated operational outcomes (stockouts prevented under scenario runs). We make zero unsubstantiated claims of dollar savings without a live controlled trial.

---

## 7. Tech Stack & Test Suite

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

---

## 8. Deployment & Running Locally

### Deploying Frontend to Vercel
1. Import this repository into [Vercel](https://vercel.com).
2. Framework Preset: **Next.js** (detected automatically).
3. Root Directory: `./` (leave default).
4. Environment Variables (optional):
   - `NEXT_PUBLIC_BACKEND_URL`: URL of your deployed FastAPI backend (e.g., `https://outpost-api.onrender.com`).
   - If omitted, Outpost's hybrid client runs in **Local Simulation Mode** with deterministic zero-crash client-side state.
5. Click **Deploy**.

### Running Locally (Dual Mode)
```powershell
# 1. Full-Stack Connected Mode (Port 8000 + Port 3000)
# Terminal 1 (Backend):
uvicorn backend.main:app --reload --port 8000

# Terminal 2 (Frontend):
npm run dev

# 2. Standalone UI Simulation Mode (Port 3000)
npm run dev
# The Next.js client seamlessly falls back to local deterministic state when FastAPI is offline.
```
Open [http://localhost:3000](http://localhost:3000) to view the Operations Cockpit.
