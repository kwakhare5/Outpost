# Verify Today

## What it is

The `/app` page shows the ranked warnings for the active dataset.

## Steps

1. Start the app and open `/app`.
2. Confirm the mode banner is visible.
3. Confirm the list is ranked by risk, with the top 20 scored.
4. Open the first row.
5. Check the band, the shelf name, and the one-line reason.
6. Check the browser console.

## Expected

- The list matches the saved warning rows for the demo day.
- The top row has the highest rank.
- Each row has a shelf, product, band, and reason.
- No warning appears in `watch` or `no_mode`.
- Zero console errors.

## Fail signs

- A warning without a mode or claim label.
- A warning in `watch` or `no_mode`.
- A rank gap or a duplicate shelf.
- A reason that does not match the saved contributions.
- A raw error or a blank list.

## Evidence

- Screenshot of `/app`.
- Count of warnings and the first row's rank.
- Console output.
