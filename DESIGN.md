# DESIGN.md — Outpost Visual System

The product is a calm morning tool for a planner. It should feel like a clean paper ledger with one clear warning, not a neon dashboard.

---

## 1. Aesthetic direction

- **Theme:** warm paper, ink text, one blue action, amber warnings, red losses.
- **Density:** compact enough for a list of shelves, spacious enough to read one shelf.
- **Surfaces:** solid. No glass, no blur, no glow, no reflections.
- **Structure:** one fill and one border per element. No box inside a box.
- **Tone:** direct, quiet, evidence first. The chart and the number are the hero, not the chrome.

---

## 2. Colour tokens

Use these exact values. No hardcoded colours outside this table.

| Token | Hex | Purpose |
|---|---|---|
| `bg` | `#F7F5F0` | Page background, warm paper |
| `surface` | `#FFFFFF` | Cards, panels, tables |
| `surface-muted` | `#F1EEE7` | Selected row, quiet fill |
| `ink` | `#171614` | Headings and body |
| `muted` | `#64605A` | Secondary text, labels |
| `border` | `#E3DFD6` | 1px borders and separators |
| `accent` | `#2F5BEA` | Primary action, sold line, focus ring |
| `accent-ink` | `#FFFFFF` | Text on accent |
| `warning` | `#B54708` | Warning band, usual-sales line, amber badge |
| `danger` | `#B42318` | Losses, failed claims, destructive action |
| `good` | `#067647` | Proven claims, safe state |
| `unknown` | `#8A857C` | Unknown flag, not enough data |
| `empty-band` | `#F6E7E4` | Empty-shelf shading on the chart |

**Contrast:** body text meets WCAG AA on `bg` and `surface`. Never use `muted` for a primary number.

---

## 3. Typography

- **UI and body:** Inter, self-hosted. Fallback: `system-ui, sans-serif`.
- **Numbers:** JetBrains Mono, self-hosted, tabular. Fallback: `ui-monospace, monospace`.
- **Landing accent:** Caveat, self-hosted, landing annotations only. Never in the product UI.
- **No Google Fonts network calls.** Fonts are served from the app.

| Style | Size / line | Weight | Use |
|---|---|---|---|
| `display` | 40 / 44 desktop, 32 / 36 mobile | 600 | Landing promise |
| `h1` | 28 / 34 | 600 | Page title |
| `h2` | 20 / 28 | 600 | Section title |
| `h3` | 16 / 24 | 600 | Card title |
| `body` | 15 / 24 | 400 | Default |
| `small` | 13 / 20 | 400 | Labels, secondary |
| `caption` | 12 / 16 | 500 | Badges, chart notes |
| `number` | 24 / 28 mono | 600 | The one number that matters |
| `number-small` | 14 / 20 mono | 500 | Table numbers |

Use `font-variant-numeric: tabular-nums` for all numbers.

---

## 4. Spacing, radius, surfaces

- **Spacing:** 4px base. Use 4, 8, 12, 16, 24, 32, 48, 64.
- **Radius:** 10px cards, 8px buttons and inputs, 6px badges.
- **Border:** 1px `border`. No double borders.
- **Shadow:** none on cards. A single soft shadow is allowed on a popover only.
- **Targets:** at least 44×44 on touch, 32×32 on desktop. Target size does not change on hover.
- **No nested boxes:** a card does not contain another bordered card. Use spacing and type to group.

---

## 5. Components

### Buttons

- **Primary:** `accent` fill, `accent-ink` text, 8px radius. One per screen.
- **Secondary:** `surface` fill, 1px `border`, `ink` text.
- **Quiet:** text only, `muted`; turns `ink` on hover.
- **Danger:** `danger` text or fill for destructive actions only.
- Focus: 2px `accent` ring, 2px offset.
- Hover: colour change only, no size change.

### Badges

- **Mode:** `Full`, `Rule`, `Demand watch`, `Not enough history`.
- **Claim:** `Proven`, `Rule`, `Watch`, `Simulated`, `Failed`.
- **Band:** `High`, `Medium`, `Low`.
- Every badge has text. Never colour alone.
- `proven` uses `good`; `rule` uses `accent`; `watch` uses `unknown`; `simulated` uses `warning`; `failed` uses `danger`.

### Table

- Header: `small`, `muted`, uppercase only if short.
- Row: 44px min height, 1px bottom border.
- Numbers right-aligned, tabular.
- The selected row uses `surface-muted`, not a border.
- No zebra stripes.

### Evidence chart

- Two lines: `What we sold` in `accent` solid; `About how much it usually sells` in `warning` dashed, labelled a simple estimate from the same day last week. The corrected estimate's accuracy claim failed, so no corrected line is drawn.
- Empty-shelf days: `empty-band` vertical shading.
- Axis: days on x, units on y. Label both.
- Tooltip: exact numbers, date, and `observed` or `estimated`.
- Rule mode: stock cover line and a delivery marker. No usual-sales line.
- Watch mode: demand line only.
- No 3D, no gradients, no decorative sparklines, no pie charts.
- A text summary sits under the chart for screen readers.

### Reason list

Three rows. Each row: plain label, value, and a small contribution bar. The top reason first. No invented reasons.

### Fix card

- Kind: `Move stock`, `Reorder`, `Do nothing`.
- Amount and unit.
- Arrival and cover.
- Cost, labelled `assumed` or `simulated`.
- One-line assumption.
- `Recommended` badge on one card only.
- No nested card. Use a 1px top border between fixes.

