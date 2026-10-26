# ADR 0003: Oldest-First Batch Selling and Zero Expired Food

## What we decided
We decided that dark stores must track inventory by individual batches with explicit expiration dates, rather than a single flat stock counter. Customer orders will always consume the oldest batch first (FEFO), and any batch that passes its expiry timestamp is immediately locked so it can never be sold.

## What this means
- Perishables like milk and dahi cannot sit on shelves and be accidentally sold after spoiling.
- Expired cartons are automatically moved to "Expired Stock" and counted as financial loss in the rupee ledger.
- Price cut suggestions trigger before the batch expires (e.g. 24 hours ahead) to clear stock before it becomes a total write-off.
