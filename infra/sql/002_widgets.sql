-- Migration: 002_widgets.sql
CREATE TABLE IF NOT EXISTS widgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_widgets_business_id ON widgets(business_id);
