# Dark Store Operator - Internship Case Study Specification

**Repository:** <https://github.com/kwakhare5/Dark-store-operator>  
**Primary goal:** Turn this repository into a credible quick-commerce engineering case study that earns internship replies and interviews.

---

## 1. OBJECTIVE

This repository has one purpose: get internship replies and interviews from quick-commerce companies such as Zepto, Blinkit, Swiggy Instamart, BigBasket, Flipkart Minutes, Swish, and FirstClub.

Success is measured by:

- Replies from relevant engineers, engineering leaders, founders, and recruiters.
- Internship interviews.

Success is **not** measured by the number of features shipped. This is not a SaaS product and should not be presented as one.

---

## 2. POSITIONING

Present the repository as a **case study**, not a product pitch.

Use this story consistently in the README, demo, video, and outreach:

> Quick-commerce dark stores lose money to stockouts and expired stock. I built a deterministic decision engine that watches a dark store, predicts demand, and proposes orders and transfers, with a human approving every action before it runs. The environment is simulated, stated upfront. I also explain what I would do differently with real operational data.

The headline is the human-in-the-loop design. The strongest technical point is not “AI.” It is an auditable decision process with a real approval gate, including:

- Double-checked approvals.
- Idempotency.
- Stale-state checks.
- Post-action verification.
- Recovery paths.

Honesty is an asset. State the simulated setup before making performance claims. Do not imply that the repository has been tested in a real dark store.

---

## 3. SCOPE

### IN

The implementation scope contains exactly these nine items:

1. Deploy the project publicly and provide a working live link.
2. Complete Fix A: make every scenario affect the simulation.
3. Complete Fix B: implement realistic purchase orders and transfers.
4. Complete Fix C: delete the fake impact scoreboard.
5. Complete Fix D: use honest forecasting names and expose real error metrics.
6. Remove all Grocer project leftovers.
7. Rewrite the README.
8. Record a 60-90 second demo video using the IPL-night script.
9. Write a design-decisions document.

### OUT

Do not do any of the following:

- Add new features of any kind.
- Add ML models.
- Add paid tools, paid APIs, API products, or SaaS dependencies.
- Add Swiggy Instamart catalog work. That belongs to the Grocer project.
- Polish the dashboard beyond the UI changes required for Fix A and Fix B.
- Build multi-store scale-out or a warehouse-network simulation.

If a proposed task does not directly complete one of the nine in-scope items, do not do it.

---

## 4. THE FOUR MUST-FIX ITEMS

### A. Wire `ScenarioConfig` into the simulation

**Current problem**

The `demand-spike` and `supplier-delay` multipliers are defined but never consumed. Only `network_imbalance` and `expiry_wave` mutate simulation state. The scenario controls therefore imply behavior that does not happen.

**Required changes**

- Consume the demand-spike multiplier inside the order generator.
- Consume the supplier-delay multiplier when purchase-order ETAs are calculated.
- Keep `network_imbalance` and `expiry_wave` behavior working.
- Ensure scenario buttons on the dashboard trigger the matching configuration and visible downstream outcomes.
- Make runs deterministic under a fixed seed so scenario tests are stable.

**Acceptance tests**

Add one test per scenario:

1. `demand_spike`: with the same seed and starting state, enabling the scenario changes generated demand by the configured multiplier and changes at least one downstream outcome.
2. `supplier_delay`: with the same purchase order and starting state, enabling the scenario changes the calculated ETA by the configured multiplier.
3. `network_imbalance`: enabling the scenario produces the expected inventory imbalance and changes the resulting recommendation or transfer behavior.
4. `expiry_wave`: enabling the scenario changes expiry state and produces the expected expiry-related response.

Tests must prove changed outcomes, not merely prove that a configuration value exists.

**Estimate:** 0.5-1 day.

### B. Make replenishment operationally realistic

**Current problem**

