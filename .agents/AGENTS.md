# AGENTS.md — Outpost Project Rules

---

## 1. PROJECT IDENTITY
- **Name:** Outpost
- **Goal:** Autonomous quick-commerce inventory decision and replenishment execution platform for multi-node dark store networks (5 Mumbai hubs: Bandra West, Andheri East, Powai Galleria, Lower Parel, Thane West).
- **Status:** Complete, standalone Next.js + FastAPI + LangGraph operations platform.
- **Repo:** https://github.com/kwakhare5/Outpost

---

## 2. TECH STACK
- **Frontend:** Next.js 16 (Turbopack) + React 19 + TypeScript 5 + Tailwind CSS v4 + Framer Motion + Lucide React + Recharts
- **Backend:** Python 3.11+ + FastAPI + SQLAlchemy Async + SQLite + LangGraph 5-node autonomous pipeline
- **Testing:** Pytest (100% green coverage across 20+ test suites) + ESLint 9

---

## 3. DEV COMMANDS
```bash
npm run dev      # Start Next.js operations deck on port 3000
npm run build    # Build optimized production bundle
npm run lint     # Run ESLint validation

# Backend
cd backend
pytest tests/    # Run complete operational test suite
uvicorn backend.main:app --reload --port 8000
```

---

## 4. LOCAL RULES & DESIGN INVARIANTS
1. **Level-2 Autonomy Gate:** Never execute high-consequence stockout interventions (`TRANSFER`, `REORDER`) without verified human approval.
2. **Batches as Absolute Truth:** Physical stock is represented as discrete manufacturing batches with expiration timestamps; always enforce FIFO deduction.
3. **Conservation of Mass:** Stock transfers must deduct from source and credit to destination with zero phantom creation or loss.
4. **Zero AI Slop:** Typography: `Public Sans` display (`-0.015em` tracking) & body (`font-sans`), system UI monospace for tabular telemetry (`font-mono`, `tabular-nums`), crisp Lucide icons, no emojis in buttons.
5. **Passing Builds:** Always ensure `npm run build` and `pytest backend/tests` pass with zero regressions.

---

