# ADR 0004: Doorstep Count as the Sole Inventory Truth

## What we decided
We decided that inventory can never be added to a receiving store while a van is driving on the road. When a van is dispatched, stock is deducted immediately from the sending store. The receiving store only receives stock after an associate physically counts the cartons at the door.

## What this means
- Enforces strict conservation of mass: zero phantom inventory floating in the system.
- If 40 cartons are sent and 2 burst or leak on Mumbai roads, the receiver enters 38 good units.
- The 38 good units are added to sellable stock, and the 2 broken cartons are automatically booked as "Damaged on the Road" in the loss ledger.
- Doorstep confirmation is idempotent: refreshing the page or clicking twice will never double-add stock.
