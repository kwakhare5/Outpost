# ADR 0009: Real CSV Data Ingestion for External Verification

## What we decided
We decided to build a functional CSV data ingestion pipeline (`POST /api/ingest/csv`). This allows external quick-commerce operators (e.g. Blinkit or Zepto managers) to upload a CSV of their own dark store inventory and sales velocity, parse it into Supabase, and run our replenishment engine on their real-world data.

## What this means
- Outpost is a **generalizable inventory engine**, not a hardcoded demo locked to 3 fixed stores.
- The engine ships with preloaded Mumbai data (`FreshRetailNet-50K`) for instant use, but allows any user to swap in their own store data.
- The CSV schema requires 6 simple columns: `store_name`, `product_name`, `current_stock`, `hourly_sales_rate`, `unit_mrp`, `expiry_hours`.
- Upon upload, the backend validates the file, populates Supabase tables, and recalculates stockouts and transfer recommendations for the uploaded stores.