Reorders can appear instantly, and transfers can bypass the existing in-transit transfer path. That makes the simulator operationally misleading.

**Required changes**

- Rename the supplier everywhere to **Regional Fulfilment Centre**.
- Model reorders as purchase orders.
- A purchase order must have a creation time, expected-arrival time, status, quantities, and actual arrival event.
- Inventory must not increase when a purchase order is approved or created.
- Inventory increases only when the purchase order arrives after its lead time.
- Route transfers through the existing `dispatch_transfer` service.
- Every transfer must enter an in-transit state with an ETA.
- Destination inventory increases only after the transfer arrives.
- The approval gate must remain between recommendation and execution.
- Keep idempotency, stale-state checking, verification, and recovery behavior intact.

**Acceptance tests**

- Approving a reorder creates a purchase order but does not immediately change on-hand inventory.
- The purchase order remains pending or in transit before its ETA.
- The purchase order arrival changes inventory exactly once at or after its ETA.
- Reprocessing the same approval or arrival event does not duplicate inventory.
- An approved transfer calls `dispatch_transfer`, records an ETA, and does not immediately change destination inventory.
- The transfer arrival changes destination inventory exactly once.
- A stale recommendation is rejected or re-evaluated before dispatch.
- User-visible and code-facing labels say **Regional Fulfilment Centre**, with no old supplier label remaining.

**Estimate:** 0.5-1 day.

### C. Delete the hard-coded impact scoreboard

**Current problem**

`lib/metricsEngine.ts` hard-codes baselines. Every completed recommendation subtracts one stockout regardless of what happened. Those numbers are not evidence.

**Locked decision**

Delete the hard-coded impact scoreboard and all claims based on it. Do not replace it with another invented metric.

**Acceptance tests**

- `lib/metricsEngine.ts` no longer contains hard-coded impact baselines or the “one completed recommendation equals one avoided stockout” rule.
- The dashboard and README contain no derived claim that depends on those values.
- Existing screens do not fail because the removed metrics are missing.
- Repository search finds no leftover fake-impact copy or dead imports.

**Stretch only, if core work is complete**

Build a deterministic, same-seed, seven-day A/B benchmark:

- Baseline: a simple reorder-point policy.
- Treatment: the decision engine.
- Use identical starting state, scenario, random seed, and demand stream.
- Measure fulfilled units, lost units, and expired units.
- Report raw results and the benchmark method. Do not generalize beyond the simulated run.

This benchmark is optional. Deleting the scoreboard is mandatory.

### D. Use honest forecasting names and metrics

**Required changes**

- Call the forecasting method **Holt linear**.
- Do not call it ML.
- Surface rolling MAE and WAPE.
- Keep and surface the existing backtest that compares Holt linear with a 14-day moving average.
- The backtest uses a three-day holdout, and the model with lower MAE wins.
- Explain the comparison in plain language in the UI or README.

**Acceptance tests**

- UI, README, code comments, and demo narration use **Holt linear** consistently.
- No copy describes the forecast as machine learning.
- Rolling MAE and WAPE are calculated from actual forecast errors and displayed with their evaluation window.
- A test confirms the three-day holdout is excluded from training.
- A test confirms the lower-MAE candidate is selected.
- A deterministic fixture produces known MAE and WAPE values.

**Estimate:** 0.25 day.

### Smaller locked items

#### Discount actions

Label discount recommendations:

> Proposed action. POS integration is not implemented.

Do not imply that a discount reaches a real point-of-sale system. If all core work is finished and about half a day remains, a simple, documented elasticity model may be added as a stretch item. It must still remain a simulated proposed action.

#### Agent framing

Describe the LangGraph agent as an **auditable state machine with human approval**. Lead with the approval gate, not the framework name. Explain the double-check, idempotency, stale-state checks, verification, and recovery flow.

#### Demand generation and sales accounting

