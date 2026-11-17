# AGENTS.md - Outpost

Global rules: read C:\Users\kwakh\.agents\AGENTS.md first. This file adds project-specific rules. It can make global limits stricter, never looser. Do not repeat global rules here.

## 1. What this is
- One-line promise: Outpost warns which store shelf will go empty next, shows the cheapest safe fix, and proves the result on real data, including the days it lost.
- The hard idea: An empty shelf hides demand. Outpost builds a corrected demand estimate and uses it inside the warning. It did not beat the simple same-weekday guess on accuracy, so the app shows a simple "about how much it usually sells" line, and the failed claim is stated on the Method page. Never call any estimate true demand.
- What is out of scope: Expiry/waste discounting, customer apps, driver maps, multi-agent systems, document search, fine-tuning, per-upload training, queue/workers, separate services, mobile control room, v1/v2 split.

## 2. Stack and commands
- Stack: Next.js 16 (App Router + API), TypeScript, PostgreSQL (12 tables), offline Python study (for training & exporting static JSON artifacts). No Python in production.
- Install: `npm install` && `pip install -r study/requirements.txt`
- Dev server: `npm run dev`
- Test: `npm test` && `python -m pytest study -q`
- Build: `npm run build`
- Lint / typecheck: `npm run lint` && `npm run verify:parity`
- Database / seed: `npm run db:migrate` && `npm run seed:demo`
- Study gate: `python study/gate.py`
- Environment variable names: `DATABASE_URL`, `COOKIE_SECRET`, `PROVIDER_API_KEY`. No secrets or values.

## 3. Project rules
- Data contract:
  - Required: store, product, date, quantity, empty shelf (yes/no/unknown). Minimum 28 days per store/product.
  - Optional: hourly sales, stock, price, delivery time, travel time, holidays, promotions, weather.
  - Caps: 25 MB per file, 100 MB uncompressed ZIP, 2M sales rows, 10k shelves. Uploads expire after 7 days; cascade delete in one transaction. Failed load leaves zero rows.
- Data modes (detected from data, never visitor-chosen):
  - `full`: Range >= 28 days; empty flag has >= 7 known days, one yes, one no. Supports learned warning, simple usual-sales estimate, assistant, 3 real scores, replay.
  - `rule`: Stock and delivery time exist. Days-of-cover warning labelled `rule`; fixes with assumptions; demand accuracy only; no replay.
  - `watch`: Sales only. Uncorrected demand estimate and accuracy only; no warning; no fixes; no proof.
  - `no_mode`: History < 28 days. Simple average, "not enough history", no claims.
- Invariants and gotchas:
  - Zero sales is not the same as an empty shelf; empty flag decides. Null empty flag is `unknown`, not `no`.
  - Model never sees store, product, city, or category identity. Future rows never change past features.
  - Correction is an estimate, not truth. Must change top-20 set on >= 5% of days or reported as not material.
  - Rule mode is a rule (do not dress as learned). Watch mode has no empty-shelf warning. No mode has no claims.
  - Demo is shared; uploads are isolated per visitor via signed HttpOnly cookie (clearing cookie loses upload).
  - Decision approval is one transaction: lock sender, recompute surplus, verify fix, insert once, subtract once, save simulated outcome. Repeated approvals return same record; moves never create stock.
  - Replay is simulated; both arms use the same fixed rule. Losses are part of proof, not an appendix.
  - Test cities drawn once with recorded seed; demo day chosen after study, not tuned.
  - `CLAIMS.md` and code constant must agree. Every screen label must match mode and claim status.
  - App never fetches runtime external data. Only computed facts leave the app. No raw rows to provider.
  - No passwords, no accounts, no login.
- Strict types: Strict TypeScript, no `any` or loose casts. Python and TypeScript feature parity is a build gate.
- Never commit secrets, passwords or API keys. Keep them in an untracked `.env` or environment variables.
- (Only with a database) Never modify or delete migrations that have already run.
- Security and privacy rules: Signed HttpOnly visitor cookies. Writes check origin, visitor, and rate limit. No raw rows to LLM.

## 4. UI rules (only for projects with a UI)
- Design source of truth: Follow `DESIGN.md` tokens. Minimal architecture.
- Handle loading, empty and error states for every async call.
- Copy rules: Everyday words, no jargon or acronyms. Say "chance this shelf runs out" (not probability), "what we sold vs about how much it usually sells" (not latent demand), "compared with doing nothing" (not counterfactual), "slowest 1 in 20 answers" (not p95 latency). Every money number is labelled simulated.

## 5. Surfaces and verification
- Screen map:
  - `/` landing: promise, proof strip, how it works, real vs assumed, the miss, bring data. CTA: `Open the demo`.
  - `/app` control room: Today (shelf list, selected shelf, sold-vs-usual chart, empty marks, 3 reasons, 3 fixes, ask box, approve/reject) + Proof (3 real scores, replay when allowed, model card, losses, assistant check, data credit) + mode banner.
  - Bring data: upload, mapping, validation report, mode, active claims.
  - `/method`: contract, baselines, 15/3 split, study gate, assistant check, limits, data credit.
- Verification skill path: `.agents/skills/verify-outpost/features/` for affected features.
- Done check: `npm test` + `npm run verify:parity` + feature verification run passes with pasted terminal proof.

## 6. Project-specific stops
- The phase checklist (Plan -> Scout -> Build -> Review -> Fix -> Verify -> Close) lives in TASKS.md, not here.
- Study gate (hard stop before app code): Train on 15 of 18 cities, test on 3 held-out cities. Learned warning must beat simple rule by >= 10% relative catch rate with false alarms <= 10% worse. Correction must beat same-weekday-last-week by >= 10% miss and change top-20 set on >= 5% of days.
- Hard stops: Never claim real store saved money (simulated label required). Never alter `CLAIMS.md` status without evidence. Never run Python in production. Never send raw rows to an external model.

## 7. Folder map
- `src/app/`: Next.js pages and API routes (`/`, `/app`, `/method`, `/api`).
- `src/components/`: UI components (Control room, Today, Proof, Bring data).
- `src/lib/`: Parity feature engine, decision transactions, mode detection, assistant tools.
- `study/`: Offline Python study (training, evaluation, gate check, artifact exports).
- `migrations/`: SQL migration files for the 12 Postgres tables.
- `.agents/skills/verify-outpost/`: Verification skill and feature journeys.

## 8. Open decisions
- The model provider (behind single interface; provider remains open).
- The deploy host.
- Exact upload caps after real upload tests.
- UCI Online Retail II license check (fallback is M5 or Rossmann).
- Risk band thresholds set from alert budget.

## 9. Do not touch
- `.env`.
- Locked one-line promise.
- The study split after scoring and test cities after drawing.
- Demo reference day after chosen.
- A `CLAIMS.md` status without evidence.
- `docs/adr/` history (append-only).
- Shared demo data and other visitors' upload records.

## 10. Doc map
- `PRD.md`: What we build and why.
- `ARCHITECTURE.md`: How the system is shaped.
- `STUDY.md`: Offline study, split, metrics, model card.
- `CLAIMS.md`: Claim register with statuses (proven, rule, watch, simulated, failed).
- `GLOSSARY.md`: Shared domain terminology and business rules.
- `DESIGN.md`: Visual system, tokens, and screen states.
- `TASKS.md`: Ordered implementation plan.
- `JOURNAL.md`: Work log and verified runs.
- `README.md`: Public project overview.
- `docs/adr/`: Architecture decision records (append-only).
