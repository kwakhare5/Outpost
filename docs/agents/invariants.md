# Domain Invariants & Physical Conservation Contracts

This document formalizes the physical invariants and contracts enforced by the **Outpost** decision engine across both backend services and frontend operations.

---

## 1. Conservation of Mass ($\Delta = 0.00$)
- **Invariant:** Stock transfers between stores cannot create or destroy units.
- **Contract:**
  $$Opening + Receipts + Adjustments = OnHand + InTransit + FulfilledSales + Shrinkage$$
- **Dispatch:** Units deduct from source store batches upon dispatch into the transit manifest.
- **Receipt:** Destination available inventory increases *only* upon verified physical count confirmation at the dock door.
- **Discrepancy:** Any delta between manifest units and physically counted units (e.g. damaged crates) is booked directly into the `Transit Shrinkage Ledger`. Phantom units are never credited to sellable inventory.

---

## 2. Discrete FIFO/FEFO Batch Allocation
- **Invariant:** Fulfillment and transfer allocations strictly deduct from the earliest expiring eligible batches.
- **Quarantine:** Batches with expired timestamps ($\le 0$ hours remaining shelf life) are automatically quarantined from fulfillment and write-down ledgers. Expired units never enter customer bags.

---

## 3. Level-2 Human Approval Gate
- **Invariant:** High-consequence interventions (`TRANSFER`, `REORDER`) require explicit human operator approval before execution.
- **Idempotency:** Each recommendation carries a unique UUID, state machine revision, and idempotency token.
- **Rejection Fallback:** Rejecting a lateral transfer automatically presents a feasible alternative (e.g., queuing an emergency Regional Fulfilment Centre PO from Bhiwandi with +4h lead time).

---

## 4. Availability-Bias-Free Demand Accounting
- **Invariant:** Stockout-censored sales are never treated as true customer demand.
- **Formula:**
  $$Requested = Fulfilled + Lost$$
- When an SKU stocks out on the shelf, unfulfilled customer attempts are logged as lost sales. Holt linear and moving-average forecasting models evaluate unconstrained requested demand rather than fulfilled sales.

---

## 5. Realistic In-Transit Lead Times
- **Invariant:** Replenishment is never instantaneous.
- **Corridor Transit:** Inter-store transfers travel along documented Mumbai arterial corridors (e.g., Western Express Highway, Bandra-Worli Sea Link) with modeled road transit durations (15–35 minutes).
- **Dock Gate:** Dock receiving remains locked in preview until the vehicle reaches the dock door. Repeated submissions are idempotent.