- Drive demand from a `category × hour block × weekday` rate table.
- Track requested, fulfilled, and lost sales separately.
- Never treat requested demand as completed sales.
- Add tests for partial fulfilment and stockout cases so the three values reconcile.

#### Runtime state

Keep module-level runtime state. Defend it in the design document as a **single-process deterministic simulator**. Do not add multi-worker support. State clearly that module-level state would need to move to durable transactional storage before multi-instance production use.

---

## 5. REAL DATA

Use the **Favorita Grocery Sales** dataset from Kaggle as the real-data input to demand generation.

Dataset characteristics to state accurately:

- Free Kaggle dataset.
- Real daily grocery sales from an Ecuadorian grocery chain.
- More than four years of history.
- Includes promotion and holiday information.

**Implementation direction**

- Create a reproducible preprocessing step that converts Favorita's daily sales into inputs usable by the simulator.
- Map source product families into the simulator's categories.
- Use the dataset to calibrate daily/category demand magnitude.
- Preserve the simulator's explicit hour-block and weekday logic where the daily dataset cannot identify intraday behavior.
- Document every transformation and assumption.
- Do not claim that Ecuadorian grocery data represents Indian quick-commerce behavior.
- Keep generated runs deterministic under a fixed seed.

**README paragraph requirement**

Explain that Favorita provides a real grocery-demand backbone, while dark-store topology, intraday allocation, inventory, lead times, and scenarios remain simulated. Explain that real deployment would require store-level Indian quick-commerce sales, stock, expiry, substitution, promotion, and fulfilment data.

**Fallback**

If Favorita integration risks the five-day deadline, retain the current demand generator, state that it is simulated, and document Favorita integration as the first next step. Fixes A and B take priority.

**Locked choice**

Use Favorita rather than Instacart Market Basket or Store Item Demand.

---

## 6. DEMO

Both demo forms are required.

### Interactive demo

- Deploy the dashboard publicly.
- Scenario buttons must work after Fix A.
- A recruiter must be able to select the IPL-night demand scenario and watch demand, forecasts, recommendations, approval state, and later inventory effects change.
- Purchase orders and transfers must visibly respect their ETAs.
- No scenario control may be decorative.

### Scripted video demo

Record a 60-90 second video using an IPL-night or Diwali demand-spike story.

Suggested sequence:

1. **0-10 seconds:** State the problem. An IPL-night spike can empty a dark store while excess stock elsewhere expires.
2. **10-25 seconds:** Trigger the demand-spike scenario and show the changed demand and forecast.
3. **25-45 seconds:** Show the engine proposing a purchase order or transfer. Point out that it proposes rather than silently acts.
4. **45-60 seconds:** Approve the action. Show the purchase order or transfer entering an in-transit state with an ETA.
5. **60-75 seconds:** Advance the simulation and show arrival, fulfilment, lost sales, and stock state.
6. **75-90 seconds:** Close with the honest boundary: Favorita-informed or simulated demand, deterministic state machine, human approval, and what real operational data would change.

Do not claim “stockouts avoided” unless the demo shows a measured comparison. Prefer: “the approved replenishment arrives before the projected stockout in this simulated run.”

---

## 7. DELIVERABLES

### A. Public deployment

- Deploy the project to a stable public URL.
- Put the live URL at the top of the README.
- Verify the URL in an incognito browser.
- Verify all scenario controls and approval actions on the deployed build.

### B. README rewrite

Use this exact section order:

1. Live demo link.
2. A 30-second “what it does” explanation.
3. Demo video.
4. The problem, using sourced real cost numbers.
5. Architecture diagram.
6. Design-decisions summary.
7. Honest limits.

Additional README rules:

- State the simulated setup before any performance claim.
- Use citations for real cost numbers.
- Do not use fake impact numbers.
- Use **Holt linear**, not ML.
- Explain Favorita and the transformations applied.
- Make the human approval gate visible within the first screenful.

### C. Demo video

