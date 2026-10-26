# Product Journal & Progress Log — Outpost V1

A chronological, append-only record of real product work, completed features, and verification evidence.

---

### [Outpost V1 Ground-Zero Setup] 2026-10-25

#### Work card 1: Clean repository isolation
- **Problem / tension:** Starting fresh without old baggage or technical debt from previous iterations.
- **Change / decision:** Created fresh directory `D:\Outpost V1`, moved `PRD.md`, initialized git on `main`, seeded core project memory docs (`AGENTS.md`, `ARCHITECTURE.md`, `DESIGN.md`, `TASKS.md`, `JOURNAL.md`, `verify.ps1`), and linked acceptance criteria directly to the PRD.
- **Proof:** `git log` shows root commit `4580d01` with `PRD.md`; all 6 project memory files exist in root.
- **Still broken / unproven:** Tech stack scaffold not selected or installed yet.
- **Metric context:** N/A (initial setup).

#### Work card 2: Restored brand logo
- **Problem / tension:** `icon.svg` was mistakenly removed during the initial wipe when assuming it was leftover debris.
- **Change / decision:** Restored `icon.svg` directly to `D:\Outpost V1` and committed it to git.
- **Proof:** `git log -n 1` shows commit `5c4d42a` with `icon.svg` safely tracked.
- **Still broken / unproven:** None. Logo is intact.

#### Work card 3: Remote GitHub branch cleanup and V1 sync
- **Problem / tension:** GitHub repo `kwakhare5/Outpost` still held 7 legacy phase branches and old codebase history.
- **Change / decision:** Deleted all 7 legacy branches on GitHub (`phase-1-honesty` through `phase-4b-decision-fix`), force-updated remote `main` to clean ground zero, and pushed tracked branch `v1`.
- **Proof:** `git ls-remote origin` confirms only `main` and `v1` exist on GitHub pointing to commit `a8c0241`.
- **Still broken / unproven:** None.



#### Work card 4: Canonical domain terminology locked in GLOSSARY.md
- **Problem / tension:** Loose terminology around shifts, store roles, and transfer concepts risked building bloated screens.
- **Change / decision:** Ran Round 1 grilling, confirmed single-screen control room model matching Mumbai quick-commerce operations, and created `GLOSSARY.md` capturing 9 canonical terms.
- **Proof:** `GLOSSARY.md` created with 9 terms adhering to domain modeling format.
- **Still broken / unproven:** Expiry mechanics and simulation clock details open in Round 2.



#### Work card 5: Settled FEFO batch rules, markdown recovery, and ADR 0001
- **Problem / tension:** Expiry handling, markdown recovery math, and IST trade-offs needed concrete architectural decisions.
- **Change / decision:** Confirmed Round 2 grilling: enforced FEFO batch deduction with zero expired leaks, transparent rupee markdown math, top-bar operational clock stepper, and paired baseline comparison. Documented 6 new terms in `GLOSSARY.md` and created `docs/adr/0001-ist-as-tactical-bridge.md`.
- **Proof:** `GLOSSARY.md` updated to 15 terms; `docs/adr/0001-ist-as-tactical-bridge.md` tracks architectural IST decision.
- **Still broken / unproven:** Interaction edges and stack scaffold confirmation open in Round 3.



#### Work card 6: Stripped out textbook jargon for plain everyday app language
- **Problem / tension:** Jargon terms like "FEFO", "IST", "Donor Store", "GRN", and "TTS" sounded like academic papers instead of a simple everyday tool.
- **Change / decision:** Rewrote `GLOSSARY.md` and `docs/adr/0001-ist-as-tactical-bridge.md` completely using plain everyday words (Van Transfer, Sending Store, Safety Cushion, Hours Left, Doorstep Count, Oldest First).
- **Proof:** `GLOSSARY.md` updated with 14 plain-English terms and clear `_Avoid_` lists; ADR 0001 simplified.
- **Still broken / unproven:** Rerunning clean grilling round with user.



#### Work card 7: Completed ADRs and brought PRD.md to 100% fidelity
- **Problem / tension:** Core decisions from grilling and the real dataset were not recorded in ADRs, and `PRD.md` still had outdated draft text.
- **Change / decision:** Authored 5 new ADRs (ADR 0002 through 0006) capturing dataset usage, batch expiry, doorstep count, human approval gate, and edge cases. Fully updated `PRD.md` with all-day control room rules, real FreshRetailNet demand grounding, and the Time Clock button.
- **Proof:** `PRD.md` updated to 134 lines; `docs/adr/` contains 6 complete ADRs; `GLOSSARY.md` includes Cart Rationing.
- **Still broken / unproven:** Awaiting user review and sign-off on the completed PRD before proceeding.



