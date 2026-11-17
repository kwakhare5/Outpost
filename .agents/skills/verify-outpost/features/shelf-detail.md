# Verify shelf detail

## What it is

The selected shelf shows the evidence chart, the reasons, and the three fixes.

## Steps

1. Open `/app`.
2. Select the first warning.
3. Check the chart: sold line, wanted line, empty-shelf marks.
4. Check the three reasons against the saved warning.
5. Check the three fixes: move, reorder, do nothing.
6. Check every assumption label.
7. Check the page in Rule mode and Demand watch mode.

## Expected

- Full mode: two lines, `What we sold` and `What we think people wanted`.
- Empty days are shaded and marked.
- Exactly three reasons, top contribution first.
- Exactly three fixes, one recommended.
- Each fix shows amount, arrival, cost, cover, and assumption.
- Rule mode: stock cover and delivery marker; no wanted line; `rule` label.
- Watch mode: demand only; no fixes; no warning.
- No fake or decorative chart.

## Fail signs

- A chart with no empty marks in Full mode.
- A wanted line without an `estimated` label.
- A fix without an assumption.
- A fourth fix.
- A `learned` label in Rule mode.
- A warning or fix in Watch mode.

## Evidence

- Screenshot of the shelf detail.
- The warning id and the three reason values.
- The first fix and its assumption.
