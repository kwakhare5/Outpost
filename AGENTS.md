# AGENTS.md — Outpost

This file is the project working contract. The master rules live at `C:\Users\kwakh\.agents\AGENTS.md`. This file adds Outpost-specific rules and repeats the non-negotiables so the project stands alone. If the two conflict, the master wins.

## 0. Phase checklist

Every phase runs this loop. The phase approval is the only per-phase approval.

1. **Plan:** 3 lines — files, exact command, done line.
2. **Scout:** a read-only subagent reads the files and returns citations and risks. Required when the phase touches more than 3 files or needs an audit.
3. **Build:** the main agent is the default editor. One editor per file. A builder subagent is allowed only under the exception below.
4. **Review:** a read-only reviewer checks the change against the task and the spec. The writer is never the only reviewer.
5. **Fix:** the writer fixes the findings.
6. **Verify:** a read-only verifier drives the feature through the verification skill.
7. **Close:** paste the exact output, update `TASKS.md` and `JOURNAL.md`, then move on.

**Stop for:** push, deploy, deletion, database structure changes, new dependencies, money, provider or host choice, scope changes, or a failed claim.

**Builder subagents:** allowed only when the model is strong enough for the task, the files are disjoint, and the work is in a separate copy. The main agent reviews and runs the tests before merging. If the work is not equal to the main agent's, the main agent takes over.

## 1. What this is

Outpost is a decision-support app for a grocery store planner. It warns which store shelf will go empty next, shows the safest fix, and proves the result on real data, including the days it lost.

**One-line promise:** Outpost warns which store shelf will go empty next, shows the cheapest safe fix, and proves the result on real data, including the days it lost.

One project, one version. No v1/v2 split. Work on `main`. The old demo is deleted.

## 2. The hard idea

An empty shelf hides demand. A model trained on sales alone learns to under-order exactly where shelves go empty.

Outpost estimates what people wanted, not only what they sold. It shows both lines. The correction must change the warning and the fix, or it is reported as not material.

The corrected number is an estimate. Never call it true demand.

## 3. Working contract

- Answer first, in simple everyday English, fewest words needed. Default 2–3 short sentences. Use more only when the task truly needs it.
- For a non-trivial task, state the understanding and plan in 2–3 sentences. No edits until the owner says `yes`, `proceed`, or `go ahead`.
- Least code. Standard library first. No new dependency without approval.
- Never cut validation, error handling, security, or a requested feature.
- Find every caller before fixing a bug; fix the root cause once.
- Secrets live in environment variables. Never print them.
- Parameterized SQL only.
- Windows PowerShell only. No bash syntax, no `&&`. Quote paths with spaces.
- Report `Verified` with pasted output, `Not checked`, and every skipped test by name and reason.
- Never hide a failure with `any`, an unknown cast, or an empty `catch`.
- Never weaken or delete a test to make a run pass.
- Same fix fails twice: stop and ask.
- Delegate read-only research that spans more than three files to a research subagent. Reviewers never edit. One editor per file.
- After meaningful changes, add a 4-line `JOURNAL.md` card: Problem, Change, Proof, Still broken.
- Ask about `/build-in-public` once per meaningful work session.
- No timeline, no week map, no later bucket. Ordered tasks only.

## 4. Locked decisions (do not reopen)

1. One project, one version, one `main` branch.
2. Open demo. No passwords, no accounts, no login.
3. Four surfaces: landing, control room (Today + Proof), Bring data, Method.
4. Three data modes plus No mode. The data decides.
5. Fixed model artifact. No per-upload training. No identity features. No Python in production.
6. Study gate before the app. Exact bars in Section 5.
7. Three real scores plus one simulated replay. Losses always shown.
8. Claim register. No claim without a status.
9. UCI Online Retail II for Demand watch and the data contract only. No headline claim.
10. One Next.js app plus one Postgres. No queue, no worker, no separate service.
11. Offline Python study. The app only applies the artifact.
12. Six read-only assistant tools. Provider is still open. No provider committed.
13. Only computed facts leave the app. No raw rows to the model.
14. Per-visitor uploads behind a signed cookie. The demo is shared and reset-able.
15. No paid API budget. Free tiers only.

