# AGENTS.md — Outpost V1

> **MANDATORY INSTRUCTION:** Read and obey the global master rules at C:\Users\kwakh\.agents\AGENTS.md. Treat this file as project-specific facts and invariants that override or extend global rules.

# NOTE FOR AI: Treat this file as AGENTS.md + RULES.md combined.
# It defines both the project facts AND the hard invariant rules for this codebase.
# Global master working rules live at C:\Users\kwakh\.agents\AGENTS.md.

## 1. What this is
Autonomous inventory replenishment control engine for high-velocity dark stores across Mumbai (Andheri West, Bandra, Powai).

## 2. Stack
- Frontend: Next.js 16.4.3 (Turbopack, App Router, React 19.3.1)
- Backend: Next.js Route Handlers + Supabase PostgreSQL 17.11 (direct `pg` pool + Supabase client)
- AI / LLM: Gemini 2.5 Flash via `@google/genai` (2.31.0)
- Styling: Tailwind CSS (MailCheap light-mode theme) + Lucide React (1.61.0)
- Testing: Vitest 5.0.5
- Hosting: Local dev / self-hosted

## 3. Project Commands & Self-Verification
- Install: `npm install`
- Dev server: `npm run dev` (starts on http://localhost:3000)
- Test (all): `npm test`
- Verification runner: `.\verify.ps1`
- Done check = `.\verify.ps1` exits 0 with pasted raw terminal output.

## 4. Hard Rules & Invariants (What the AI must ALWAYS do)
- Always run `.\verify.ps1` before declaring any task complete.
- Level-2 Autonomy Gate: Never execute high-consequence interventions (`TRANSFER`, `REORDER`) without verified human approval.
- Conservation of Mass: Stock transfers must deduct from source and credit to destination with zero phantom creation or loss. Zero units credited during transit.
- Batches as Absolute Truth: Enforce Oldest-First deduction with expiration timestamps; zero expired stock leaked into fulfillment.
- Doorstep Count Confirmation: Credited stock matches counted arrival; discrepancies logged to waste.
- Arrival confirmation must be idempotent (no double-crediting).
- Plain Language Standard: Never use forbidden acronyms (FEFO, FIFO, IST, GRN, TTS); use plain terms from `GLOSSARY.md`.

## 5. What the AI must NEVER do
- Never commit hardcoded secrets, passwords, or API keys (use `.env`).
- Never mock project code, databases, or APIs.
- Never delete or weaken a test just to get green.

## 6. Design Source of Truth
- Design tokens & vibe: Follow `DESIGN.md` (official MailCheap light-mode system) and `PRD.md`.

## 7. Folder Map
- `PRD.md`: Single source of truth for features and flows.
- `ARCHITECTURE.md`: System design, database models, and API routes.
- `DESIGN.md`: Visual tokens, typography, and light-mode components.
- `TASKS.md`: Active atomic task checklist.
- `JOURNAL.md`: Factual progress and proof log.
- `GLOSSARY.md`: Everyday language dictionary and banned jargon list.
- `data/`: Extracted hourly demand and dark store dataset CSVs.

## 8. Gotchas & Known Traps
- No teleportation: In-transit stock cannot be sold or credited to the destination before receiver count confirmation.
- Donor validation: Inter-store transfer must not cause a secondary stockout at the donor store (enforce safety cushion).

## 9. Do Not Touch
- `PRD.md` acceptance criteria without explicit user instruction.

Global master rules: read C:\Users\kwakh\.agents\AGENTS.md
