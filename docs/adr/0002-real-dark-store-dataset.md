# ADR 0002: Using Real Dark Store Data (FreshRetailNet) for Demand and Baselines

## What we decided
Instead of using fake numbers or guessing how many items sell each hour, we decided to ground all customer demand and stockout patterns in the `FreshRetailNet-50K` dataset from Dingdong Fresh.

## What this means
- Customer orders follow real hourly quick-commerce sales curves (`hours_sale`), capturing the real morning breakfast surge (06:00 to 10:00 AM) and afternoon drop.
- The "Without Outpost" comparison uses actual dark store stockout records (`hours_stock_status`) to measure the exact customer sales lost when shelves go empty.
- We extract the clean hourly profiles for our 3 Mumbai stores (Andheri, Bandra, Powai) into lightweight tables so the app stays fast and doesn't load a 106 MB file on every click.
