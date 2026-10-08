# AGENTS.md - Outpost

## What this is
Autonomous inventory replenishment control engine for high-velocity dark stores.

## Stack
- Frontend: Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4
- Backend: Python 3.11 + FastAPI + SQLAlchemy + LangGraph
- Hosting: Local dev server (Next.js :3000, FastAPI :8000)

## Commands (how to run/build/test)
- Install: `npm install` and `pip install -r backend/requirements.txt`
- Dev server: `npm run dev` (port 3000) & `uvicorn backend.main:app --reload --port 8000` (port 8000)
- Test: `npm test` and `pytest backend/tests`
- E2E: `node tests/e2e/test_operations_deck.mjs`
- Lint: `npm run lint`
- Done check = Test + Lint both exit 0.

## Issue tracker
GitHub Issues (`kwakhare5/Outpost`) via `gh` CLI. See `docs/agents/issue-tracker.md`.

## Design source of truth
Mockups: `design/` (`design/screen-1-main.png`, `screen-2-inflight.png`, `screen-3-outcomes.png`).
Specification: `docs/OUTPOST_SPEC.md`. Fonts and colors come from design tokens, not from a skill.

## Gotchas (project decisions)
- Level-2 Autonomy Gate: Never execute high-consequence interventions (`TRANSFER`, `REORDER`) without verified human approval.
- Batches as Absolute Truth: Enforce FIFO/FEFO deduction with expiration timestamps; zero expired stock leaked into fulfillment.
- Conservation of Mass: Stock transfers must deduct from source and credit to destination with zero phantom creation or loss.
- Hybrid Client: `lib/api.ts` connects to FastAPI (`localhost:8000`) with graceful deterministic local fallback when backend is offline.
- Do not touch: `tests/e2e/e2e_verification_report.json`, `design/*.png`, `docs/OUTPOST_SPEC.md`.

Global rules: read C:\Users\kwakh\.agents\AGENTS.md
