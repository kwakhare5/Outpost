# AGENTS.md — Outpost V1
# NOTE FOR AI: Treat this file as AGENTS.md + RULES.md combined.
# It defines both the project facts AND the hard invariant rules for this codebase.
# Global master working rules live at C:\Users\kwakh\.agents\AGENTS.md.

## 1. What this is
Autonomous inventory replenishment control engine for high-velocity dark stores across Mumbai (Andheri West, Bandra, Powai).

## 2. Stack
- Frontend: TBD (align with user before scaffold)
- Backend: TBD (align with user before scaffold)
- Hosting: Local dev / self-hosted

## 3. Project Commands & Self-Verification
- Install: TBD upon scaffold
- Dev server: TBD
- Test (all): TBD
- Verification runner: `.\verify.ps1`
- Done check = `.\verify.ps1` exits 0 with pasted raw terminal output.

## 4. Hard Rules & Invariants (What the AI must ALWAYS do)
- Always run `.\verify.ps1` before declaring any task complete.
- Level-2 Autonomy Gate: Never execute high-consequence interventions (`TRANSFER`, `REORDER`) without verified human approval.
- Conservation of Mass: Stock transfers must deduct from source and credit to destination with zero phantom creation or loss. Zero units credited during transit.
- Batches as Absolute Truth: Enforce FIFO/FEFO deduction with expiration timestamps; zero expired stock leaked into fulfillment.
- Doorstep Count Confirmation: Credited stock matches counted arrival; discrepancies logged to waste.
- Arrival confirmation must be idempotent (no double-crediting).

## 5. What the AI must NEVER do
- Never commit hardcoded secrets, passwords, or API keys (use `.env`).
- Never mock project code, databases, or APIs.
- Never delete or weaken a test just to get green.

## 6. Design Source of Truth
- Design tokens & vibe: Follow `DESIGN.md` and `PRD.md`.

## 7. Folder Map
- `PRD.md`: Single source of truth for features and flows.
- `ARCHITECTURE.md`: System design and data models.
- `DESIGN.md`: Visual tokens, UI components, and layouts.
- `TASKS.md`: Active atomic task checklist.
- `JOURNAL.md`: Factual progress and proof log.

## 8. Gotchas & Known Traps
- No teleportation: In-transit stock cannot be sold or credited to the destination before receiver count confirmation.
- Donor validation: Inter-store transfer must not cause a secondary stockout at the donor store.

## 9. Do Not Touch
- `PRD.md` acceptance criteria without explicit user instruction.

Global master rules: read C:\Users\kwakh\.agents\AGENTS.md
