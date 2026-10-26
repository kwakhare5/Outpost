# ADR 0007: Supabase Cloud PostgreSQL for Production Persistence

## What we decided
We decided to replace local SQLite with a hosted Supabase PostgreSQL (Postgres 17) database for Outpost V1. All dark store master data, batches, real demand curves, van transfers, and outcomes ledgers will persist in the cloud database.

## What this means
- Zero local mock data: all reads and writes go to real Supabase PostgreSQL.
- Database access is secured via environment variables (`DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
- Tables use PostgreSQL features (UUID primary keys, `TIMESTAMPTZ`, JSONB, and standard foreign key constraints).