- 60-90 seconds.
- Follow the scripted flow in Section 6.
- Show the deployed app, not only a local build.
- Add the video link near the top of the README.

### D. Design-decisions document

Create a concise document covering:

- Why the engine is deterministic.
- Why every action requires human approval.
- Why an auditable state machine was used.
- Why the environment is simulated.
- How Favorita is used and where it does not fit.
- What would change with real dark-store data.
- Why module-level runtime state is acceptable for a single-process deterministic simulator.
- Why it is not safe for multi-instance production deployment.
- Known limits, including POS integration not implemented, no multi-store scale-out, and no causal proof of business impact.

### E. Remove Grocer leftovers

- Delete Swiggy Instamart catalog references and other Grocer project copy, assets, routes, imports, environment variables, and dead code.
- Search the full repository for `Grocer`, `Instamart catalog`, and related project-specific names.
- Run tests and production build after cleanup.

---

## 8. TIME PLAN

### Five-day plan

| Day | Work | Required outcome |
|---|---|---|
| Day 1 | Fix A and Fix D | Every scenario changes outcomes; honest forecast names and real MAE/WAPE are visible and tested. |
| Day 2 | Fix B, scoreboard deletion, Grocer cleanup | POs and transfers use ETAs; fake metrics and leftovers are gone. |
| Day 3 | Deploy and rewrite README | Public link works; README tells the case-study story clearly. |
| Day 4 | Record video and write design document | 60-90 second demo and design decisions are linked. |
| Day 5 | Buffer and testing | Production build works; 185+ tests pass; optional stretch work only after core completion. |

Day 5 stretch order:

1. Same-seed seven-day A/B benchmark.
2. Simple discount elasticity.

### Three-day fallback

- Day 1: Fix A and Fix D.
- Day 2: Fix B, scoreboard deletion, Grocer cleanup, tests.
- Day 3: Deploy, README, and delivery assets.
- Cut the video to a 45-second screen recording.
- Fold the shorter design-decisions content into README sections.

Never cut Fix A or Fix B.

---

## 9. DONE CRITERIA

### Recruiter test

Within 30 seconds, a recruiter can find:

- A working live link.
- A demo video.
- One clear sentence explaining the project.
- A visible statement that the system is a simulated case study with human approval.

### Engineer test

A code review finds:

- Working scenario multipliers that change outcomes.
- Purchase orders with lead times and arrival events.
- Transfers using `dispatch_transfer` and in-transit ETAs.
- No instant inventory teleportation.
- No hard-coded impact scoreboard.
- Honest **Holt linear** naming.
- Real rolling MAE and WAPE.
- Requested, fulfilled, and lost sales tracked separately.
- Deterministic behavior under a fixed seed.
- At least 185 tests passing and no failing tests.
- A successful production build.

### Honesty test

- The simulated setup is stated in the README before any claim.
- Favorita's role and limits are explicit.
- The discount action is marked as proposed, with no POS integration.
- No unsupported claim says stockouts were prevented, revenue was saved, or the engine works in production.

---

## 10. OUTREACH MACHINE

Outreach starts only after the repository is deployed and the video is complete.

### Sequencing rule

Contact a maximum of 3-5 people per company, in sequence rather than all at once:

1. Start with the engineering manager closest to supply chain, demand, forecasting, inventory, or fulfilment.
2. If there is no reply after 5-7 days, contact the relevant director or VP.
3. Then contact the CTO or founder.
4. Run the recruiter or talent-acquisition track in parallel from day 1.

LinkedIn DM is the primary channel. Email is a backup. The full campaign is roughly 30 people across eight companies.

Do not send a generic blast. Each message should name one relevant design choice from the recipient's domain and link to the live demo, repository, and short video.

### Ranked target list

#### 1. SWISH

**Why first:** Best outreach odds. It is a smaller company, about 150 people, where founders are more likely to read their own DMs. There is no formal internship program, so the project can create the conversation.

