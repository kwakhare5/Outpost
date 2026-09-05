# Dark Store Operator — Autonomous Quick-Commerce Fleet Operations Platform

[![Next.js](https://img.shields.io/badge/Next.js-16.2.6-black?style=flat&logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=flat&logo=fastapi)](https://fastapi.tiangolo.com/)
[![LangGraph](https://img.shields.io/badge/LangGraph-Autonomous%20Pipeline-blue)](https://github.com/langchain-ai/langgraph)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat&logo=python)](https://python.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=flat&logo=typescript)](https://typescriptlang.org/)

**Dark Store Operator** is an enterprise-grade autonomous quick-commerce inventory decision and execution command center. Engineered for sub-10-minute grocery delivery networks (modeled on Swiggy Instamart, Zepto, and Blinkit), it orchestrates multi-node dark store inventory, anticipates stockout and spoilage risks before they manifest, and executes optimal replenishment actions via a verified 5-node LangGraph autonomous agent.

---

## 🏗️ System Architecture

The platform operates across 4 tightly coupled architectural tiers:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Operations Cockpit UI                           │
│  - Spatial Fleet Mesh (5 Mumbai Hubs)    - Live Stream Recommendation  │
│  - 5-Node LangGraph Visual Inspector     - Interactive WHY? Drawer     │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │ REST / WebSocket
┌──────────────────────────────────▼─────────────────────────────────────┐
│                       FastAPI Backend Core                             │
│  - Simulation Clock & Poisson Demand   - Batches as Physical Truth     │
│  - FIFO Depletion & Event Sourcing     - Deterministic Seed Engine     │
└───────────────────┬───────────────────────────────┬────────────────────┘
                    │                               │
┌───────────────────▼──────────────┐   ┌────────────▼────────────────────┐
│   Intelligence & Decision Core   │   │   LangGraph Execution Engine    │
│  - Holt Exponential Forecasting  │   │  - Node 1: Pre-execution Safety │
│  - 7-D Risk Engine (Hazard/Lead) │   │  - Node 2: Policy & Constraints │
│  - Pareto Multi-Criteria Ranking │   │  - Node 3: Inventory Mutation   │
│  - 16 Deterministic Reason Codes │   │  - Node 4: Audit Sourcing       │
│                                  │   │  - Node 5: Recovery Handler     │
└──────────────────────────────────┘   └─────────────────────────────────┘
```

---

## 🚀 Key Capabilities

### 1. Spatial Mumbai Fleet Topology
- Models 5 high-density Mumbai quick-commerce hubs:
  - **Bandra West (BW-01)** — High-velocity perishables & premium dairy
  - **Andheri East (AE-02)** — Industrial hub & regional distribution node
  - **Powai Galleria (PG-03)** — Tech-corridor grocery demand
  - **Lower Parel (LP-04)** — High-AOV gourmet pantry replenishment
  - **Thane West (TW-05)** — High-volume staple & grocery fulfillment
- Real-time transit matrix with inter-store transit times (15–35 mins) and dispatch capacity constraints.

### 2. Physical Inventory & FIFO Batch Tracking
- **Batches as Absolute Truth:** Physical stock is represented as discrete manufacturing/harvest batches with expiration timestamps.
- **FIFO Deduction Invariant:** Inventory depletion and stock transfers strictly deduct from oldest surviving batches first.
- **Conservation of Mass:** Inter-store transfers deduct from source and credit to destination with zero phantom units created or lost.

### 3. Forecasting & 7-Dimensional Risk Scoring
- **Holt Double Exponential Smoothing:** Evaluates level and trend over rolling hourly sales windows.
- **7-D Risk Engine:** Computes risk score $R \in [0, 100]$ using:
  1. Projected stockout hours
  2. Spoilage hazard rate ($\lambda = \frac{1}{\text{shelf\_life}}$)
  3. Supplier reorder lead time
  4. Inter-store transit delay
  5. Minimum safety buffer
  6. Historical demand variance
  7. Category criticality factor

### 4. Deterministic Pareto Decision Engine
- Evaluates 4 core actions:
  - `TRANSFER`: Inter-store rebalancing from stores with verified Safe Excess (`inventory - demand - buffer > quantity`).
  - `REORDER`: Autonomous purchase order generation to approved regional suppliers.
  - `DISCOUNT`: Dynamic price markdowns (15%–40%) for perishables nearing shelf expiration.
  - `HOLD`: Passive monitoring when buffer levels remain nominal.
- Emits structured explainability via **16 deterministic reason codes** (e.g., `TRANSFER_FASTEST_TRANSIT`, `SPOILAGE_WINDOW_CRITICAL`).

### 5. LangGraph 5-Node Autonomous Execution Agent
- **Node 1: Pre-Execution Safety Check** — Verifies batch availability, lock status, and transit capacity immediately before execution.
- **Node 2: Policy & Constraint Verification** — Enforces store capacity limits, minimum transfer thresholds, and supplier minimum orders.
- **Node 3: Execution & Batch Mutation** — Atomic database commit applying FIFO deductions and inter-store balance adjustments.
- **Node 4: Audit Logging & Event Propagation** — Emits structured audit events to the global event bus.
- **Node 5: Dynamic Recovery Handler** — If pre-check fails (e.g. source stock sudden depletion), automatically triggers fallback re-evaluation and requests human review.

---

## 🔒 Level-2 Human Autonomy
- High-consequence decisions (`TRANSFER`, `REORDER`) require explicit human authorization via the Operations Deck.
- All actions are guarded server-side: an unauthorized execution request directly triggers `HTTP 403 / 400 Validation Error`.

---

## 💻 Tech Stack

- **Frontend:** Next.js 16.2.6 (Turbopack), React 19, TypeScript 5, Tailwind CSS v4, Framer Motion, Lucide React, Sonner.
- **Backend:** Python 3.11+, FastAPI, SQLAlchemy Async, SQLite (WAL mode), LangGraph, Pydantic v2.
- **Testing:** Pytest, pytest-asyncio (100% green coverage across 20+ operational test suites).
- **Design System:** Swiss Logistics Typography (`TWK Lausanne Pan 800`, `Geist Sans`, `Geist Mono`, `PP Editorial New`).

---

## 🏁 Quickstart

### 1. Backend Service
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
pip install -r requirements.txt

# Run operational test suite
pytest tests/

# Start FastAPI server on port 8000
uvicorn backend.main:app --reload --port 8000
```

### 2. Frontend Operations Deck
```bash
npm install
npm run dev
# Open http://localhost:3000 in your browser
```

---

## 📄 License
MIT © 2026 Karan Wakhare
