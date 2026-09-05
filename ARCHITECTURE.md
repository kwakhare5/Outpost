# ARCHITECTURE.md — Dark Store Operator

---

## 1. System Topology

```
┌──────────────────────────────────────────────────────────────┐
│                    Operations Deck (Next.js)                 │
│  - Spatial Topology View (Mumbai 5-Store Mesh)               │
│  - Real-Time Recommendation Stream & 16 Reason Codes         │
│  - 5-Node LangGraph Visual Agent Inspector                   │
│  - Interactive WHY? Inspector Drawer & Safe Excess Audit     │
│  - Floating Simulation Dock & Benchmark Scenario Runner      │
└──────────────────────────────┬───────────────────────────────┘
                               │ REST API (:8000)
┌──────────────────────────────▼───────────────────────────────┐
│                      FastAPI Backend Engine                  │
│  - Simulation Clock & Stochastic Poisson Demand              │
│  - Holt Double Exponential Smoothing & Trend Forecaster      │
│  - 7-D Stockout & Spoilage Hazard Risk Engine                │
│  - Multi-Criteria Pareto Decision Engine                     │
│  - LangGraph 5-Node Autonomous Execution Agent               │
│  - SQLite Async DB with Batches as Physical Truth            │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. Core Invariants

1. **Batches as Physical Ground Truth:** Stock levels are derived from discrete `Batch` entities with expiration dates.
2. **Strict FIFO Depletion:** Demand and transfer shipments always deplete oldest batches first.
3. **Conservation of Mass:** Transferred units strictly balance across source and destination without loss or creation.
4. **Level-2 Human Approval:** High-consequence transfers and purchase orders require human authorization.
5. **Dynamic Safe Recovery:** When pre-checks detect sudden inventory changes, the LangGraph agent aborts the action safely and re-triggers alternative evaluation.