- Aniket Shah, CEO: <https://www.linkedin.com/in/aniketshah30>
- Saran S, technical co-founder: <https://www.linkedin.com/in/saranonearth>
- Ujjwal Sukheja, co-founder; profile says hiring: <https://www.linkedin.com/in/ujjwalsukheja>

**Suggested sequence:** Saran S, then Ujjwal Sukheja, then Aniket Shah.

#### 2. ZEPTO

**Why second:** Strong direct fit with fulfilment engineering, forecasting, and supply-chain systems.

- Karthic Somalinga, SVP Engineering, Fulfilment: <https://www.linkedin.com/in/karthicsomalinga>  
  Top single target. He posts about forecasting and supply-chain AI.
- Deepak Jain, Director of Engineering: <https://in.linkedin.com/in/deepcoder>
- Jitendra Singh, Director of Engineering: <https://in.linkedin.com/in/jitendra-singh-48678253>
- Nikhil Mittal, CTO: <https://www.linkedin.com/in/nikhilkmittal>
- Neha Mahajan, Talent Acquisition: <https://in.linkedin.com/in/neha-mahajan-40389829>
- Siwangi Kumari, Campus Hiring: <https://in.linkedin.com/in/siwangi0206>

**Suggested sequence:** Karthic Somalinga, then one director, then Nikhil Mittal. Contact Siwangi Kumari or Neha Mahajan in parallel.

**Email pattern:** `first.last@zeptonow.com` is an aggregator guess, not a verified address.

#### 3. FIRSTCLUB

**Why third:** A younger, scaling organization with a short path to decision-makers.

- Ayyappan R, founder: <https://www.linkedin.com/in/ayyappan-r>
- Aviral Jain, engineering: <https://www.linkedin.com/in/aviral-jain-9b6966a1>

**Suggested sequence:** Aviral Jain, then Ayyappan R.

#### 4. BLINKIT

**Why fourth:** A relevant engineering organization with a company-published hiring inbox.

- Sajal Gupta, CTO; profile says “Building Blinkit | Hiring”: <https://www.linkedin.com/in/sajal-gupta-4b966742>
- Akansha Sharma, Talent Acquisition: <https://in.linkedin.com/in/akansha-sharma-16b8a7148>
- Nivedita Semwal, Talent Acquisition: <https://in.linkedin.com/in/niveditasemwal>
- Raman Sharma, Campus Hiring: <https://www.linkedin.com/in/raman-sharma-882b41204>

**Suggested sequence:** Send a focused message to Sajal Gupta and use the recruiter track in parallel. Send the CV and project links to `future@blinkit.com`.

**Verified inbox:** `future@blinkit.com`, published by Blinkit.  
**Email pattern:** `first.last@blinkit.com` is an aggregator guess, not a verified address.

#### 5. SWIGGY INSTAMART

**Why fifth:** The project maps directly to Instamart supply-chain engineering, and a campus track exists.

- Samkit Jain, Engineering Manager, Supply Chain: <https://www.linkedin.com/in/samsamkit>
- Tapan Ghia, AVP Engineering: <https://in.linkedin.com/in/tapanghia>
- Nitesh Garg, CTO, Instamart: <https://in.linkedin.com/in/niteshgarg>
- Manasa M.N., Campus/Early Careers: <https://www.linkedin.com/in/manasa-m-n-35a3a825>
- Anubhuti Kala, Talent Acquisition: <https://www.linkedin.com/in/anubhutikala>

**Suggested sequence:** Samkit Jain, then Tapan Ghia, then Nitesh Garg. Contact Manasa M.N. in parallel.

**Email pattern:** `first.last@swiggy.in` is an aggregator guess, not a verified address.

#### 6. BIGBASKET

**Why sixth:** A formal early-careers path exists, but the hiring process is likely to be less responsive to cold outreach than a smaller company.

