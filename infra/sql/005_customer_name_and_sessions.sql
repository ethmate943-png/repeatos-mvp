-- Migration: 005_customer_name_and_sessions.sql
-- Adds customer name capture and an opaque customer_sessions table for
-- device-based recognition in Mode B widget overlay.

-- 1) Add customer name (captured on first-time check-in)
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS name TEXT;

-- 2) Customer sessions
-- Widget stores `customer_sessions.id` in localStorage (opaque).
-- Backend resolves session -> (business_id, customer_id, phone).
CREATE TABLE IF NOT EXISTS customer_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_sessions_business_id
  ON customer_sessions(business_id);

CREATE INDEX IF NOT EXISTS idx_customer_sessions_customer_id
  ON customer_sessions(customer_id);

