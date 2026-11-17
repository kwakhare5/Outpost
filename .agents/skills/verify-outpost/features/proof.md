# Verify Proof

## What it is

The Proof page shows the three real scores, the simulated replay, the losses, the model card, and the assistant check.

## Steps

1. Open `/app` and select `Proof`.
2. Compare each number with `study/artifacts/proof.json`.
3. Check the status label on every claim.
4. Check the replay label.
5. Check the losses: at least one real missed shelf and one replay day where Outpost did worse.
6. Check the model card: trained cities, test cities, features, no-identity rule.
7. Check the assistant check status.
8. Check the data credit.

## Expected

- Every number matches the saved proof.
- Every claim has a `proven`, `rule`, `watch`, or `simulated` label.
- No `pending` or `failed` claim is shown as active.
- The replay says `simulated` on every money number.
- Losses are visible, not collapsed.
- The model card is complete.
- The assistant check shows pass/fail/not run.
- The `a representative day, not the proof` label is visible.

## Fail signs

- A number that does not match `proof.json`.
- A claim without a status.
- A real-money savings claim.
- Losses hidden or missing.
- A replay without stock, travel, and price.
- A demo day presented as the proof.

## Evidence

- Screenshot of Proof.
- The comparison table: page value vs artifact value.
- The loss rows.