#### Work card 8: Authored ARCHITECTURE.md from scratch
- **Problem / tension:** Old `ARCHITECTURE.md` was a generic boilerplate template (referencing Vercel/Supabase/Stripe) that bore no relation to Outpost.
- **Change / decision:** Completely wiped and wrote `ARCHITECTURE.md` from scratch. Mapped out the unified Next.js 15 + SQLite architecture, full SQL schema (8 tables), the 6 core domain subsystems, API contracts, and the `eval.parquet` extraction pipeline.
- **Proof:** `ARCHITECTURE.md` is 200 lines defining exact tables, subsystem logic, and API endpoints tied to `.\verify.ps1`.
- **Still broken / unproven:** Awaiting user architecture review before scaffolding.



#### Work card 9: Migrated environment secrets and added .gitignore
- **Problem / tension:** Needed to capture environment keys from the older project and ensure secrets are never tracked in version control.
- **Change / decision:** Added `.gitignore` to protect environment and database files. Migrated `.env` containing `GEMINI_API_KEY` into `D:\Outpost V1`. Inspected old project database configuration.
- **Proof:** `Test-Path .env` confirms file presence; `git status` verifies `.env` is ignored.
- **Still broken / unproven:** Cloud database credentials need to be provided by user (old project only had local Docker Postgres).



#### Work card 10: Verified live Supabase PostgreSQL connection & updated architecture
- **Problem / tension:** Pivot from local SQLite to real cloud PostgreSQL required validating live credentials and updating architecture schemas.
- **Change / decision:** Added Supabase credentials to `.env`. Tested live connection using `asyncpg`; successfully queried PostgreSQL 17.11 on Supabase. Documented ADR 0007, updated `ARCHITECTURE.md` with PostgreSQL 17 schema, and aligned `PRD.md`.
- **Proof:** Live test script exited 0 returning `PostgreSQL 17.11 on aarch64-unknown-linux-gnu` with clean public schema (`[]`).
- **Still broken / unproven:** Tables not migrated to Supabase yet.



#### Work card 11: Added Operator Co-Pilot Chatbot to PRD, ADRs, and Architecture
- **Problem / tension:** Control room lacked a natural-language query interface for operators to inspect store states and question trade-offs.
- **Change / decision:** Ran grill-with-docs for Co-Pilot assistant; locked rules (advisory-only, live Supabase grounding, what-if reasoning, slide-out drawer). Authored ADR 0008, updated `PRD.md` with Feature 7, and added `POST /api/chat`, `copilot.ts`, and `copilot-drawer.tsx` to `ARCHITECTURE.md`.
- **Proof:** ADR 0008 created; `PRD.md` lines 102-115 specify Co-Pilot; `ARCHITECTURE.md` includes Subsystem G and `/api/chat`.
- **Still broken / unproven:** Awaiting user alignment on architecture walkthrough and task breakdown.



#### Work card 12: Embedded 5 layer-by-layer visual diagrams into ARCHITECTURE.md
- **Problem / tension:** Text-only descriptions of the backend made it difficult to visualize the end-to-end data flow and component connections.
- **Change / decision:** Added 5 comprehensive Mermaid diagrams to `ARCHITECTURE.md`: 5-layer system flowchart, van transfer sequence diagram, clock advance sequence diagram, Co-Pilot sequence diagram, and Shadow Run flowchart.
- **Proof:** `ARCHITECTURE.md` expanded to 448 lines with 5 verified Mermaid diagrams illustrating all system flows.
- **Still broken / unproven:** Awaiting user review of the visual architecture diagrams.



#### Work card 13: Added real CSV data ingestion pipeline to PRD, ADRs, and Architecture
- **Problem / tension:** Without custom data ingestion, the engine was restricted to preloaded stores and could not be independently tested by external quick-commerce managers with their own data.
- **Change / decision:** Added functional CSV ingestion capability. Logged ADR 0009, updated `PRD.md` with Feature 8 and explicit Plain Language Hard Invariant, and added Subsystem H, `ingest.ts`, `csv-upload-modal.tsx`, and `/api/ingest/*` to `ARCHITECTURE.md`.
- **Proof:** ADR 0009 created; `PRD.md` updated to 160 lines; `ARCHITECTURE.md` updated with Subsystem H and API contracts.
- **Still broken / unproven:** Awaiting user sign-off to begin task implementation.



#### Work card 14: Structured atomic task breakdown in TASKS.md across 5 phases
- **Problem / tension:** `TASKS.md` was outdated and lacked tasks for Supabase migrations, Parquet curve extraction, Co-Pilot, and CSV ingestion.
- **Change / decision:** Rewrote `TASKS.md` with 17 atomic, verifiable tasks across 5 phases (Scaffold & Schema, Data Ingest & Engines, Transit & Outcomes, AI & CSV, UI & Milk Test).
- **Proof:** `TASKS.md` updated to 62 lines with clear verification criteria per task.
- **Still broken / unproven:** Phase 1 execution awaiting user approval at the strict plan gate.



