# TASKS.md — Active Implementation Checklist

PURPOSE: Tracks the ordered sequence of small, verifiable tasks.
The AI works through one task at a time and runs verification before checking it off.

RULES FOR THE AI:
1. Do NOT work on multiple tasks at once.
2. Pick the top unchecked task `[ ]`.
3. Write the code, run `.\verify.ps1`.
4. Only mark `[x]` when the verification script passes with exit code 0.
5. Log the verified result in `JOURNAL.md`.

---

## Current Sprint / Milestone
**Goal:** Scaffold Next.js 16 + Supabase Cloud PostgreSQL foundation and build verified core engines for Outpost V1.

---

## Phase 1: Project Scaffold & Supabase Schema
- [x] **Task 1.1:** Isolate repository in `D:\Outpost V1`, seed PRD, ADRs (0001–0009), and core memory docs.
  - _Verification:_ `git status` clean with root docs and ADRs.
- [x] **Task 1.2:** Scaffold Next.js 16 App Router project with TypeScript, Tailwind CSS, Lucide icons, Vitest, and PostgreSQL client connected to Supabase.
  - _Verification:_ `.\verify.ps1` runs clean (typecheck, tests, build).
- [x] **Task 1.3:** Create Supabase PostgreSQL migrations (8 tables: stores, store_routes, products, batches, real_demand_curves, van_transfers, time_clock, outcomes_ledger).
  - _Verification:_ Live query verifies all 8 tables exist in Supabase `public` schema.

---

## Phase 2: Real Data Ingestion & Core Domain Engines
- [x] **Task 2.1:** Seed 3-store real demand curves from `data/mumbai_anchor_demand.csv` into Supabase `real_demand_curves`, `stores`, and `products`.
  - _Verification:_ Live query confirms 3 stores and 5 products seeded with real hourly sales curves in `real_demand_curves`.
- [x] **Task 2.2:** Build Inventory & Oldest-First engine with automated expiry locking (`lib/engine/inventory.ts`).
  - _Verification:_ Automated tests verifying oldest batch deducts first and expired batches are locked from fulfillment.
- [x] **Task 2.3:** Build Urgency Detection engine ("Hours Left" calculation from real demand curves) (`lib/engine/urgency.ts`).
  - _Verification:_ Unit test proving Amul Milk stockout detected ~50 minutes ahead.
- [x] **Task 2.4:** Build Decision & Safety engine (Van transfer recommendation with donor safety cushion check & cart rationing) (`lib/engine/decision.ts`).
  - _Verification:_ Unit test proving Bandra transfer recommendation without causing Bandra deficit.

---

## Phase 3: Van Transfers, Doorstep Gate & Outcomes Ledger
- [x] **Task 3.1:** Build Van Transfer state machine and Doorstep Count confirmation API (`/api/transfers/[id]/confirm-doorstep`).
  - _Verification:_ Conservation of mass test: Bandra deducted, zero in-transit destination credit, counted arrival credited, 2 leaking cartons logged to road damage, idempotent.
- [ ] **Task 3.2:** Build Top-Bar Time Clock controller (`/api/clock/advance`).
  - _Verification:_ Advancing 1 hour consumes demand from oldest batches, advances vans, and recalculates Hours Left.
- [ ] **Task 3.3:** Build Shadow Run Outcomes calculator ("With Outpost" vs "Without Outpost") (`lib/engine/baseline.ts`).
  - _Verification:_ Test verifies paired comparison produces exact net rupee savings against baseline.

---

## Phase 4: Applied AI Co-Pilot & CSV Data Ingestion
- [ ] **Task 4.1:** Build Operator Co-Pilot Chatbot API (`/api/chat`) using `@google/genai` grounded in live Supabase rows.
  - _Verification:_ Test verifying chat returns 2-sentence answers with live store state and offline fallback.
- [ ] **Task 4.2:** Build Custom CSV Ingestion engine (`/api/ingest/csv` and `/api/ingest/reset`).
  - _Verification:_ Test verifying custom 6-column CSV ingests into Supabase and re-renders engine state.

---

## Phase 5: Mission-Control UI
- [ ] **Task 5.1:** Build Top-Bar Clock Controller and Header (`components/top-clock-bar.tsx`).
- [ ] **Task 5.2:** Build Live Command Queue Screen & Proof Pane (`components/queue-screen.tsx`).
- [ ] **Task 5.3:** Build In-Flight Van Tracker & Doorstep Count Modal (`components/inflight-screen.tsx`).
- [ ] **Task 5.4:** Build Realized Outcomes Scorecard (`components/outcomes-screen.tsx`).
- [ ] **Task 5.5:** Build Slide-Out Co-Pilot Chat Drawer (`components/copilot-drawer.tsx`) and CSV Upload Modal (`components/csv-upload-modal.tsx`).
- [ ] **Task 5.6:** End-to-End "Milk Test" verification via `.\verify.ps1`.
  - _Verification:_ Complete Milk Test runs green from stockout warning to doorstep count and outcomes ledger.
