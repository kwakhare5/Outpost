# Verify modes

## What it is

The four data modes and their claim limits.

## Fixtures

| Fixture | Expected mode | Expected claims |
|---|---|---|
| Full: sales + empty labels, 28+ days | `full` | Learned warning, simple usual-sales estimate, proof |
| Rule: sales + stock + delivery, no labels | `rule` | Days-of-cover rule; demand accuracy; no catch-rate claim; no replay |
| Watch: sales only | `watch` | Uncorrected demand only; no warning; no fixes |
| No mode: under 28 days | `no_mode` | Simple average; no claims |

## Steps

1. Load each fixture.
2. Check the mode banner.
3. Check Today, shelf detail, Proof, and the assistant.
4. Try to request a higher mode through the API.
5. Check the validation report reason.
6. Add a shelf with under 28 days to the Full fixture.

## Expected

- The mode matches the fixture.
- Only the allowed claims appear.
- Rule mode says `rule`, not `learned`.
- Watch mode has no warning and no fixes.
- No mode has no warning, no proof, no fix.
- A client request for a higher mode is refused.
- The validation report says why the mode was chosen.
- The short-history shelf shows `not enough history` and no warning.

## Fail signs

- A visitor can switch modes.
- A catch-rate claim in Rule mode.
- A warning in Watch mode.
- A proof in No mode.
- A learned label on a rule.

## Evidence

- Four screenshots.
- Four validation reports.
- The refused mode request.