## 5. Study gate (hard stop)

Fixed before scoring.

- Train on 15 of 18 cities. Test on 3 cities never seen, chosen randomly with a recorded seed. Use each city's last 30 days.
- The learned warning must beat the simple rule by at least **10% relative catch rate**.
- False alarms may be at most **10% relative worse** than the simple rule.
- The correction must beat the same-weekday-last-week guess by at least **10% relative average miss** on non-empty days.
- The correction must change the top-20 warning set on at least **5% of scored days**. Below that, report it as not material.
- No store, product, city, or category identity features.
- Only data up to the decision day is visible.

**Fallback**

- Warning loses: ship the simple rule. Keep the learned loss in `CLAIMS.md`. Mark the claim failed.
- Correction not material: keep the simple demand method and say so.
- Both real claims fail: stop before the app and reframe with the owner.

**No app code before the gate.**

## 6. Three data modes

The mode is detected from the data. The visitor cannot choose it. Every screen shows the mode and the claims it supports.

| Mode | Detected when | Allowed claims |
|---|---|---|
| `full` | Dataset range ≥ 28 days; empty flag has ≥ 7 known days, one `yes`, and one `no` | Corrected demand, learned warning, assistant, three real scores, replay only with stock, travel, price |
| `rule` | Not `full`; stock and delivery time exist | Days-of-cover warning labelled `rule`; fixes with assumptions; demand accuracy only; no catch-rate proof; no replay |
| `watch` | Sales only | Uncorrected demand estimate and accuracy only; no warning; no fixes; no proof |
| `no_mode` | History < 28 days | Simple average and `not enough history`; no claims |

The demo is `full` mode. An upload gets the best mode its data supports, never a better one. A shelf with fewer than 28 days gets `not enough history` and no warning, even in Full mode.

## 7. Data contract

**Required:** store, product, date, quantity, empty shelf (yes/no/unknown).

**Optional:** hourly sales, current stock, price, delivery time, travel time, holidays, promotions, weather.

**Minimum:** 28 days per store and product. A shelf below that gets no warning, even in Full mode.

**Rules**

- The dataset declaration states the unit scale, the day boundary, and the currency.
- The validation report runs before any prediction. It lists what is present, missing, the mode, and the active claims.
- One active dataset per visitor. Never mix datasets.
- Uploads are per visitor. The shared demo is never overwritten.
- Caps: 25 MB per file, 100 MB uncompressed ZIP, 2M sales rows, 10k shelves.
- Uploads expire after 7 days. "Remove my data" cascades in one transaction.
- A failed load leaves zero rows. Never a partial dataset.

## 8. Claim register

`CLAIMS.md` is the source of truth.

**Statuses:** `pending`, `proven`, `failed`, `rule`, `watch`, `simulated`.

- Screens may show only `proven`, `rule`, `watch`, or `simulated` claims, with the label.
- `pending` and `failed` claims are never shown as active.
- The app mirrors the register in one code constant. A test checks every visible claim has a valid status.
- A failed claim is stated as failed, not hidden and not reworded into a win.

## 9. Proof protocol

**Three real scores**

1. Demand accuracy against the same-weekday-last-week guess, with and without correction, on non-empty days.
2. Warning catch rate and false alarms at the top-20 alert budget, against the fixed simple rule.
3. Assistant: 40 questions, 20 facts, 10 refusals, 10 paraphrases. Bars: 18/20, 10/10, 9/10. Speed is the slowest 1 in 20. Cost per answer is shown.

**One simulated score**

4. Replay: Outpost against doing nothing on the same held-out days. Both arms get every valid proposal approved by the same fixed rule. No manual tweaks.

**Rules**

- Primary proof is precomputed by the offline study and seeded.
- An upload is scored on its own last 30 days, or 20% with a 7-day minimum, using the fixed artifact.
- The replay runs only in `full` mode when stock, travel time, and price exist.
- Losses are stored and shown: real missed shelves and replay days where Outpost did worse, each with a one-line reason.
- Every money number is labelled simulated. Never say a real store saved money.
- The demo day is a representative day, not the proof. The proof is the three-city score.

