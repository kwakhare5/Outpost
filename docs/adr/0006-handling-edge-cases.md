# ADR 0006: Handling Edge Cases (Cart Rationing & Priority Tie-Breaking)

## What we decided
We decided on deterministic rules for the two critical operational edge cases:
1. **When no local store has surplus:** If neither Bandra nor Powai has enough stock to spare without violating their safety cushion, Outpost blocks van transfers. Instead, it suggests **Cart Rationing** (limiting customer orders to 1–2 cartons per customer on the app) to stretch existing stock until the scheduled warehouse truck arrives.
2. **When two stores run out simultaneously:** If both Andheri and Powai are projected to run out of milk at the same time, Outpost prioritizes the store with the higher active sales velocity (burning stock faster per hour), or recommends a proportional split of the sending store's surplus.

## What this means
- The system never forces an unsafe transfer that would cause a second store to run dry.
- Cart rationing preserves stock for regular households rather than letting bulk buyers wipe out remaining inventory.
- Priority decisions are transparent, mathematically sound, and protect the highest revenue at risk.
