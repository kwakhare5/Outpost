# CLAIMS.md — Claim Register

This is the source of truth for every claim Outpost makes. A claim without a status is not shown.

**Statuses:** `pending`, `proven`, `failed`, `rule`, `watch`, `simulated`.

- `pending` means not scored yet. Never show it as active.
- `proven` means it passed its bar on held-out data with stored evidence.
- `failed` means it missed its bar. State it as failed. Never hide it.
- `rule` means a deterministic rule, not a learned model.
- `watch` means a demand-only claim, with no empty-shelf warning.
- `simulated` means it comes from a labelled simulation, never real money.

**Screen rule:** show only `proven`, `rule`, `watch`, or `simulated` claims, with the label visible. The app mirrors this table in one code constant. A unit test checks every visible claim has a valid status.

**Evidence rule:** update a status only after the evidence file exists. Never type a score from memory.

---

## Performance claims

| ID | Claim | Data needed | Metric | Bar | Status | Evidence | Screen |
|---|---|---|---|---|---|---|---|
| C1 | Corrected demand beats the lazy guess | Full-mode history, non-empty days | Average absolute miss | ≥ 10% relative better than same weekday last week | `failed` | `study/artifacts/gate.json`: 0.430184 vs lazy 0.439178 (+2.05%) | Proof, shelf detail, Method |
| C2 | Learned warning catches more empty shelves than the simple rule | Full-mode history, 3 unseen cities | Catch rate at top 20 | ≥ 10% relative better | `failed` | `study/artifacts/gate.json`: 0.6793% vs rule 0.6870%; bar 0.7557% | Proof, Method |
| C3 | Learned warning does not add too many false alarms | Full-mode history, 3 unseen cities | False-alarm rate at top 20 | ≤ 10% relative worse than the rule | `proven` | `study/artifacts/gate.json`: 24.48% vs rule 23.62%; bar 25.98% | Proof, Method |
| C4 | The correction changes the warning enough to matter | Full-mode history, scored days | Share of days the top-20 set changes | ≥ 5% of scored days | `proven` | `study/artifacts/gate.json`: 29 of 29 days (100%) | Proof, Method |
| C5 | The assistant answers fact questions correctly | Demo records | Correct answers | ≥ 18 of 20 | `pending` | Assistant check run | Proof |
| C6 | The assistant refuses what it cannot prove | Demo records | Correct refusals | 10 of 10 | `pending` | Assistant check run | Proof |
| C7 | The assistant handles unseen wordings | Demo records | Correct answers | ≥ 9 of 10 | `pending` | Assistant check run | Proof |
| C8 | Assistant speed and cost are reported | Assistant runs | Slowest 1 in 20; cost per answer | Stored and shown | `pending` | Assistant check run | Proof |
| C9 | The replay shows Outpost against doing nothing | Full mode + stock, travel, price | Simulated lost sales and empty hours | Stored, with losses | `simulated` | `study/artifacts/proof.json` | Proof |

---

## Mode and rule claims

| ID | Claim | Data needed | What it means | Status | Evidence | Screen |
|---|---|---|---|---|---|---|
| C10 | Rule mode uses a days-of-cover rule | Sales + stock + delivery time, no usable empty labels | The warning is a fixed rule, labelled `rule`; no catch-rate claim; no replay | `rule` | `ARCHITECTURE.md` §8; rule-engine tests | Today, shelf detail, Proof, Method |
| C11 | Demand watch has no empty-shelf warning | Sales only | The app shows a demand estimate and accuracy only; no warning, no fixes | `watch` | Mode-detection tests | Today, Bring data, Method |
| C12 | No mode has no claims | Under 28 days | The app shows a simple average and `not enough history`; no warning, no proof, no fix | `rule` | Mode-detection tests | Today, Bring data |
| C13 | The mode is detected, not chosen | Any dataset | The server picks the best supported mode; the visitor cannot request a higher one | `rule` | Mode-detection tests | Bring data, every screen's mode banner |
| C14 | The demo is Full mode | Primary dataset | Full mode is the demo's mode; shipped methods follow the claim statuses in this register | `rule` | `proof.json`; demo seed | Landing, Today, Proof |
| C15 | The demo day is representative, not the proof | Primary dataset | One clear win and one clear miss, chosen after the study | `pending` | Demo selection record | Landing, Today, Method |
| C16 | The primary proof is precomputed | Primary dataset | The app reads the saved proof; it never recomputes it in production | `pending` | `proof.json`; seed test | Proof |
| C17 | An upload proof is out-of-sample | An upload | The fixed artifact scores the last 30 days, or 20% with a 7-day minimum | `pending` | Upload-proof test | Proof |
| C18 | The second dataset proves the front door only | UCI Online Retail II | It loads in `watch` mode; no headline claim | `pending` | Contract test | Method, Bring data |
| C19 | Losses are always shown | Primary proof and replay | Real missed shelves and replay losses each have a one-line reason | `pending` | Proof-page test | Proof, Method |
| C20 | The assistant refuses unsupported claims in reduced modes | Rule, watch, no mode | Questions about warnings, fixes, or catch rates are refused | `pending` | Assistant check per mode | Shelf detail, Proof |

---

## Invariants shown to the user

These are fixed rules, not performance claims. They are marked `rule` and must stay true in every build.

| ID | Invariant | Status | Evidence |
|---|---|---|---|
| C21 | No raw rows leave the app; only computed facts go to the model | `rule` | Assistant boundary test |
| C22 | No store, product, city, or category identity enters the model | `rule` | Feature-spec test |
| C23 | The model artifact is fixed; no per-upload training | `rule` | ADR 0001; upload test |
| C24 | No stock is created; a move keeps the sender's own demand safe | `rule` | Approval transaction test |
| C25 | A repeated approval does not move stock twice | `rule` | Idempotency test |
| C26 | Every money number is labelled real, assumed, or simulated | `rule` | Copy test |
| C27 | The demo is open, shared, and reset-able; no password | `rule` | Demo test |
| C28 | An upload never changes another visitor's data or the demo | `rule` | Isolation test |

---

## Failed claims

A failed claim is written here with its evidence, then shown on Proof as failed. It is never deleted.

| ID | Claim | Status | Evidence | What we say |
|---|---|---|---|---|
| C1 | Corrected demand beats the lazy guess | `failed` | `gate.json`: average miss 0.430184 vs lazy 0.439178 (+2.05%); bar +10% | "The correction beat last week's same weekday by 2.0%, not 10%. This claim failed." |
| C2 | Learned warning catches more empty shelves than the simple rule | `failed` | `gate.json`: catch 0.6793% vs rule 0.6870%; bar 0.7557% | "The learned warning caught slightly fewer empty shelves than the simple rule at 20 alerts a day. The simple rule is the fallback." |

---

## Status update log

| Date | Claim | From | To | Evidence |
|---|---|---|---|---|
| 2026-11-17 | All | — | Initial register | Docs created; performance claims are pending the study |
| 2026-11-17 | C1, C2 | `pending` | `failed` | `study/artifacts/gate.json`; study gate run, decision `stop_and_reframe_with_owner` |
| 2026-11-17 | C3, C4 | `pending` | `proven` | `study/artifacts/gate.json`; false alarms within bar; materiality 29 of 29 days |
