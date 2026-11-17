# Outpost PRD

**One project, one version.** This document replaces `PRD.md` and every earlier spec. The old demo is deleted after this PRD is approved.

**Version:** 2026-11-17
**Owner:** Karan Wakhare
**Status:** locked direction for owner review. Architecture, stack, database, API, and build phases are the next step and are intentionally not in this document.

---

## 1. What Outpost is

Outpost is a decision-support app for a grocery store planner. It warns which store shelf is likely to go empty next, shows the cheapest safe fix, and proves whether the fix beat doing nothing. A human approves every action. Approved actions run in a simulation.

**One-line promise:** Outpost warns which store shelf will go empty next, shows the cheapest safe fix, and proves the result on real data, including the days it lost.

A **shelf** means one product in one store. A **warning** is the daily alert for one shelf. A **fix** is one of three responses: move stock, reorder, or do nothing.

It answers one question: which shelf is at risk, what can we do, and did it work?

---

## 2. The one hard idea

When a shelf is empty, the sales number is low. Not because people stopped wanting the product, but because they could not buy it. A model trained on those numbers learns to under-order exactly where shelves go empty. That makes more empty shelves.

Outpost corrects for this. It estimates what people wanted, not only what was sold, and shows both lines: what we sold, and what we think people wanted. The correction changes the warning and the fix. It is the reason this project exists.

**Honest ceiling:** the corrected number is an estimate. The app never claims it recovered the true demand. It measures what can be measured: demand accuracy on days the shelf was not empty, warning quality, and whether the correction changes the ranking and the decision.

---

## 3. Who uses it

A planner who keeps several grocery stores stocked. The public demo uses anonymized stores and products from a real dataset. No invented names.

Visitors can open the app, browse, ask, approve, reject, and reset. No accounts, no passwords, no login.

---

## 4. The data contract

The system works on any dataset that meets the contract. It never tunes to one company's data.

**Required fields**

| Field | Plain meaning |
|---|---|
| store | Which store |
| product | Which product |
| date | The day |
| quantity | How many sold, on a declared unit scale |
| empty shelf | Was the shelf empty that day: yes, no, or unknown |

**Optional fields, which unlock more**

| Field | What it unlocks |
|---|---|
| hourly sales | The day chart |
| current stock | Move and reorder comparisons |
| travel time and delivery time | Arrival timing |
| price per unit | Money at risk and costs |
| holidays, promotions, weather | Demand estimate inputs |

**Minimum history:** 28 days per store and product. Below that, a simple average, labelled "not enough history."

**Claims by data**

| Data you bring | What Outpost can claim |
|---|---|
| Sales + empty-shelf history | Demand estimate, warning, assistant, proof |
| Plus stock, travel time, price | Priced fixes and the replay |
| Sales only | Demand watch; it says it cannot predict empty shelves |
| Under 28 days | Simple average; labelled |

**Rules**

- The dataset declaration states the unit scale, the day boundary, and the currency. Normalized sales are never shown as packs or rupees.
- A validation report runs before any prediction. It lists what is present, what is missing, and which claims are active.
- One active dataset per visitor. Datasets are never mixed.
- Uploads are per visitor. The shared demo is never overwritten.

---

## 5. Bring data

A page inside the control room. One job: load a company's data.

1. Drop a ZIP or choose CSV files. A sample file shows the required columns in plain words: which store, which product, what day, how many sold, was the shelf empty.
2. The app reads the headers. If they match, this step is skipped. If not, a small table lets the visitor match each required field to a column. No code, no config file.
3. A plain report: rows, stores, products, date range, empty-shelf marks, unexplained zero days, missing optional fields, and active claims.
4. "Load this data." The banner switches to "Your data, full claims" or "Your data, limited claims," with "Back to the demo" and "Remove my data."

A required column missing: the app names the column and refuses. An optional column missing: it loads in reduced mode and says what it cannot claim. No silent degradation.

---

## 6. The loop

1. Load and validate the dataset.
2. Estimate demand, corrected for empty shelves.
3. Warn: one warning per store and product each morning, meaning "likely to have an empty-shelf hour in the next 24 hours." Warnings are ranked by risk. The top 20 per day are scored.
4. Show the fixes: move stock, reorder, do nothing. Each shows timing, cost when prices exist, and the assumption behind it.
5. The assistant answers from saved records: status, why this fix, what if it arrives late. It refuses what it cannot prove.
6. The planner approves or rejects.
7. An approved action saves a record with the inputs, dataset, model version, policy version, and decision. The simulation applies it.
8. The Proof page shows the scores and the losses.

Nothing moves without a click. Repeating an approval does nothing. A move never creates stock: a sending store keeps enough for its own expected demand, and stock never appears from nowhere.

---

## 7. The screens

**Landing:** the story in six blocks: the promise, the proof strip, how it works, real vs assumed, the miss, and bring your own data. One call to action: "Open the demo."

**Control room**, two tabs:

- **Today:** the list of shelves to watch on the left; the selected shelf on the right. The right side shows the evidence chart with empty-shelf days marked and two lines, "What we sold" and "What we think people wanted." Then why this shelf, the three fixes, the ask box, and approve or reject.
- **Proof:** the three real scores, the one simulated replay, where we were wrong, and what we could not use.

**Bring data:** the upload page in Section 5.

**Method:** the contract, the baselines, the two splits, the assistant check, the limits, and the data credit.

The control room is desktop-first. The landing works on a phone.

---

## 8. The assistant

The assistant fetches records through six read-only tools: shelf history, demand estimate, warning reasons, another store's safe surplus, delivery and travel assumptions, and saved decisions and outcomes. It runs bounded what-if questions through the calculation engine. It never invents a number, never proposes an action outside the three fixes, and never writes.