### Decision bar

- Sticky at the bottom of the shelf detail.
- `Approve` primary, `Reject` secondary.
- After saving: `Approved` or `Rejected`, both disabled.
- A repeated click does nothing. The UI never shows a second movement.

### Proof score card

- Claim name.
- The number, large and mono.
- The bar and whether it passed.
- Status badge.
- Evidence line: dataset, split, date.
- Losses sit below the scores, never in a collapsed section.

### Assistant answer

- Answer first, in plain words.
- `Where this came from` list with tool names and values.
- `Offline answer` badge when no provider key.
- Refusal: "I can't prove that from the saved records." Then say what is available.
- No free-form chat bubble that looks like a person.

### Upload report

- Rows, stores, products, date range.
- Empty-shelf marks, unknown days, missing optional fields.
- Detected mode and active claims.
- One primary action: `Load this data`.

---

## 6. Screen states

Every screen must handle these without a blank page or a raw error.

| State | What the user sees |
|---|---|
| Loading | Skeleton rows that match the final layout. No layout jump. |
| Empty | One plain sentence and the next action. |
| Error | What failed, what to do, and a retry. No stack trace. |
| Reduced mode | Mode banner with what the app can and cannot claim. |
| No mode | Simple average and `Not enough history`. |
| Saved decision | `Approved` or `Rejected`, disabled, with the saved fix. |
| Offline assistant | `Offline answer` badge and the fixed answer. |
| Simulated | `Simulated` label on every money or outcome number. |
| Failed claim | `Failed` badge and the one-line reason. |

No silent degradation. If a claim is not active, say why.

---

## 7. Screen blueprints

### Landing `/`

1. Promise: "Know which shelf will run out before it does."
2. Proof strip: the three real scores and the simulated replay, with statuses.
3. How it works: data → warning → fix → proof, in four plain steps.
4. Real vs assumed: two short lists.
5. The miss: one real missed shelf and why.
6. Bring your own data: one line and one button.
7. Footer: data credit and Method link.

One primary action: `Open the demo`.

### Control room `/app`

- Top bar: product mark, mode badge, `Bring data`, `Method`, `Reset demo`.
- Left: ranked warning list. Each row: shelf, product, band, one-line reason.
- Right: selected shelf detail.
- No third column. No dashboard grid of cards.

### Shelf detail

1. Shelf name and mode.
2. The number: chance this shelf runs out, or days of cover in Rule mode.
3. Evidence chart.
4. Why this shelf: three reasons.
5. Three fixes.
6. Ask box.
7. Decision bar.

### Proof

1. Three real scores.
2. Simulated replay.
3. Losses.
4. Model card.
5. Assistant check.
6. Data credit.

No confetti. No victory banner. The losses are visible without scrolling past a wall of praise.

### Bring data

1. Drop zone.
2. Column mapping.
3. Declaration: unit, day boundary, currency.
4. Validation report.
5. Detected mode and active claims.
6. `Load this data`.
7. `Remove my data` after load.

### Method `/method`

1. The contract.
2. The baselines.
3. The 15/3 city split and the study gate.
4. The assistant check.
5. What the study does not prove.
6. Data credit and licenses.

---

## 8. Copy rules

- Write for an 8th-grade reader.
- One idea per line.
- Numbers with units: `3 days`, `12 units`, `20 shelves`.
- Say `chance this shelf runs out`, not `probability`.
- Say `what we sold vs about how much it usually sells`, not `latent demand`.
- Say `compared with doing nothing`, not `counterfactual`.
- Say `slowest 1 in 20 answers`, not `p95 latency`.
- Say `our estimate`, not `true demand`.
- Say `simulated`, not `saved`, for replay money.
- Say `empty shelf`, not `stockout`, in the UI.
- No jargon, no acronyms, no hype.
- No fake urgency. No "Act now."
- Losses are written in the same plain voice as wins.

---

## 9. Interaction and motion

- 120–180ms ease-out for state changes.
- No bounce, parallax, glass, or animated gradients.
- Hover changes colour, not size.
- Focus is always visible.
- Respect `prefers-reduced-motion`.
- The chart may animate once on load; it must not loop.
- No sound.

---

## 10. Accessibility

- WCAG AA contrast for text.
- Keyboard path through every action.
- Visible labels on every input. No placeholder-only labels.
- Table headers are real headers.
- The chart has a text summary.
- Badges use text, not colour alone.
- Error messages sit next to the field, not in an alert popup.
- Touch targets meet 44×44.
- No horizontal overflow at 375px on the landing.

---

## 11. Anti-slop checklist

Never ship:

- Purple-on-black AI gradients.
- Glass, blur, glow, or reflections.
- A box inside a box.
- Fake charts or decorative stats.
- Stock photos of smiling shoppers.
- AI 3D product renders.
- A dashboard of meaningless cards.
- A low-contrast gray-on-gray label.
- A raw browser alert or confirm.
- A spinner with no skeleton.
- A claim without a status.
- A simulated number without a label.
- A loss hidden below the fold.
- A mode the visitor can switch to look better.

---

## 12. Design invariants

1. The mode banner is on every app screen.
2. Every claim has a visible status.
3. The losses are visible on Proof.
4. One primary action per screen.
5. The chart is evidence, not decoration.
6. The number is the hero.
7. The demo day says `a representative day, not the proof`.
8. No passwords, accounts, or login UI.
9. No nested boxes.
10. Solid surfaces only.
