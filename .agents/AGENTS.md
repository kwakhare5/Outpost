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
- **Testing:** E2E Verification Suite (`npm test` / `npm run test:e2e` producing `tests/e2e/e2e_verification_report.json`) + Pytest Domain Invariants (99 tests across 11 files) + ESLint 9

---

## 3. CODING LOOP & TESTING INVARIANTS (DEV COMMANDS)

### Architectural Knowledge Graph
- **Graphify First & Auto-Install:** If `graphify-out/graph.json` or `GRAPH_REPORT.md` is missing, automatically run `npx graphify .` to generate the knowledge graph. Always inspect `GRAPH_REPORT.md` / `graphify-out/graph.json` before broad codebase exploration.

### Testing Invariants & Philosophy
1. **Never write unit tests after you write code.**
2. **Highly prefer E2E tests as the sole testing mechanism. Use them to verify complex features work. At the end of E2E tests, produce a verifiable and repeatable artifact.**
3. **If you must test a system in isolation, first write down all the ways it could fail, then write the code.**

### Verification & Dev Commands
```bash
# Frontend & E2E Verification (Primary)
npm test         # Primary verification: run E2E suite -> produces tests/e2e/e2e_verification_report.json
npm run test:e2e # Equivalent high-signal E2E suite
npm run dev      # Start Next.js operations deck on port 3000
npm run build    # Build optimized production bundle
npm run lint     # Run ESLint validation

# Backend Domain Invariant Verification
cd backend
pytest tests/    # Run 99 high-signal domain invariant tests across 11 files
uvicorn backend.main:app --reload --port 8000
```

---

## 4. LOCAL RULES & DESIGN INVARIANTS
1. **Level-2 Autonomy Gate:** Never execute high-consequence stockout interventions (`TRANSFER`, `REORDER`) without verified human approval.
2. **Batches as Absolute Truth:** Physical stock is represented as discrete manufacturing batches with expiration timestamps; always enforce FIFO deduction.
3. **Conservation of Mass:** Stock transfers must deduct from source and credit to destination with zero phantom creation or loss.
4. **Zero AI Slop:** Direction 1 Swiss Logistics typography (`TWK Lausanne Pan 800` display, `Geist Sans` body, `Geist Mono` tabular telemetry, and strictly upright `PP Editorial New` accents), crisp Lucide icons, no emojis in buttons.
5. **Passing Builds & Artifacts:** Always ensure `npm run build`, `npm test` (producing `tests/e2e/e2e_verification_report.json`), and `pytest backend/tests/` (99 domain invariant tests) pass with zero regressions.
6. **No Post-Hoc Unit Tests:** Never write unit tests after you write code.
7. **E2E-First Verification:** Highly prefer E2E tests as the sole testing mechanism. Use them to verify complex features work. At the end of E2E tests, produce a verifiable and repeatable artifact.
8. **Failure-First Isolation:** If you must test a system in isolation, first write down all the ways it could fail, then write the code.

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
   9) Single-Modal Test Lab Consolidation & Surgical UI Layer Cleanup:
     - Unified all scenario shocks (IPL demand spike 1x–5x, RFC truck delay +0h–+6h, store overrides) and CSV ingest/export into `components/dashboard/TestLabModal.tsx`.
     - Purged redundant wrapper components `components/dashboard/CsvImportModal.tsx` and `components/dashboard/QuickStartBanner.tsx`.
     - Streamlined `components/dashboard/Header.tsx` and `app/page.tsx`, removing duplicate buttons and obsolete `isCsvImportOpen` state.
     - Calmed visual indicators in `components/dashboard/TriageCard.tsx` (solid status badge, zero pinging slop).
- **Passing Suites:** 10/10 E2E tests (`npm test`); Next.js 16 production build (`npm run build`); ESLint 9 (0 errors/warnings); Pytest (105/105 domain invariants passed in 32.10s).
- **Key Artifacts:** `components/dashboard/TestLabModal.tsx`, `backend/tests/test_csv_upload.py`, `docs/OUTPOST_SPEC.md`, `tests/e2e/e2e_verification_report.json`.



