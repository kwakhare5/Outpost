# Verify decision

## What it is

Approve or reject one fix. The decision saves once and the simulated outcome is stored.

## Steps

1. Open a shelf detail.
2. Click `Approve`.
3. Refresh the page.
4. Click `Approve` again.
5. Open a second shelf and click `Reject`.
6. Run the concurrent approval test.
7. Check the sender's stock and the receiver's stock.

## Expected

- The first approval saves one decision and one movement.
- Refresh shows `Approved` and disabled buttons.
- The second click returns the same record; stock does not move twice.
- Reject saves `Rejected`; stock does not change.
- Two concurrent approvals never spend the same surplus twice.
- The sender keeps its own expected demand.
- The outcome is labelled `simulated`.
- No real money is claimed.

## Fail signs

- A duplicate decision or movement.
- Negative stock.
- A fix that exceeds the safe surplus.
- A real-money claim.
- A blank state after refresh.

## Evidence

- Decision id and outcome id.
- Sender and receiver stock before and after.
- Concurrent test output.