- Siva Kumar Tangudu, Head of Engineering: <https://www.linkedin.com/in/tsiva>
- Keshav Kumar, CPTO: <https://www.linkedin.com/in/kumarkeshav>
- Swetha H S, Talent Acquisition: <https://www.linkedin.com/in/swethahs>
- Yogesh Soni, quick-commerce hiring: <https://www.linkedin.com/in/yogesh-soni-a1347b22>
- Sharath Shankar Dadi, Talent Acquisition: <https://www.linkedin.com/in/sharath-shankar-dadi-98046a40>

**Formal route:** BigBasket Early Careers and engineering internships: <https://careers.bigbasket.com>

**Suggested sequence:** Siva Kumar Tangudu, then Keshav Kumar. Contact Yogesh Soni or Swetha H S in parallel and apply through the careers site.

**Email pattern:** `first.last@bigbasket.com` is an aggregator guess, not a verified address.

#### 7. FLIPKART MINUTES

**Why seventh:** Cold DMs are a weaker path. The main student route is the Flipkart GRiD competition and student programs.

- Nilaksh Bajpai, VP Engineering: <https://www.linkedin.com/in/nilakshbajpai>
- Privendra Singh, Director: <https://www.linkedin.com/in/privendra-singh>
- Sai Shiva Prasad Konda, Early Careers: <https://www.linkedin.com/in/shivaprasad1>

**Primary route:** Flipkart student programs and GRiD: <https://www.flipkartcareers.com/students>

Use direct outreach as a secondary path after applying or participating through the student route.

#### 8. AMAZON

**Why eighth:** Cold outreach has near-zero expected yield. Use the official portal rather than spending campaign time on DMs.

**Primary route:** Amazon university opportunities: <https://www.amazon.jobs/content/en/career-programs/university>

No DM targets are included.

### Outreach caveats

- Only `future@blinkit.com` is company-verified in this list.
- Every other email pattern is an aggregator guess. Do not treat a pattern as a verified personal address.
- Titles and team ownership change. Re-verify the top targets immediately before sending.
- LinkedIn may redirect country-specific URLs. Confirm that each link still opens the intended profile.
- Keep the campaign focused. Do not contact six people at one company on the same day.
- Stop a sequence when someone replies and move the conversation through that person.

---

# PASTE-IN SUMMARY FOR ANTIGRAVITY/CODEX