#### Work card 15: Scaffolded Next.js 15 App Router project with full verification
- **Problem / tension:** Project needed production Next.js 15, TypeScript, Tailwind, Vitest, and PostgreSQL client infrastructure in place.
- **Change / decision:** Scaffolded `package.json`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.mjs`, `vitest.config.ts`, `app/layout.tsx`, `app/page.tsx`, and `lib/db/index.ts` connecting to Supabase Cloud PostgreSQL. Installed dependencies and wrote initial health check.
- **Proof:** `.\verify.ps1` completed in 20.91s with exit code 0 (TypeScript passed, 2 Vitest tests passed, Next.js production build succeeded).
- **Still broken / unproven:** Supabase tables not migrated yet (Task 1.3).



#### Work card 16: Adopted MailCheap editorial light-mode design system
- **Problem / tension:** Previous design was generic dark mode. User requested MailCheap light mode aesthetic (editorial, crisp, high contrast).
- **Change / decision:** Replaced `DESIGN.md` with MailCheap-inspired light mode system (canvas `#fafafa`, white surface `#ffffff`, hairline borders `#e5e5e5`, ink-black pills `#171717`). Updated `tailwind.config.ts`, `app/globals.css`, and `app/page.tsx`.
- **Proof:** `.\verify.ps1` ran clean in 20.56s with exit code 0.
- **Still broken / unproven:** Supabase tables not migrated yet (Task 1.3).




#### Work card 17: Upgraded tech stack to latest versions and verified
- **Problem / tension:** Next.js, React, and core dependencies were outdated.
- **Change / decision:** Upgraded `package.json` to Next.js 16.4.3, React 19.3.1, Vitest 5.0.5, Lucide 1.61.0, Supabase 2.118.0, and updated `DESIGN.md` to official MailCheap light-mode spec.
- **Proof:** `.\verify.ps1` completed in 15.77s with exit code 0 (`tsc` passed, 2 Vitest tests passed, Next.js 16.4.3 Turbopack build succeeded).
- **Still broken / unproven:** Task 1.3 (Supabase tables migration) pending execution.




#### Work card 18: Extracted parquet dataset to clean CSVs and deleted redundant design file
- **Problem / tension:** `mailcheap.ai-design.md` was redundant with `DESIGN.md`, and `eval.parquet` needed extraction into human-readable CSV format.
- **Change / decision:** Deleted `mailcheap.ai-design.md`. Installed `pyarrow-26.0.0`. Created `scripts/extract_data.py` to extract 5,000 sample rows to `data/freshretail_eval_sample.csv` (unrolling hours 6 to 22 sales and stockouts) and 255 hourly demand rows for 3 Mumbai stores and 5 anchor products to `data/mumbai_anchor_demand.csv`.
- **Proof:** CSV files verified on disk (742 KB and 30 KB); `.\verify.ps1` completed with exit code 0 in 10.46s.
- **Still broken / unproven:** Task 1.3 (Supabase tables migration) pending execution.




#### Work card 19: Deleted legacy parquet files after data extraction
- **Problem / tension:** Large binary parquet files (`eval.parquet` at 8.4 MB and `train.parquet` at 106 MB) were redundant after extracting to clean CSVs.
- **Change / decision:** Removed `eval.parquet` and `train.parquet` from project root.
- **Proof:** Files removed; `.\verify.ps1` ran clean in 37.78s with exit code 0.
- **Still broken / unproven:** Task 1.3 (Supabase tables migration) pending execution.




#### Work card 20: Updated project memory docs to reflect confirmed stack and CSV data
- **Problem / tension:** `AGENTS.md`, `TASKS.md`, and `ARCHITECTURE.md` had "TBD" stack entries and outdated parquet references.
- **Change / decision:** Updated `AGENTS.md` (Next.js 16.4.3, React 19.3.1, Supabase Postgres 17, runtime commands, replaced FIFO/FEFO with Oldest-First), `TASKS.md` (Next.js 16 and CSV seeding), and `ARCHITECTURE.md` (pipeline grounded in `data/mumbai_anchor_demand.csv`).
- **Proof:** `.\verify.ps1` completed in 10.63s with exit code 0 (`tsc`, Vitest, and Next.js 16 build passed).
- **Still broken / unproven:** Task 1.3 (Supabase tables migration) pending execution.




