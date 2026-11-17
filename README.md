# Outpost

**Outpost warns which store shelf will go empty next, shows the cheapest safe fix, and proves the result on real data, including the days it lost.**

## The problem

When a shelf is empty, the sales number is low. Not because people stopped wanting the product, but because they could not buy it. A model trained on sales alone learns to under-order exactly where shelves go empty.

Outpost estimates what people wanted, not only what they sold. It shows both lines, warns the planner, and measures whether the warning and the fix were right.

## What it does

1. Bring data: sales and an empty-shelf flag are required; stock, price, travel, and delivery time are optional.
2. See warnings: the shelves most likely to go empty, ranked, with the top three reasons.
3. Open one shelf: what we sold vs what we think people wanted, and the three fixes.
4. Approve or reject: the decision is saved and the fix runs in a simulation.
5. See proof: three real scores, one simulated replay, and the losses.

No passwords. The demo is open and reset-able.

## The three data modes

The data decides what the app can claim.

| Mode | Data | What it can claim |
|---|---|---|
| Full | Sales + usable empty-shelf history | Corrected demand, learned warning, full proof |
| Rule | Sales + stock + delivery time | A days-of-cover rule, labelled; no catch-rate claim |
| Demand watch | Sales only | Demand estimate and accuracy only |
| No mode | Under 28 days | Simple average; no claims |

## The proof

Before the app is built, the offline study must pass a fixed gate:

- Train on 15 cities, test on 3 unseen cities.
- The learned warning must beat the simple rule by 10% relative catch rate, with false alarms no more than 10% relative worse.
- The correction must beat the same-weekday-last-week guess by 10% relative average miss.
- The correction must change the top-20 warning set on 5% of scored days.

If the warning loses, the simple rule ships and the loss is shown. If both real claims fail, the project stops and is reframed.

## Status

This repository is in the documentation and study phase. The app is not built yet.

The build order is in [`TASKS.md`](TASKS.md). No app code starts before the study gate.

## Repository map

| File | What it is |
|---|---|
| [`PRD.md`](PRD.md) | What we build and why |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | How the system is shaped |
| [`STUDY.md`](STUDY.md) | The offline study and model card |
| [`CLAIMS.md`](CLAIMS.md) | Every claim and its status |
| [`GLOSSARY.md`](GLOSSARY.md) | Shared words and rules |
| [`DESIGN.md`](DESIGN.md) | Visual system |
| [`TASKS.md`](TASKS.md) | The implementation plan |
| [`AGENTS.md`](AGENTS.md) | The working contract |
| [`JOURNAL.md`](JOURNAL.md) | What changed and what was proven |
| [`docs/adr/`](docs/adr/) | Accepted decisions |

## Running it

Not available yet. The commands will be added when the study and the skeleton exist. The planned commands are in `AGENTS.md` section 14.

## Data

The primary dataset is **FreshRetailNet-50K** from Dingdong: 50,000 store-product series, 898 stores, 18 cities, about 90 days each, about 4.5 million rows. License CC BY 4.0. Credit Dingdong and the 2025 paper.

The second dataset is **UCI Online Retail II**, used only for the Demand watch mode and the data contract. Its license is checked before use.

## Built by

Karan Wakhare.
