-- Migration: 004_points_config.sql
-- Seed default loyalty_config for businesses that still have an empty config.
--
-- All "points" and "value_kobo" values are stored in kobo units.
-- ₦50 = 5000 kobo.

UPDATE businesses
SET loyalty_config = '{
  "points_per_visit": 5000,
  "thresholds": [
    { "points": 25000, "value_kobo": 5000, "label": "Free Coffee" },
    { "points": 50000, "value_kobo": 10000, "label": "₦100 voucher" },
    { "points": 75000, "value_kobo": 15000, "label": "₦150 voucher" }
  ],
  "expiry_days": 30,
  "min_order_kobo": 50000,
  "max_discount_pct": 20
}'::jsonb
WHERE loyalty_config = '{}'::jsonb;