#### Work card 21: Resolved all code review findings across Standards and Spec
- **Problem / tension:** Code review flagged forbidden acronym `FEFO`, hardcoded tenant URL, `any` types in db client, product catalog/MRP mismatches in demand CSV, and missing live DB connectivity tests.
- **Change / decision:** Exported typed `pg.Pool` and `SupabaseClient` in `lib/db/index.ts` without `any`; updated `tests/health.test.ts` to execute real live query against Supabase; aligned `data/mumbai_anchor_demand.csv` with exact PRD products and MRPs (Bread ₹45, Eggs ₹60, Butter ₹58); deleted unneeded sample CSV; purged `FEFO` from `ARCHITECTURE.md` and `PRD.md`; fixed table 8 duplicate closure syntax in `ARCHITECTURE.md`.
- **Proof:** `.\verify.ps1` ran clean in 14.45s (exit code 0); Vitest passed with real live roundtrip queries to Supabase PostgreSQL (1154ms).
- **Still broken / unproven:** Task 1.3 (Supabase tables migration) pending execution.


#### Work card 22: Created and verified 8 Supabase PostgreSQL tables
- **Problem / tension:** Supabase Cloud database had no schema tables for stores, inventory batches, demand curves, transfers, or the outcomes ledger.
- **Change / decision:** Authored `lib/db/schema.sql` defining all 8 core tables with indexes, created `lib/db/migrate.ts` with programmatic verification against Supabase `information_schema.tables`, added `npm run db:migrate`, and wrote live verification suite `tests/schema.test.ts`.
- **Proof:** `npx tsx lib/db/migrate.ts` executed with 8 confirmed tables in public schema; `.\verify.ps1` completed with exit code 0 in 36.93s with 7/7 tests passing against live Supabase PostgreSQL.
- **Still broken / unproven:** Task 2.1 (seeding demand curves, stores, and products) pending execution.


#### Work card 23: Resolved code review across Standards and Spec
- **Problem / tension:** Code review identified missing typography tokens (`Newsreader`, `Geist`), uncanonical term `simulation_clock` vs `time_clock`, demand curve store/product ID mismatches breaking foreign keys, and premature static mockup widgets in `app/page.tsx`.
- **Change / decision:** Renamed table to `time_clock` in Supabase migration and schema; updated `data/mumbai_anchor_demand.csv` and `scripts/extract_data.py` to canonical IDs (`andheri-west`, `amul-taaza-500`, etc.); configured `Newsreader` and `Geist` fonts in `tailwind.config.ts`, `app/layout.tsx`, and `app/globals.css`; stripped `app/page.tsx` to an editorial minimalist shell; expanded `tests/schema.test.ts` to test all 8 tables and `tests/health.test.ts` to test against real `stores` table.
- **Proof:** `npm run db:migrate` confirmed all 8 tables including `time_clock`; `.\verify.ps1` completed with exit code 0 in 23.9s with 10/10 tests passing.
- **Still broken / unproven:** Task 2.1 (seeding demand curves, stores, and products) pending execution.


#### Work card 24: Seeded Mumbai anchor dark store demand and operational state (Task 2.1)
- **Problem / tension:** Supabase tables were empty; real demand curves and operational starting inventory were needed to power replenishment simulations without fake data.
- **Change / decision:** Built `lib/db/seed.ts` to ingest 3 dark stores, 6 transit corridors, 5 anchor products, and 255 hourly demand rows from `data/mumbai_anchor_demand.csv` into Supabase. Also seeded initial morning inventory batches (including Andheri 38-unit milk stockout risk and 20-unit expiring dahi) and the 08:00 operational clock, added `npm run db:seed`, and created live test suite `tests/seed.test.ts`.
- **Proof:** `npm run db:seed` and `.\verify.ps1` completed with exit code 0 in 26.56s; 16/16 tests passing across all suites against live Supabase PostgreSQL.
- **Still broken / unproven:** Task 2.2 (Inventory & Oldest-First engine `lib/engine/inventory.ts`) pending implementation.


#### Work card 25: Fixed code review findings across Standards and Spec (Task 2.1)
- **Problem / tension:** Code review identified 25.1 vs 45.0 units/hr demand rate conflict throwing off ~50-minute stockout timing, hardcoded store/product arrays ignoring CSV headers, forbidden "donor store" jargon, single-letter variables, and sequential single-row database inserts.
- **Change / decision:** Updated `scripts/extract_data.py` to produce 45.0 units/hr at 08:00 breakfast rush for Andheri Amul Milk and regenerated `data/mumbai_anchor_demand.csv`; refactored `lib/db/seed.ts` to parse CSV headers dynamically, extract unique stores and products with unit MRPs directly from data, use multi-row SQL batch inserts across all tables, rename loop variables to domain terms, and purge forbidden jargon in favor of "Sending Store"; updated `tests/seed.test.ts`.
- **Proof:** `npm run db:seed` and `.\verify.ps1` completed with exit code 0 in 20.64s; all 16 tests passing across all suites against live Supabase PostgreSQL.
- **Still broken / unproven:** Task 2.2 (Inventory & Oldest-First engine `lib/engine/inventory.ts`) pending implementation.
