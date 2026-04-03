-- Migration: 006_tiered_loyalty.sql
-- Tiered credit loyalty: ledger expiry, default loyalty_config shape, name index.
-- Customer `name` is added in 005_customer_name_and_sessions.sql.

-- 1) Default tiered loyalty_config (kobo). Migrate empty or legacy configs without `tiers`.
UPDATE businesses
SET loyalty_config = '{
  "tiers": [
    { "from": 1,  "to": 3,    "credits_kobo": 5000  },
    { "from": 4,  "to": 10,   "credits_kobo": 10000 },
    { "from": 11, "to": null, "credits_kobo": 15000 }
  ],
  "min_redemption_kobo": 50000,
  "max_discount_pct": 20,
  "expiry_days": 30
}'::jsonb
WHERE loyalty_config IS NULL
   OR loyalty_config = '{}'::jsonb
   OR NOT (loyalty_config ? 'tiers');

-- 2) Dashboard search on customer name
CREATE INDEX IF NOT EXISTS idx_customers_name
  ON customers(business_id, name);

-- 3) Per-row credit expiry on awards
ALTER TABLE points_ledger
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

UPDATE points_ledger
SET expires_at = created_at + interval '30 days'
WHERE expires_at IS NULL
  AND type = 'award';

-- 4) Admins (staff) — was missing from earlier migrations; required for POST /admin/users
CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (business_id, email)
);
CREATE INDEX IF NOT EXISTS idx_admins_business_id ON admins(business_id);
