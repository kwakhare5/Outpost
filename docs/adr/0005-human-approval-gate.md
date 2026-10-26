# ADR 0005: Strict Human Approval Gate (Level-2 Autonomy)

## What we decided
We decided that Outpost acts strictly as an operational advisor. The AI and simulation engines spot stockout risks, run the numbers, and explain the trade-offs, but they are forbidden from dispatching vans or placing orders on their own. Every inventory or money movement requires a verified human click on "Approve".

## What this means
- The human planner (Karan) holds the wheel at all times.
- Before clicking Approve, the planner can adjust the recommended transfer count (e.g. adjust 40 cartons down to 35) as long as it doesn't violate the sending store's safety cushion.
- Hitting "Reject" closes the recommendation without spamming repetitive alerts, offering at most one sensible fallback (like cart rationing or an expedited warehouse PO).