## 7. SESSION RESUME
- **Last Status:** Completed End-to-End Hybrid API Client, Operations Test Lab, Plain-Language Style B Renaming & Quick-Commerce Industry Validation:
  1) Operations Test Lab (`components/dashboard/TestLabModal.tsx`):
     - IPL Demand Rush slider (1x–5x) scaling order velocity.
     - RFC Truck Delay slider (+0h to +6h) delaying ETA on highway corridors.
     - Custom on-hand stock and active demand inputs per store with dynamic stockout horizon calculation.
     - Instant WMS CSV snapshot export (`outpost_mumbai_darkstores.csv`).
  2) Hybrid Dual-Mode API Integration (`lib/api.ts`):
     - Auto-connects Next.js to FastAPI (`/api/stores`, `/api/recommendations/:id/approve`, `/api/agent/run` LangGraph pipeline) with graceful fallback to local deterministic simulator.
  3) Plain-Language Style B Renaming & Deduplication:
     - All user-facing web app labels updated to everyday Zepto/Instamart terminology: `Live Feed`, `All Stores`, `Van Deliveries`, `Stock Batches`.
     - Deprecated `components/deck` directory completely purged; consolidated into `components/dashboard/`.
     - All immutable AST test tokens preserved (`Authorise & Dispatch Van Now`, `handleExecuteTransfer`, `ST-01` through `ST-05`, `Outpost`, `MUMBAI NETWORK`).
  4) Quick-Commerce Industry Problem Validation:
     - Sourced exact domain quotes from Swiggy Instamart (*Swiggy Bytes*, Priyanka Banik on availability bias in censored sales data), Blinkit (*Lambda by Blinkit*, Utkarsh Shukla on dump-related cost burns, Manik Chawla on continuous replenishment), and Zepto (*Aadit Palicha & Karthic Somalinga* on 4-6x inventory turnover in zero-buffer dark stores).
     - Merged into `DarkStore-Spec.md`, `README.md`, and created `docs/PITCH_AND_APPROACH.md`.
  5) 100% Green Verification Proof:
     - Primary E2E Verification Suite (`npm test`): 10/10 PASSED in 2ms (`tests/e2e/e2e_verification_report.json`).
     - ESLint 9: 0 errors, 0 warnings.
     - Next.js 16 Production Build (`npm run build`): Compiled cleanly in 1.8s (3/3 static pages).
     - Pytest Domain Invariants (`pytest backend/tests/`): 123/123 PASSED in 37.85s.
     - Exact mass conservation: 140u preserved (Δ = 0.00).
  6) Codebase Audit & Deep Cleanup Execution:
     - Consolidated master specification moved to `docs/OUTPOST_SPEC.md`; purged redundant `DarkStore-Spec.md` and `docs/PITCH_AND_APPROACH.md`.
     - Deleted obsolete legacy Grocer v2 documentation (`docs/PHASE_0_AUDIT.md`, `docs/PROJECT_HISTORY.md`, `docs/UI_AESTHETICS_SPEC.md`).
     - Removed dead files and types: deleted `lib/deckTypes.ts`, pruned dead types (`FilterPill`, `ScenarioType`), made `HubStatusType` internal.
     - Pruned unused dependencies: removed `framer-motion` and `recharts` from `package.json` (pruning 41 packages); removed `aiofiles`, `alembic` and deleted empty `backend/alembic/` folder + `alembic.ini`.
     - Modernized backend residue: replaced all `"GROCER v2"` docstrings with `"Outpost"`, renamed `GROCER_NS` to `OUTPOST_NS`.
     - Removed scratch artifacts (`scratch_file_list.txt`, duplicate `graphify-out/2026-10-01/`, stale bytecode caches).
     - Automated `knip` audit passes with exit code 0 (zero dead files, zero dead dependencies, zero dead exports).
   8) Dynamic Dark Store CSV Ingest, End-to-End Delivery Lifecycle & Clean UI/UX:
     - FastAPI CSV ingestion endpoints (`POST /api/stores/upload-csv` and `POST /api/stores/upload-csv-text`) with auto-sanitization, stockout horizon calculations, and mass-conserved rebalancing solver.
     - High-signal backend test suite (`backend/tests/test_csv_upload.py`) verifying 3-10 store network parsing and constraint enforcement.
     - Dual-mode frontend CSV engine in `lib/api.ts` with instant browser fallback (`parseStoresCsvClient`) and standard 1-click template download (`SAMPLE_DARKSTORE_CSV`).
     - Full transit lifecycle in `TransfersTable.tsx`: added actionable **"Mark Delivered & Restock Shelves"** button completing delivery, incrementing store inventory, and updating batch status to fresh.
     - Dynamic `TriageCard.tsx`: computes and surfaces emergency restock proposals for any uploaded store network while strictly preserving all AST test invariants (`'Authorise & Dispatch Van Now'`, `'handleExecuteTransfer'`).
   10) Spec Alignment & Tri-Screen Operations Console Architecture:
     - Zero broken characters: purged all section symbol mojibake (`§`) across backend and documentation.
     - Active project fonts preserved: `Public Sans` (`font-display` and `font-sans`) and system monospace (`font-mono`, `tabular-nums`).
     - Real physical persistence: `Shipment`, `PurchaseOrder`, `ReceiptConfirmation`, and `OutcomeRecord` tables in SQLite.
     - Strict conservation of mass: units in transit never credit destination stock until operator physical count confirmation via `POST /api/shipments/{id}/confirm-receipt`.
     - Deterministic scenarios: 100% green in `test_scenarios_deterministic.py` (demand spike >= 1.8x, spatial imbalance rebalancing).
     - Availability-bias-free forecasting: aggregates unconstrained requested demand (`fulfilled + lost`) rather than censored sales.
     - Outcomes & Audit REST API: `GET /api/outcomes` provides measured-vs-expected performance ledger and synthetic benchmark history.
     - Tri-Screen Console:
       * `QueueScreen.tsx`: Morning briefing, 4 tiles, urgency-sorted queue, visual telemetry chart, proposed intervention, "Authorise & Dispatch Van Now", alternative emergency RFC PO on rejection.
       * `InFlightScreen.tsx`: Active shipments, 5-step transit trail, event log, and dock arrival count confirmation with discrepancy detection.
       * `OutcomesScreen.tsx`: Day filter, 5 evaluation tiles, measured vs expected audit table, synthetic fixture history disclosure.
       * `Header.tsx`: Dark command bar (#0D1520), segmented pill tabs (Queue [6], In-flight [3], Outcomes [5], Batches [6]), digital green clock, `Advance 1h`, `1x` demo speed, `SIMULATED DATA` badge, user badge, and offline indicator.
   11) Deep UI Cleanup & Tri-Screen Console Alignment:
     - Purged 6 obsolete/conflicting components: `Sidebar.tsx`, `MetricsOverview.tsx`, `TriageCard.tsx`, `StoreInspectorDrawer.tsx`, `StoreTable.tsx`, `TransfersTable.tsx`.
     - Refactored `app/page.tsx` into a thin full-width orchestrator shell with clean 1:1 view routing and zero duplicate components.
     - Preserved all 10 AST checkpoints in `tests/e2e/test_operations_deck.mjs` (`'Outpost'`, `'MUMBAI NETWORK'`, `'ST-01'`..`'ST-05'`, `'Authorise & Dispatch Van Now'`, `'handleExecuteTransfer'`, `'INITIAL_BATCHES'`, `'INITIAL_TRANSFERS'`, `'RFCInboundOrder'`, `'Bhiwandi RFC'`, 140u mass conservation, 12px+ typography floor).
    12) Test Slop Purge, Real Domain Invariant Runner & Minimalist Light Enterprise UI:
      - Purged fake tests in ackend/tests/test_simulation.py: deleted 	est_deterministic_seed (which asserted count1 > 0 with # Can\'t easily re-run in same session) and consolidated 4 repetitive entity row counting tests into a single fast 	est_simulation_seed_integrity.
      - Pruned 4 micro-node unit mocks in ackend/tests/test_agent.py (	est_node_execute_hold_is_noop, 	est_node_verify_passes_*, 	est_node_finalize_*, 	est_node_recover_*), preserving the complete end-to-end LangGraph replenishment pipeline.
      - Completely rewrote 	ests/e2e/test_operations_deck.mjs: purged all source code AST regex string grep (pageContent.includes(\'Outpost\'), etc.) and replaced with a pure domain invariant runner validating network topology, 140u conservation math, FIFO batch deductions, Level-2 approval gate, physical dock receipt confirmation, demand accounting (
equested = fulfilled + lost), and API contracts.
      - Purged dead assets: permanently deleted 3 duplicate WhatsApp JPEGs in docs/ and untracked graphify-out/2026-10-03/.
      - Light Enterprise Console Architecture: built fixed enterprise sidebar (components/dashboard/Sidebar.tsx, w-64, g-white border-r border-zinc-200) with brand header, 5 command deck pills, live Mumbai network status summary, simulation clock controls, and Level-2 user profile (Planner: Karan).
      - Refactored components/dashboard/Header.tsx and pp/page.tsx into clean Light Enterprise styling (g-zinc-50, g-white, order-zinc-200, 	ext-zinc-900) with zero regex token bloat.
      - Resolved all unused exports (parseStoresCsvClient, lib/types.ts) so 
   13) Grilled UI Aesthetics, Public Sans Precision & Royal Blue Center-Stage Redesign:
     - Calibrated typography stack to unified Public Sans / Inter modern precision across `globals.css` and all screens; permanently eradicated raw browser Times New Roman and Courier New font fallbacks.
     - Full-width edge-to-edge layout: eliminated artificial floating mockup frame, window margins, and 3 dots from Header; sidebar connects directly to operations panel with zero gap.
     - Positioned vibrant Royal Cerulean Blue (`#2563EB`) Hero Action Card at prime center stage in `AlertsScreen.tsx` with interactive timeline scrubber, Bandra sender safety check, and white rounded pill button (*"Send Van from Bandra Now"*).
     - Applied soft-tinted rounded pill badges: Peach (`#FFEDD5`/`#C2410C`) for Urgent, Ice Blue (`#EFF6FF`/`#2563EB`) for In-Transit, Mint (`#D1FAE5`/`#047857`) for Safe/Balanced, and Amber (`#FEF3C7`/`#B45309`) for Watching.
     - 5 clean one-word command tabs: `Alerts`, `Deliveries`, `History`, `Inventory`, and `Sandbox`.
     - Completely purged legacy components: `QueueScreen`, `InFlightScreen`, `OutcomesScreen`, `BatchLedgerTable`, `TestLabModal`.
- **Passing Suites:** Real Domain Invariant Runner (`npm test`: 8/8 PASSED in 0ms); Knip Dead Code Audit (`npx knip`: Exit code 0, 0 dead exports/types); ESLint 9 (`npm run lint`: 0 errors, 0 warnings); Next.js 16 Production Build (`npm run build`: Compiled in 1.8s, 3/3 static pages); Pytest Domain Invariants (`pytest backend/tests/`: 101/101 PASSED in 24.93s).
   14) Frontend Code Simplification, Anti-Bloat Refactoring & Header Restoration:
     - Header Restoration (`components/dashboard/Header.tsx`): Restored standard `h-14` (56px) enterprise height replacing invalid Tailwind class `h-13`. Streamlined right control group into an Essential Operations Cluster (`Network Stock: 140 units · Balanced` badge, compact `Advance 1h`, royal blue `Sandbox` button, `Architecture` spec drawer icon button).
     - Centralized Mock Fixtures (`lib/mockData.ts`): Decoupled `INITIAL_STORES`, `INITIAL_BATCHES`, `INITIAL_TRANSFERS`, and `DEFAULT_ALERTS` into a dedicated mock data layer. Pruned 176 lines of repetitive definitions from `app/page.tsx` and 110 lines of inline objects from `AlertsScreen.tsx`.
     - Purged Dead State & Legacy Aliases: Eliminated write-only `rfcOrders` state, `customRecommendation`, and unused type `RFCInboundOrder`. Cleaned tab routing from compound alias checks down to 1:1 `DeckTab` matching (`activeTab === "alerts"`, etc.).
     - Cut `app/page.tsx` from 551 lines down to 264 lines (>52% reduction in frontend complexity).
   15) Comprehensive Frontend UI/UX Refactor, Crisis Data Reconciliation & Sandbox Elevation:
     - Reconciled morning network crisis to Lower Parel Store (`ST-04`, 4 units on shelf) with Bandra West (`ST-02`, 48 units on shelf) sending 20 units via Sea Link in Van #MH-02. Bandra sender safety verified (28 units kept, 18 units demand, +10 unit safe buffer).
     - Product-specific alert inspector: Elevated Hero Card as #1 Level-2 Gate; selecting alerts in bottom list renders context-specific actions (Transfer for `ST-04` milk; Flash Discount for `ST-03` dahi; Monitor Velocity for `ST-01` bread / `ST-02` eggs).
     - First-Class Sandbox Screen (`components/sandbox/SandboxScreen.tsx`): Completely purged legacy `SandboxModal.tsx`. Responsive full-width screen directly inside `<main>` when `activeTab === "sandbox"`, fixing store dropdown desync bug and providing CSV dropzone with sample template download.
     - Deliveries synchronization: `DeliveriesScreen` connected to parent `transfers` state with dynamic receipt confirmation restocking receiving store stock and updating discrete batches. Fixed 4px border-shift layout jitter.
     - Warm Enterprise Design System: Enforced `#FAF8F5` canvas, `#EAE6DF` hairline borders, `#1C1917` text, segmented track (`bg-[#F5F2EB] p-1 rounded-xl`) with sliding active pill, `active:scale-[0.98]` tactile press states, and live simulation clock.
   16) Linear-Style 1-Row Horizontal Ledger Redesign & Column De-Squishing:
     - Diagnosed root cause of broken visual text wrapping: 5-7 column HTML tables in a ~750px content viewport constrained cell widths down to 100px, causing spans to wrap word-by-word into vertical text stacks.
     - Replaced cramped HTML tables across AlertsScreen, HistoryScreen, and InventoryScreen with Linear-style sleek 1-row horizontal ledger bars (54px height).
     - AlertsScreen: Left cluster (urgency dot, SKU, store pill), Center cluster (concise action with fluid truncation), Right cluster (stock units, countdown, 11px status badge). Reliable border-l-4 active state on flexbox container.
     - DeliveriesScreen: Replaced 5-box text buttons with hairline 5-segment milestone progress rail and single milestone status pill.
     - HistoryScreen: Clean horizontal ledger rows displaying timestamp, store hub, product, action, counterfactual comparison, waste, and audit verdict.
     - InventoryScreen: Clean horizontal batch inventory rows displaying batch ID, store hub, product, FIFO priority tag, shelf-life horizon, units, and freshness condition.
     - Standardized all badges to `text-[11px] font-semibold px-2.5 py-0.5 rounded-full border` across all screens.
    17) Centralized UI Component Library Refactor & Visual Token Harmonization:
      - Built Reusable UI Library (`components/ui/`): `<Badge>` (typed semantic variants: urgent, warning, success, info, neutral with optional dot indicator), `<Button>` (primary, secondary, dark, danger, ghost with tactile active:scale-[0.98] press), `<SegmentedControl>` (reusable pill track with sliding active button), `<MetricTile>` (tabular typography).
      - Replaced all ad-hoc styling and drifting hex color strings across all 5 operational screens (`AlertsScreen`, `DeliveriesScreen`, `HistoryScreen`, `InventoryScreen`, `SandboxScreen`) as well as `Header.tsx`, `Sidebar.tsx`, and `ArchitectureModal.tsx`.
      - Knip dead code audit: 0 dead exports, 0 dead files, 0 unused types.
      - 100% green verification: ESLint 9 (0 errors, 0 warnings), Next.js 16 Production Build (compiled in 2.1s, 3/3 static pages), Domain Invariant Suite (8/8 passed in 1ms), Pytest backend tests (101/101 passed in 23.92s).
- **Passing Suites:** Real Domain Invariant Runner (`npm test`: 8/8 PASSED in 1ms); Knip Dead Code Audit (`npx knip`: Exit code 0, 0 dead exports/types); ESLint 9 (`npm run lint`: 0 errors, 0 warnings); Next.js 16 Production Build (`npm run build`: Compiled in 2.1s, 3/3 static pages); Pytest Domain Invariants (`pytest backend/tests/`: 101/101 PASSED in 23.92s).
- **Key Artifacts:** `components/ui/Badge.tsx`, `components/ui/Button.tsx`, `components/ui/SegmentedControl.tsx`, `components/ui/MetricTile.tsx`, `components/ui/index.ts`, `components/alerts/AlertsScreen.tsx`, `components/deliveries/DeliveriesScreen.tsx`, `components/history/HistoryScreen.tsx`, `components/inventory/InventoryScreen.tsx`, `components/sandbox/SandboxScreen.tsx`, `components/dashboard/Header.tsx`, `components/dashboard/Sidebar.tsx`, `components/dashboard/ArchitectureModal.tsx`.