```text
Turn github.com/kwakhare5/Dark-store-operator into an internship case study for quick-commerce engineering roles. It is not a SaaS product. Do not add features, ML, paid APIs, catalog work, dashboard polish, multi-store support, or warehouse-network simulation.

Positioning:
“Quick-commerce dark stores lose money to stockouts and expired stock. I built a deterministic decision engine that watches a dark store, predicts demand, and proposes orders/transfers, with a human approving every action before it runs. The environment is simulated and stated upfront. The repo explains what would change with real data.”
Lead with the auditable state machine and approval gate: double-check approvals, idempotency, stale-state checks, verification, and recovery. Call LangGraph an auditable state machine with human approval. Never pitch it as AI for its own sake.

Implement in this order:

1. FIX A - SCENARIOS
- Wire ScenarioConfig into the order generator and PO ETA calculation.
- demand_spike must change generated demand by its multiplier.
- supplier_delay must change PO ETA by its multiplier.
- Keep network_imbalance and expiry_wave working.
- Add one deterministic same-seed test per scenario proving that it changes an outcome, not just a config value.
- Make deployed scenario buttons visibly work.

2. FIX D - FORECASTING HONESTY
- Rename the method everywhere to “Holt linear.” Never call it ML.
- Show rolling MAE and WAPE with the evaluation window.
- Keep and surface the Holt-linear vs 14-day moving-average backtest.
- Use a 3-day holdout; lower MAE wins.
- Test holdout exclusion, lower-MAE selection, and known MAE/WAPE values.

3. FIX B - REPLENISHMENT REALISM
- Rename supplier to “Regional Fulfilment Centre.”
- Reorders become purchase orders with creation time, ETA, status, quantities, and an arrival event.
- Approval/creation must not change inventory. Inventory changes once, only when the PO arrives after lead time.
- Route transfers through the existing dispatch_transfer service. Transfers enter in-transit state with an ETA. Destination inventory changes once, only on arrival.
- Preserve approval, idempotency, stale-state checking, verification, and recovery.
- Test no instant inventory changes, ETA behavior, exactly-once arrival, dispatch_transfer use, and stale recommendation handling.

4. FIX C - DELETE FAKE SCOREBOARD
- Delete the hard-coded impact scoreboard in lib/metricsEngine.ts.
- Remove hard-coded baselines and the rule that every completed recommendation subtracts one stockout.
- Remove dependent UI, copy, imports, and README claims.
- Do not replace it with invented metrics.
- Stretch only after all core work: same-seed 7-day A/B benchmark comparing a simple reorder-point policy with the engine, measuring fulfilled, lost, and expired units.

5. SMALL LOCKED ITEMS
- Label discount recommendations: “Proposed action. POS integration is not implemented.” Stretch only: simple documented elasticity model.
- Demand generation uses a category × hour-block × weekday rate table.
- Track requested, fulfilled, and lost sales separately, with reconciliation tests.
- Keep module-level runtime state and document it as a single-process deterministic simulator. Do not add multi-worker support.
- Remove all Grocer and Swiggy Instamart catalog leftovers.

6. REAL DATA
- Integrate the free Kaggle Favorita Grocery Sales dataset as the demand backbone: real daily Ecuadorian grocery sales, 4+ years, promotions and holidays.
- Build a reproducible preprocessing step and document category mapping, intraday allocation, and every assumption.
- Do not imply that Ecuadorian grocery data represents Indian quick commerce.
- README must explain that inventory, lead times, topology, intraday behavior, and scenarios remain simulated.
- If this threatens the deadline, retain the current simulated generator and document Favorita as the next step. Never delay Fix A or Fix B for it.

7. DELIVER
- Public deployment. Put the verified live URL at the top of README.
- README order: live demo; 30-second explanation; demo video; problem with sourced real cost numbers; architecture diagram; design-decisions summary; honest limits.
- State simulation before any performance claim.
- Record a 60-90 second deployed-app video: IPL/Diwali spike → forecast → proposed PO/transfer → human approval → in-transit ETA → arrival and changed state. Do not claim avoided stockouts without a measured comparison.
- Write a design-decisions document: deterministic engine, human approval, auditable state machine, simulated data and Favorita, changes needed for real data, single-process state, production limits, no POS integration, no causal impact proof.

8. VERIFY
- Scenario buttons work on the deployed build.
- POs and transfers respect lead times and never teleport inventory.
- No fake metrics or Grocer leftovers remain.
- Use “Holt linear” consistently.
- Rolling MAE/WAPE are real.
- Requested/fulfilled/lost sales reconcile.
- Fixed-seed runs are deterministic.
- Production build succeeds.
- At least 185 tests pass and none fail.
- README states the simulated setup before any claim.

Time plan:
Day 1: Fix A + Fix D.
Day 2: Fix B + delete scoreboard + Grocer cleanup.
Day 3: deploy + README.
Day 4: video + design document.
Day 5: buffer/tests; only then A/B benchmark or elasticity.
Three-day fallback: keep Fix A and B, cut video to 45 seconds, fold shortened design decisions into README.

Outreach begins only after deployment and video completion. DM 3-5 people per company in sequence: closest engineering manager; after 5-7 days, director/VP; then CTO/founder. Run recruiter/TA in parallel from day 1. LinkedIn first, email backup. Use the full locked target list in Section 10 of DarkStore-Spec.md. Re-verify titles immediately before sending. Only future@blinkit.com is company-verified; other listed email patterns are aggregator guesses.
```
