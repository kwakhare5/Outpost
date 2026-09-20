# Engineering Journal — Dark Store Operator

## 2026-09-20: Quick-Commerce Case Study Hardening & Deterministic Execution

### Work Card: Four Must-Fix Items & Operational Realism
- **Problem / tension:** The repository previously mixed simulated quick-commerce dark store operations with leftover consumer catalog artifacts from another project, had disconnected scenario multipliers, simulated instant replenishment (ignoring physical transport transit times), contained a hardcoded scoreboard claiming unproven stockout avoidance, and described simple double exponential smoothing as machine learning without volume-weighted error metrics.
- **Change / decision:**
  1. Purged all Grocer leftovers, dead mocks, and hardcoded scoreboard baselines.
  2. Implemented Fix A (Scenario Engine): wired `demand_spike` (2.5× dairy, 2.0× bakery) and `supplier_delay` (+24h) multipliers directly into order generation and PO lead-time calculations.
  3. Implemented Fix B (Replenishment Realism): renamed suppliers to Regional Fulfilment Centres (RFCs); modeled purchase orders and transfers with in-transit states and calculated arrival ETAs. Stock is never credited upon dispatch—only upon physical arrival.
  4. Implemented Fix D (Forecasting Honesty & Metrics): named the forecasting algorithm **Holt linear**; eliminated all machine learning claims; surfaced rolling MAE and **WAPE** ($\frac{\sum |a-p|}{\sum a} \times 100\%$) alongside the 3-day holdout backtest against a 14-day moving average.
  5. Implemented Sales Accounting: drove demand from an explicit `category × hour block × weekday` rate table; separated `requested_quantity`, `fulfilled_quantity`, and `lost_quantity` (`requested == fulfilled + lost`). Unfulfilled demand is never recorded as completed sales.
  6. Documented architectural trade-offs in [`DESIGN_DECISIONS.md`](./DESIGN_DECISIONS.md) and restructured [`README.md`](./README.md) into the 7-section quick-commerce case study format.
- **Proof:**
  - `backend/tests/test_scenarios_deterministic.py`: 4/4 passing tests.
  - `backend/tests/test_replenishment_realism.py`: 6/6 passing tests.
  - `backend/tests/test_forecasting_honesty.py`: 5/5 passing tests.
  - `backend/tests/test_sales_accounting.py`: 5/5 passing tests.
  - Full backend pytest suite: 276 passed in 247.46s (100% green across all 23 suites).
  - Next.js 16 (Turbopack) production build (`npm run build`) passing with zero errors.
  - ESLint 9 validation (`npm run lint`) passing with zero errors.
- **Still broken / unproven:**
  - Real point-of-sale register connection is not implemented (discounting remains a proposed recommendation).
  - Single-process in-memory state with SQLite is not ready for multi-instance distributed production without migration to PostgreSQL row locks and Redis Streams.
- **Metric context:**
  - Test coverage: 276 passed tests across 23 suites (zero mocks on domain invariants).
  - Forecast evaluation: WAPE formula validated on deterministic fixtures and holdout historical series.
  - Build output: Static and dynamic pages compiled in 2.2s under Next.js 16 Turbopack.
- **Trial-ready flow:**
  - Operator triggers `demand_spike` scenario $\rightarrow$ order generation scales by category multiplier $\rightarrow$ Holt linear forecasts adjust $\rightarrow$ risk engine proposes `TRANSFER` or `REORDER` $\rightarrow$ operator reviews reason codes and approves $\rightarrow$ action enters `in_transit` state with arrival ETA $\rightarrow$ clock advances past ETA $\rightarrow$ physical FIFO batches arrive and update on-hand stock.
- **Engineering references:**
  - [`DarkStore-Spec.md`](./DarkStore-Spec.md)
  - [`DESIGN_DECISIONS.md`](./DESIGN_DECISIONS.md)
  - [`backend/services/forecasting/models.py`](./backend/services/forecasting/models.py)
  - [`backend/services/simulation/engine.py`](./backend/services/simulation/engine.py)