Every answer shows the numbers and a "Where this came from" list. If it cannot prove an answer, it says so.

**The assistant check:** 40 template questions, 20 facts, 10 refusals, and 10 never-seen wordings, instantiated from the loaded dataset's records. Expected facts are computed from records, not typed in. Pass bars: 18 of 20 facts, 10 of 10 refusals, 9 of 10 wordings. A lower score fails the release and the miss is shown. Speed is the slowest 1 in 20 answers, and cost per answer is shown. Both on Proof.

Without a model key, fixed answers come from the same records. The page says "offline answer" and the full check is marked not run.

---

## 9. Proving it works

Three real-data claims and one simulated claim.

1. **Demand accuracy:** average miss against the lazy guess, which is the same weekday last week. Report with and without the empty-shelf correction, on days the shelf was not empty.
2. **Warning quality:** catch rate and false alarms at the fixed alert budget of 20 per day, against a simple rule. The simple rule alerts when the shelf had an empty-shelf hour on the same weekday in the last two weeks; ties are ranked by empty hours in the last 14 days. The rule is fixed in writing before scoring.
3. **Assistant quality:** the 40-question check, speed, and cost.
4. **The replay (simulated):** Outpost against doing nothing on the same held-out days, with stock, travel time, and prices labelled as assumptions. Both arms get every valid proposal approved by the same fixed rule. No manual tweaks. The human lives in the live demo, not in the score.

**Generalization, fixed before looking at results**

- Train on 15 of the 18 cities, test on 3 cities never seen, using each city's last 30 days. The model may read a test city's earlier days as input, like a new company's own history, but never trains on it.
- No store, product, city, or category identity features. Behavior only: recent sales, same weekday, trend, empty-shelf history, optional weather and holidays.
- Do not rely on the dataset's own train and eval split.
- One second real public dataset from a different business, in sales-only mode, proves the front door. It never carries the core claims. The choice is recorded in a decision record.
- At decision time, only data up to that day is visible. The app never reads a future day.

**Report the losses:** real missed shelves and replay days where Outpost did worse, each with a one-line reason. A claim that fails is cut or stated as failed. It is not hidden.

---

## 10. The data

**FreshRetailNet-50K** from Dingdong: 50,000 store-product series, 898 stores, 18 cities, 865 products, about 90 days each, 4.85 million rows, 115 MB. Each row has daily sales, hourly sales, hourly empty-shelf status, discounts, holidays, and weather. About 20% of days have organic stockouts. License CC BY 4.0. Credit Dingdong and the 2025 paper.

The dataset was published for hidden-demand recovery. Outpost uses it for that purpose. A public baseline exists; Outpost does not claim research novelty or a win over it.

The second dataset is real, public, from a different business, and used only to prove the data contract. Its license is credited.

The demo uses the primary dataset with anonymized IDs. No invented store or product names.

The dataset is downloaded once. The app does not fetch data from the internet at runtime. The assistant may call the model provider; only computed facts leave the app, never raw rows.

---

## 11. Honesty rules

- Every number on screen comes from the dataset, a calculation, or a labelled assumption.
- Real, learned, assumed, and simulated are labelled everywhere.
- The corrected demand is an estimate. It is never called true demand.
- The replay is simulated. The app never says "Outpost saved a real store ₹X."
- No invented charts, no decorative graphs, no fake numbers.
- Tests may use labelled fixtures. They may not fake outcomes or hardcode success.
- Uploaded data is per visitor. "Remove my data" deletes it. Only computed facts go to the model.
- Every dataset is credited.

---

## 12. Out of scope

- Architecture, stack, database, API, and build phases. Those are the next step.
- Expiry, waste, and discounting near-expiry.
- The Mumbai fiction, named products, doorstep drama, and the old fixed demo day.
- The Smart Plan optimizer. The three fixes are enough.
- The old 50-question quiz. The 40-question assistant check replaces it.
- Real company systems, SAP, payments, and multi-user accounts.
- Customer app, driver map, customer-level rationing, and supplier features beyond a simulated reorder.
- Promising that Outpost beats the baseline. The proof reports the honest result.
- A mobile control room. The landing works on a phone.
- Multi-agent systems, document search, and fine-tuning.

---

## 13. Demo and copy

**The three-minute story**

1. Proof first: the dataset, versions, date, and active claims.
2. One warning: the evidence, what we sold vs what we think people wanted, and the three reasons.
3. The three fixes, two questions (why this fix, what if it arrives late), and one refusal.
4. Approve. The record saves and the simulation runs.
5. The same system on a different company's data, with reduced claims shown.
6. End on a real miss: a held-out shelf that emptied without a warning, and why.

**Landing copy, everyday words**

- "Know which shelf will run out before it does."
- "Outpost reads real grocery sales, warns you about the shelves most likely to go empty, and shows the safest fix. Then it proves how often it was right, and where it was wrong."
- Buttons: "Open the demo" and "See how it works."

**Forbidden in user-facing copy:** jargon, acronyms, and tech words. Use "chance this shelf runs out," "what people wanted vs what we sold," "compared with doing nothing," and "slowest 1 in 20 answers."

---

## 14. Success criteria

1. A visitor can load a conforming dataset, see its validation report, and get its own claims, with no login.
2. The three real scores and the simulated replay are on the Proof page, with the losses.
3. The assistant passes its 40-question bars on the primary dataset. A miss fails the release.
4. The generalization test runs on 3 unseen cities and the last 30 days. The second dataset loads in reduced mode.
5. Every number on screen traces to a record or a labelled assumption.
6. The public demo works with no password and a reset.
7. A company's upload never changes another visitor's demo.
