CREATE TABLE IF NOT EXISTS businesses (
  id UUID PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  allowed_origins TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS qr_codes (
  id UUID PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  visit_count INTEGER NOT NULL DEFAULT 0,
  last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (business_id, phone)
);

CREATE TABLE IF NOT EXISTS scans (
  id UUID PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  token TEXT NOT NULL,
  visit_count INTEGER NOT NULL,
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip TEXT,
  user_agent TEXT
);

CREATE TABLE IF NOT EXISTS rewards (
  id UUID PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  visits_required INTEGER NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_qr_codes_token ON qr_codes(token);
CREATE INDEX IF NOT EXISTS idx_scans_customer_scanned_at ON scans(customer_id, scanned_at DESC);
CREATE INDEX IF NOT EXISTS idx_scans_business_scanned_at ON scans(business_id, scanned_at DESC);
CREATE INDEX IF NOT EXISTS idx_rewards_business_visits_active ON rewards(business_id, visits_required, active);
