-- Outpost V1 Database Schema (Supabase PostgreSQL 17)
-- 8 Core Tables for Autonomous Dark Store Operations

-- 1. Dark Stores
CREATE TABLE IF NOT EXISTS stores (
    id TEXT PRIMARY KEY,                 -- 'andheri-west', 'bandra', 'powai'
    name TEXT NOT NULL,                  -- 'Andheri West', 'Bandra', 'Powai'
    city TEXT NOT NULL DEFAULT 'Mumbai',
    safety_cushion_pct NUMERIC(4,2) DEFAULT 0.20 -- 20% safety cushion over projected demand
);

-- 2. Mumbai Route Travel Times (in minutes)
CREATE TABLE IF NOT EXISTS store_routes (
    from_store_id TEXT REFERENCES stores(id) ON DELETE CASCADE,
    to_store_id TEXT REFERENCES stores(id) ON DELETE CASCADE,
    travel_minutes INTEGER NOT NULL,     -- Bandra->Andheri: 45, Bandra->Powai: 60, Andheri->Powai: 40
    PRIMARY KEY (from_store_id, to_store_id)
);

-- 3. Core Products (The 5 Anchor Staples)
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,                 -- 'amul-taaza-500', 'mother-dairy-dahi-400', etc.
    name TEXT NOT NULL,                  -- 'Amul Taaza Milk 500ml'
    category TEXT NOT NULL,              -- 'dairy', 'bakery', 'breakfast'
    unit_mrp NUMERIC(10,2) NOT NULL,     -- 27.00, 35.00, 45.00, etc.
    shelf_life_days INTEGER NOT NULL
);

-- 4. Inventory Batches (Batches as Absolute Truth)
CREATE TABLE IF NOT EXISTS batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id TEXT REFERENCES stores(id) ON DELETE CASCADE,
    product_id TEXT REFERENCES products(id) ON DELETE CASCADE,
    batch_code TEXT NOT NULL,            -- e.g. 'BAT-AMUL-20261025-01'
    initial_qty INTEGER NOT NULL,
    current_qty INTEGER NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,     -- Strict expiration timestamp
    status TEXT NOT NULL DEFAULT 'active'-- 'active', 'expired', 'depleted'
);

-- 5. Real Hourly Demand Curves (Extracted from FreshRetailNet-50K)
CREATE TABLE IF NOT EXISTS real_demand_curves (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    store_id TEXT REFERENCES stores(id) ON DELETE CASCADE,
    product_id TEXT REFERENCES products(id) ON DELETE CASCADE,
    hour_of_day INTEGER NOT NULL,        -- 6 to 22 (06:00 to 22:00)
    units_demanded NUMERIC(6,2) NOT NULL,-- Real hourly sales rate from dataset
    source_dataset TEXT DEFAULT 'FreshRetailNet-50K'
);

-- 6. Van Transfers (In-Flight State Machine)
CREATE TABLE IF NOT EXISTS van_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_store_id TEXT REFERENCES stores(id) ON DELETE CASCADE,
    to_store_id TEXT REFERENCES stores(id) ON DELETE CASCADE,
    product_id TEXT REFERENCES products(id) ON DELETE CASCADE,
    dispatched_qty INTEGER NOT NULL,
    received_qty INTEGER DEFAULT 0,
    damaged_qty INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'approved', -- 'approved', 'dispatched', 'in_transit', 'arrived', 'received'
    dispatched_at TIMESTAMPTZ,
    expected_arrival_at TIMESTAMPTZ,
    received_at TIMESTAMPTZ,
    batch_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure batch_expires_at column exists if table was previously created
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'van_transfers' AND column_name = 'batch_expires_at'
    ) THEN
        ALTER TABLE van_transfers ADD COLUMN batch_expires_at TIMESTAMPTZ;
    END IF;
END $$;

-- Rename simulation_clock if it exists from previous migration
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'simulation_clock') THEN
        ALTER TABLE simulation_clock RENAME TO time_clock;
    END IF;
END $$;

-- 7. Operational Time Clock
CREATE TABLE IF NOT EXISTS time_clock (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    "current_time" TEXT NOT NULL,          -- e.g. '08:00'
    day_date TEXT NOT NULL,              -- e.g. '2026-10-25'
    total_hours_advanced INTEGER DEFAULT 0
);

-- 8. Honest Outcomes Ledger (Tracking Every Rupee and Unit)
CREATE TABLE IF NOT EXISTS outcomes_ledger (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    clock_time TEXT NOT NULL,
    store_id TEXT REFERENCES stores(id) ON DELETE CASCADE,
    product_id TEXT REFERENCES products(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,            -- 'sale', 'lost_sale', 'damaged_transit', 'expired_waste', 'markdown_sale'
    units INTEGER NOT NULL,
    unit_price NUMERIC(10,2) NOT NULL,
    rupee_impact NUMERIC(10,2) NOT NULL, -- Positive for revenue, negative for waste/lost sales
    is_baseline INTEGER NOT NULL DEFAULT 0 -- 0 = With Outpost, 1 = Without Outpost (Shadow Run)
);

-- Indexes for Oldest-First queries, lookup velocity, and shadow runs
CREATE INDEX IF NOT EXISTS idx_batches_store_product_status ON batches (store_id, product_id, status, expires_at ASC);
CREATE INDEX IF NOT EXISTS idx_demand_curves_lookup ON real_demand_curves (store_id, product_id, hour_of_day);
CREATE INDEX IF NOT EXISTS idx_van_transfers_status ON van_transfers (status);
CREATE INDEX IF NOT EXISTS idx_outcomes_ledger_baseline ON outcomes_ledger (is_baseline, event_type);