## 10. Architecture in one page

- One Next.js app. Pages and API in one unit.
- One Postgres. Twelve tables: datasets, sales, ops, routes, data_quality, warnings, fixes, decisions, outcomes, assistant_runs, proof_runs, model_versions.
- One offline Python study. Trains once, tests once, exports `model.json`, `feature_spec.json`, `proof.json`, `split.json`, and a parity fixture.
- The app never trains. It computes identity-free features in TypeScript and applies the artifact.
- Python and TypeScript feature parity is a build gate.
- One signed HttpOnly visitor cookie. No login.
- Writes check origin, visitor, and rate limit.
- Approval is one transaction: lock the sender, recompute surplus, verify the fix, insert once, subtract once, save the simulated outcome. Repeats return the same record. Stock is never created.
- Proof checks that run long are client-polled small steps. No queue or worker.
- The app never fetches external data at runtime.
- Only computed facts leave the app.

## 11. Assistant

Six read-only tools: shelf history, demand estimate, warning reasons, safe surplus, delivery and travel, saved decisions and outcomes.

- Provider sits behind one interface. Provider is open. Do not commit one.
- An offline provider answers the 40-question check from the same tools.
- Every number in an answer must match a tool result within tolerance.
- Bad answers are rejected and retried once. A second failure becomes a refusal.
- No free-form action. No writes. No raw rows.
- Reduced modes must refuse questions their data cannot support.
- Speed and cost are stored per answer.

## 12. Screens and copy

- `/` landing: promise, proof strip, how it works, real vs assumed, the miss, bring data. One call to action: `Open the demo`.
- `/app` control room: Today and Proof, plus the mode banner.
- Today: shelf list, selected shelf, sold-vs-wanted chart, empty marks, three reasons, three fixes, ask box, approve/reject. Rule mode shows cover and delivery. Watch mode shows demand only.
- Proof: three real scores, simulated replay when allowed, model card, losses, assistant check, data credit.
- Bring data: upload, mapping, validation report, mode, active claims.
- `/method`: contract, baselines, 15/3 split, study gate, assistant check, limits, data credit.

Copy rules: everyday words, no jargon, no acronyms. Say "chance this shelf runs out," not "probability." Say "what people wanted vs what we sold," not "latent demand." Say "compared with doing nothing," not "counterfactual." Say "slowest 1 in 20 answers," not "p95 latency."

## 13. Build order

1. Docs.
2. Offline study and gate.
3. Freeze artifacts.
4. Skeleton: app, Postgres, schema, demo seed.
5. Core demo: features, parity, demand, warnings, fixes, Today, shelf detail.
6. Decision transaction and simulated outcome.
7. Proof page and claim guard.
8. Upload, validation, mode detection, sessions, Bring data.
9. Rule and Watch engines, No mode, mode copy.
10. Upload proof.
11. Assistant tools, offline provider, 40-question check.
12. Provider plug.
13. Replay and losses.
14. Landing, Method, design.
15. Verification skill, deploy, final audit.

No step skips the one before it.

## 14. Commands

PowerShell only. These commands exist after the matching task; do not pretend they run before the scaffold.

```powershell
npm run dev
npm run build
npm test
npm run db:migrate
npm run seed:demo
npm run verify:parity
python -m pytest study -q
python study/gate.py
```

If a command does not exist yet, say `not checked` instead of inventing a run.

## 15. Verification

- Use `.agents/skills/verify-outpost/features/` for the affected feature.
- No mocking of project code, the database, an API, or an MCP tool.
- Bugs, money, safety, permissions, data: failing test first, then fix, then show both runs.
- Normal feature: build, then drive the changed feature, then show the run.
- Shared code, dependency, or build change: widen the checks.
- Do not run the full suite for an unrelated edit.
- Never imply unchecked behaviour passes.

## 16. Journal

After meaningful changes, add a 4-line card to `JOURNAL.md`:

