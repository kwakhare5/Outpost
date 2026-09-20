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
4. **Zero AI Slop:** Direction 1 Swiss Logistics typography (`TWK Lausanne Pan 800` display, `Geist Sans` body, `Geist Mono` tabular telemetry, and strictly upright `PP Editorial New` accents), crisp Lucide icons, no emojis in buttons.
5. **Passing Builds:** Always ensure `npm run build` and `pytest backend/tests` pass with zero regressions.

---

## 7. SESSION RESUME
- **Last Status:** Fix A (Scenarios), Fix B (Replenishment Realism), Fix C (Fake Scoreboard Purged), Fix D (Forecasting Honesty & WAPE), and Sales Accounting are 100% complete and verified.
- **Passing Suites:** 23 pytest test suites passing with 275+ tests; Next.js 16 production build (`npm run build`) passing; ESLint passing.
- **Key Artifacts:** `DESIGN_DECISIONS.md` created; `README.md` rewritten as a credible quick-commerce case study.
