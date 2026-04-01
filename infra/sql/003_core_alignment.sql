-- Migration: 003_core_alignment.sql

-- 1. Align businesses table
ALTER TABLE businesses 
  ADD COLUMN IF NOT EXISTS integration_mode TEXT NOT NULL DEFAULT 'hosted',
  ADD COLUMN IF NOT EXISTS menu_url TEXT,
  ADD COLUMN IF NOT EXISTS loyalty_config JSONB NOT NULL DEFAULT '{}'::jsonb;

-- 2. Align customers table
ALTER TABLE customers DROP COLUMN IF EXISTS visit_count;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'created_at'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'first_seen'
  ) THEN
    ALTER TABLE customers RENAME COLUMN created_at TO first_seen;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'first_seen'
  ) THEN
    ALTER TABLE customers ADD COLUMN first_seen TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;
END $$;

-- 3. Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  customer_id UUID NOT NULL REFERENCES customers(id),
  items       JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_kobo  INT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending', -- pending | accepted | preparing | ready
  table_ref   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Create points_ledger table
CREATE TABLE IF NOT EXISTS points_ledger (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  customer_id UUID NOT NULL REFERENCES customers(id),
  order_id    UUID REFERENCES orders(id),
  type        TEXT NOT NULL, -- 'award' | 'redeem' | 'expire'
  amount      INT NOT NULL,
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Create vouchers table
CREATE TABLE IF NOT EXISTS vouchers (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id      UUID NOT NULL REFERENCES businesses(id),
  customer_id      UUID NOT NULL REFERENCES customers(id),
  code             TEXT UNIQUE NOT NULL, -- 8-char alphanumeric
  value_kobo       INT NOT NULL,
  min_order_kobo   INT NOT NULL,
  max_discount_pct INT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'active', -- 'active' | 'redeemed' | 'expired'
  issued_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at       TIMESTAMPTZ NOT NULL,
  redeemed_at      TIMESTAMPTZ
);

-- 6. Create menu_items table
CREATE TABLE IF NOT EXISTS menu_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  price_kobo  INT NOT NULL,
  category    TEXT,
  available   BOOLEAN NOT NULL DEFAULT true,
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Indexes
CREATE INDEX IF NOT EXISTS idx_orders_business_status ON orders(business_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_points_ledger_customer_created ON points_ledger(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_points_ledger_business_created ON points_ledger(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vouchers_customer_status ON vouchers(customer_id, status);
CREATE INDEX IF NOT EXISTS idx_vouchers_code ON vouchers(code);
CREATE INDEX IF NOT EXISTS idx_menu_items_business_sort ON menu_items(business_id, available, sort_order);
