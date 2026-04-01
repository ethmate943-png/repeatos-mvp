INSERT INTO businesses (id, slug, name, allowed_origins)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'bliss-cafe',
  'Bliss Cafe',
  ARRAY['http://localhost:3000', 'http://localhost:4000', 'http://localhost:5173', 'https://blisscafe.com', 'https://frequent-ronnica-ethname-9bccfe51.koyeb.app']
)
ON CONFLICT (id) DO UPDATE SET allowed_origins = EXCLUDED.allowed_origins;

INSERT INTO qr_codes (id, business_id, token, active)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'demo-token-1234',
  TRUE
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO rewards (id, business_id, label, visits_required, active)
VALUES (
  '33333333-3333-3333-3333-333333333333',
  '11111111-1111-1111-1111-111111111111',
  'Free Coffee',
  5,
  TRUE
)
ON CONFLICT (id) DO NOTHING;