- **Problem / tension**
- **Change / decision**
- **Proof**
- **Still broken / unproven**

Keep exact numbers and their context. No rounded-up claims. No production claim from a local run.

## 17. Hard no-list

Never build or claim:

- Expiry, waste, or near-expiry discounting.
- The Mumbai fiction, named products, doorstep drama, or the old fixed demo day.
- The Smart Plan optimizer.
- The 50-question quiz.
- Customer app, driver map, customer rationing, supplier features beyond a simulated reorder.
- Real company systems, SAP, payments, multi-user accounts.
- A mobile control room.
- Multi-agent systems, document search, fine-tuning.
- Per-upload training, identity features, Python in production.
- A queue, worker, or separate service.
- A v1/v2 split.
- A promise that Outpost beats the baseline.
- A real-money savings claim.
- A simulated result without the `simulated` label.
- A claim without a status.
- A mode chosen by the visitor.
- Raw rows sent to the model.
- A new dependency without approval.
- Secrets in files, logs, or replies.
- Real phone numbers or addresses in files, logs, or proofs.
- Bot attribution or `Co-authored-by` in commits. Commits show only Karan.
- Backdated commits or a filled heatmap.
- Paid API usage.

## 18. Invariants and gotchas

- Zero sales is not the same as an empty shelf. The empty flag decides.
- A null empty flag is `unknown`, not `no`.
- The model never sees store, product, city, or category identity.
- A future row must never change a past feature.
- The correction is an estimate, not truth.
- The correction must change the top-20 set on at least 5% of days or it is not material.
- Rule mode is a rule. Do not dress it as learned.
- Watch mode has no empty-shelf warning. Do not show one.
- No mode has no claims. Do not show a warning or a score.
- The demo is shared. A visitor's upload never touches it.
- A signed cookie is not a login. Clearing it loses the upload.
- A repeated approval returns the same record. It never moves stock twice.
- A move never creates stock. The sender keeps enough for its own demand.
- The replay is simulated. Both arms use the same rule.
- Losses are part of the proof, not an appendix.
- The test cities are drawn once with a recorded seed. Do not redraw after seeing results.
- The demo day is chosen after the study, not tuned to look good.
- `CLAIMS.md` and the code constant must agree.
- Every screen label must match the mode and the claim status.
- The app never fetches data at runtime.
- No raw rows to the provider.
- No passwords, no accounts, no login.

## 19. Open decisions

- The model provider.
- The deploy host.
- The exact caps after the first real upload test.
- The three test cities, drawn with a recorded seed before scoring.
- The demo's reference day, chosen after the study.
- The UCI Online Retail II license check; fallback is M5 or Rossmann.
- The risk band thresholds, set from the alert budget.
- The final feature list, decided by the study.

Do not invent answers to these. Ask when the decision is needed.

## 20. Working lessons

- When explaining, answer first, in 2–3 plain sentences. No walls of jargon.
- When a doc and the code disagree, fix both. Never present two sides.
- When a claim has no status, do not show it.
- When a task is non-trivial, state the plan in 2–3 sentences and wait.
- When a change touches shared data, find every caller and fix the root once.
- When a run fails twice, stop and ask.

## 21. Doc map

| File | Purpose |
|---|---|
| `PRD.md` | What we build and why |
| `ARCHITECTURE.md` | How the system is shaped |
| `STUDY.md` | The offline study, split, metrics, model card |
| `CLAIMS.md` | One row per claim and its status |
| `GLOSSARY.md` | Shared words and business rules |
| `DESIGN.md` | Visual system and screen states |
| `TASKS.md` | The ordered implementation plan |
| `JOURNAL.md` | What changed and what was proven |
| `README.md` | The public front door |
| `docs/adr/` | Accepted decisions, append-only |

## 22. Do not touch without explicit approval

- `.env`.
- The locked one-line promise.
- The study split after scoring.
- The test cities after they are drawn.
- The demo day after it is chosen.
- A `CLAIMS.md` status without evidence.
- The `docs/adr/` history. Append only.
- The shared demo data.
- Another visitor's upload.
