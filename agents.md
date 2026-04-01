# RepeatOS — AGENTS.md

This file is the authoritative context for any AI agent, coding assistant, or LLM working on this codebase. Read it fully before touching any file. Where a section is marked ⚠️ UNRESOLVED, do not implement that feature until the decision is documented here.

---

## What this project is

RepeatOS is a hospitality retention operating system for Nigerian restaurants, cafes, and bars. It tracks repeat customers, runs a points-based loyalty programme, captures orders through a branded widget, and gives business owners a real-time dashboard.

It is not a POS system. Payments are entirely outside RepeatOS. It is not a one-time setup — it is continuous infrastructure.

---

## The product in one paragraph

A customer walks into a cafe. They scan a QR code on the table. The QR opens the business's menu. A branded widget appears as an overlay. If it's their first time on this device, they enter their phone number — this creates a session stored on the device. Every subsequent scan on the same device skips the phone entry and goes straight to a welcome-back screen showing their points balance and reward progress. When they place an order through the widget (on RepeatOS-hosted menus) or the order is confirmed by staff, points are awarded automatically. At configured thresholds, Naira-denominated vouchers are unlocked. Vouchers expire after 30 days and have a minimum qualifying order and a maximum discount cap.

---

## Two menu integration modes

This is a hard architectural split. Every feature that touches the widget, the QR flow, or order capture must account for both modes.

**Mode A — RepeatOS-hosted menu page**
- Business has no existing website, or chooses to use RepeatOS as their menu host
- RepeatOS hosts a branded page at `[slug].repeatos.co`
- Widget is natively built into the page — no embed required
- Full order capture is available — customer browses menu, places order through the widget
- Points fire automatically on confirmed order

**Mode B — External site with widget overlay**
- Business has an existing website and an existing menu URL
- QR code links directly to their existing menu URL
- Widget is injected as an overlay via a `<script>` tag the business adds to their site
- The `businesses` table stores `menu_url` for this mode

⚠️ UNRESOLVED — Order capture scope for Mode B:
Whether the widget captures orders on externally-hosted sites or only tracks loyalty (points, rewards, visit context) without order placement is not yet decided. Do not implement order capture for Mode B until this is resolved. Build the widget overlay for Mode B as loyalty-only for now.

---

## Customer identification and session model

**First visit on a device:**
1. Customer scans QR → menu opens → widget overlay appears
2. Widget checks for an existing session (cookie or localStorage — see unresolved below)
3. No session found → widget shows phone entry form
4. Customer enters phone → backend looks up or creates customer record
5. Session is created and stored on the device
6. Widget shows points balance, reward progress, welcome screen

**Return visit on same device:**
1. Customer scans QR → menu opens → widget overlay appears
2. Widget reads session → identifies customer automatically
3. Widget shows "Welcome back" screen with points balance and reward progress
4. No phone entry required

⚠️ UNRESOLVED — Customer name:
Whether we capture a name on first registration (phone + name) or phone-only is not yet decided. The `customers` table currently has no `name` column. Do not add name capture to the widget registration flow until this is resolved. Build first-time registration as phone-only.

⚠️ UNRESOLVED — Session storage mechanism:
Whether the customer session is stored in a cookie (httpOnly, set by the API) or in localStorage (set by the widget JS) is not yet decided. The choice affects security posture and cross-subdomain behaviour. Do not implement session persistence until this is resolved. The widget can hold the identified customer in memory for the current page session only.

---

## Loyalty and points model

Points are Naira-denominated. They are awarded per confirmed order, not per scan.

**Example loyalty configuration (per business, stored in DB):**
```json
{
  "thresholds": [
    { "visits": "1-9", "reward": 50 },
    { "visits": 10,    "reward": 100 },
    { "visits": 15,    "reward": 150 }
  ],
  "expiry_days": 30,
  "min_order": 500,
  "max_discount_percent": 20
}
```

**Rules:**
- Points are awarded only on orders that meet `min_order` (₦500 minimum by default)
- Rewards are vouchers — not stored in a wallet, not transferable
- Vouchers expire after `expiry_days` days from issue
- Maximum discount per redemption is capped at `max_discount_percent`
- A business can configure their own thresholds — the config above is an example, not hardcoded

**Points ledger:** Every points transaction (award, redemption, expiry) is written to a `points_ledger` table. The customer's current balance is always computed from the ledger, never stored as a single mutable column. This is the correct pattern — it gives a full audit trail and makes balance reconciliation possible.

---

## Database schema

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Root tenant table
CREATE TABLE businesses (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 TEXT NOT NULL,
  slug                 TEXT UNIQUE NOT NULL,
  plan                 TEXT NOT NULL DEFAULT 'starter',
  integration_mode     TEXT NOT NULL DEFAULT 'hosted',   -- 'hosted' | 'external'
  menu_url             TEXT,                              -- populated for Mode B only
  allowed_origin       TEXT,                             -- CORS allowlist for widget requests
  loyalty_config       JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Admin dashboard users
CREATE TABLE admins (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- QR codes — one per location or campaign
CREATE TABLE qr_codes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  token       TEXT UNIQUE NOT NULL,
  label       TEXT,
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Customers — unique per phone per business
CREATE TABLE customers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  phone       TEXT NOT NULL,
  first_seen  TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(business_id, phone)
);

-- Immutable scan log
CREATE TABLE scans (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  customer_id UUID NOT NULL REFERENCES customers(id),
  qr_id       UUID NOT NULL REFERENCES qr_codes(id),
  scanned_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Orders — Mode A only until order capture for Mode B is resolved
CREATE TABLE orders (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  customer_id UUID NOT NULL REFERENCES customers(id),
  items       JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_kobo  INT NOT NULL,                              -- always in kobo, never Naira float
  status      TEXT NOT NULL DEFAULT 'pending',           -- pending | accepted | preparing | ready
  table_ref   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Points ledger — append only, never update or delete
CREATE TABLE points_ledger (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  customer_id UUID NOT NULL REFERENCES customers(id),
  order_id    UUID REFERENCES orders(id),               -- null for expiry or manual events
  type        TEXT NOT NULL,                             -- 'award' | 'redeem' | 'expire'
  amount      INT NOT NULL,                              -- positive for award, negative for redeem/expire
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Vouchers — issued when reward threshold is hit
CREATE TABLE vouchers (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id      UUID NOT NULL REFERENCES businesses(id),
  customer_id      UUID NOT NULL REFERENCES customers(id),
  code             TEXT UNIQUE NOT NULL,                 -- 8-char human-readable alphanumeric
  value_kobo       INT NOT NULL,
  min_order_kobo   INT NOT NULL,
  max_discount_pct INT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'active',       -- 'active' | 'redeemed' | 'expired'
  issued_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at       TIMESTAMPTZ NOT NULL,
  redeemed_at      TIMESTAMPTZ
);

-- Menu items — managed through dashboard, used for Mode A hosted pages
CREATE TABLE menu_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  price_kobo  INT NOT NULL,                              -- always in kobo
  category    TEXT,
  available   BOOLEAN NOT NULL DEFAULT true,
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE UNIQUE INDEX ON customers(business_id, phone);
CREATE INDEX ON qr_codes(token);
CREATE INDEX ON scans(customer_id, scanned_at DESC);
CREATE INDEX ON scans(business_id, scanned_at DESC);
CREATE INDEX ON orders(business_id, status);
CREATE INDEX ON orders(customer_id);
CREATE INDEX ON points_ledger(customer_id, created_at DESC);
CREATE INDEX ON points_ledger(business_id, created_at DESC);
CREATE INDEX ON vouchers(customer_id, status);
CREATE INDEX ON vouchers(code);
CREATE INDEX ON menu_items(business_id, available, sort_order);
```

**Money is always stored in kobo as an integer.** Never store Naira as a float. Never do float arithmetic on money. Divide by 100 only at the display layer.

---

## Monorepo structure

```
repeatos/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── db.ts                     # pg Pool singleton — import everywhere, never new Pool()
│   │   ├── plugins/
│   │   │   ├── auth.ts                   # authGuard preHandler
│   │   │   └── rateLimit.ts
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   ├── scan/                     # QR scan — resolves tenant from token
│   │   │   ├── customer/                 # registration, session, points balance
│   │   │   ├── order/                    # order creation, status updates
│   │   │   ├── points/                   # ledger writes, balance compute, voucher issue
│   │   │   ├── menu/                     # menu item CRUD
│   │   │   ├── qr/                       # QR generation
│   │   │   ├── voucher/                  # voucher validation and redemption
│   │   │   ├── dashboard/                # stats, order management, customer overview
│   │   │   └── business/                 # business config, onboarding
│   │   ├── middleware/
│   │   │   └── dashboardTenant.ts        # subdomain → business_id (dashboard routes only)
│   │   ├── jobs/
│   │   │   └── expireVouchers.ts         # cron: mark expired vouchers, write ledger rows
│   │   └── utils/
│   │       ├── loyaltyEngine.ts          # points calc, threshold check, voucher issue logic
│   │       └── money.ts                  # kobo ↔ naira conversion, display formatting
│   ├── migrations/
│   │   └── 001_init.sql
│   ├── .env
│   └── server.ts
├── frontend/
│   ├── app/
│   │   ├── [slug]/                       # Mode A hosted menu page
│   │   │   └── page.tsx
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   └── login/
│   │       └── page.tsx
│   └── widget-src/
│       └── widget.ts                     # compiled to widget.js — CDN distributed
└── AGENTS.md
```

---

## Two flows — never conflate them

**Flow 1 — Widget / customer flow**

Tenant resolved from QR token. Public endpoints. No auth header.

```
QR scan
  → menu opens (hosted page or external site)
  → widget loads
  → session check → phone entry (first time) or welcome back (returning)
  → customer identified
  → [Mode A] order placed → staff accepts → points awarded → voucher issued if threshold hit
  → widget shows updated balance and reward progress
```

**Flow 2 — Admin dashboard flow**

Tenant resolved from subdomain via `dashboardTenant` middleware. All routes JWT protected.

```
blisscafe.repeatos.co/dashboard
  → login → JWT issued with business_id
  → view and update order status
  → view customer points and vouchers
  → manage menu items
  → configure loyalty rules
  → view analytics (repeat rate, points issued, redemptions)
```

---

## Order status lifecycle

```
pending → accepted → preparing → ready
```

- `pending` — placed by customer, awaiting staff action
- `accepted` — staff confirmed. Points are awarded at this transition only
- `preparing` — kitchen is working on it
- `ready` — ready for collection or table service

Points are awarded when status transitions to `accepted`. Never on `pending`. An order that is never accepted must never award points.

⚠️ UNRESOLVED — Real-time order status to widget:
Whether status updates use WebSockets, Server-Sent Events, or client polling is not yet decided. Do not implement real-time delivery to the widget until resolved. Dashboard updates status via REST. Widget does not reflect status changes in real-time in v1.

---

## Points and voucher logic

**Awarding points — exact sequence:**
1. Order status transitions to `accepted`
2. Check `orders.total_kobo` meets `loyalty_config.min_order` for this business
3. Determine points to award from `loyalty_config.thresholds` based on customer's order count
4. Write row to `points_ledger`: `type = 'award'`, `amount = points`, `order_id = order.id`
5. Compute new balance: `SELECT COALESCE(SUM(amount), 0) FROM points_ledger WHERE customer_id = $1 AND business_id = $2`
6. Check if balance crosses a reward threshold from `loyalty_config`
7. If threshold crossed → issue voucher → write `type = 'redeem'` row to ledger

**Computing balance — always from ledger:**
```sql
SELECT COALESCE(SUM(amount), 0) AS balance
FROM points_ledger
WHERE customer_id = $1
AND business_id = $2
```
Never store or cache a running total. Never read balance from any other source.

**Issuing a voucher:**
1. Generate 8-character alphanumeric code — human readable, not a UUID
2. Insert into `vouchers` with values from `loyalty_config`
3. `expires_at = now() + interval '${expiry_days} days'`
4. `status = 'active'`

**Expiring vouchers (cron job — runs daily):**
1. Find all vouchers where `expires_at < now() AND status = 'active'`
2. Set `status = 'expired'`
3. Write `type = 'expire'` row to `points_ledger` with negative amount to reverse reserved points

---

## Invariants — never violate these

**1. business_id is never read from the request body in customer-facing routes.**
Derived from QR token (widget flow) or JWT (dashboard flow) only.

**2. Every DB query is scoped by business_id.**
No query without `WHERE business_id = $1`. No exceptions.

**3. scans and points_ledger are append-only.**
Never UPDATE or DELETE from these tables.

**4. Money is always stored in kobo as an integer.**
No floats anywhere in the stack until display. `₦500` = `50000` kobo.

**5. Points balance is always computed from the ledger.**
Never a mutable column. Always `SUM(amount) FROM points_ledger`.

**6. Customer upsert is always atomic.**
```sql
INSERT INTO customers (business_id, phone)
VALUES ($1, $2)
ON CONFLICT (business_id, phone)
DO UPDATE SET last_seen = now()
RETURNING *
```

**7. Points are awarded on `accepted` only.**
Never on `pending`, `preparing`, or `ready`.

**8. db.ts exports a single Pool instance.**
Never `new Pool()` anywhere else in the codebase.

**9. dashboardTenant middleware is never registered on customer-facing routes.**

**10. Voucher codes are 8-character human-readable alphanumeric strings.**
Not UUIDs. Staff need to be able to read and type them.

---

## Layer responsibilities

| Layer | Responsibility |
|---|---|
| `*.routes.ts` | Path, method, JSON schema validation only |
| `*.controller.ts` | Read req, call service, send reply. No SQL. |
| `*.service.ts` | All business logic and DB queries. No HTTP knowledge. |
| `src/utils/` | Pure functions. No DB. No HTTP. Fully testable in isolation. |
| `src/jobs/` | Scheduled cron tasks only |
| `src/middleware/` | Cross-cutting concerns, attaches context to req |

---

## Environment variables

```env
DATABASE_URL=postgresql://user:password@localhost:5432/repeatos
JWT_SECRET=minimum-32-character-secret-here
PORT=3001
FRONTEND_URL=https://repeatos.co
CDN_URL=https://cdn.repeatos.co
```

---

## Tech stack

| Concern | Choice |
|---|---|
| Backend framework | Fastify + TypeScript |
| Database | PostgreSQL via `pg` |
| Auth | `@fastify/jwt` + bcrypt |
| Rate limiting | `@fastify/rate-limit` |
| QR generation | `qrcode` |
| Frontend | Next.js App Router |
| Widget | Vanilla TypeScript → single compiled JS file |
| Cron | `node-cron` |
| Hosting | Railway |
| DNS | Cloudflare wildcard A record |

---

## Open questions — do not implement until resolved

| # | Question | Blocks |
|---|---|---|
| 1 | Customer name captured on registration? | `customers` schema, widget registration form |
| 2 | Session stored in httpOnly cookie or localStorage? | Security model, cross-subdomain behaviour |
| 3 | Order capture in Mode B (external sites)? | Widget scope for external embed |
| 4 | Real-time order status to widget — WebSockets, SSE, or polling? | Order module architecture |

Until resolved, implement as:
- Registration: phone only
- Session: in-memory for current page visit only
- Mode B widget: loyalty overlay only, no order capture
- Order status to widget: not implemented in v1

---

## Post-MVP — do not implement

- Streak-based bonus points
- VIP membership tiers
- Referral tracking
- Cross-business rewards network
- Advanced segmentation and predictive analytics
- Campaign tools
- Paystack or Stripe billing integration

---

## Onboarding a new business (SQL — until self-serve UI is built)

```sql
-- loyalty_config values are in kobo
INSERT INTO businesses (name, slug, plan, integration_mode, loyalty_config)
VALUES (
  'Bliss Cafe', 'blisscafe', 'starter', 'hosted',
  '{
    "thresholds": [
      { "visits": "1-9", "reward": 5000 },
      { "visits": 10,    "reward": 10000 },
      { "visits": 15,    "reward": 15000 }
    ],
    "expiry_days": 30,
    "min_order": 50000,
    "max_discount_percent": 20
  }'::jsonb
);

INSERT INTO admins (business_id, email, password_hash)
VALUES ('<uuid>', 'owner@blisscafe.com', '<bcrypt_hash>');

-- Then POST /qr/generate with admin JWT to get QR code
```

---

## Common mistakes to avoid

**Do not award points on `pending` orders.** Points fire on `accepted` only.

**Do not store money as a float.** All money is INT in kobo.

**Do not compute balance from a cached column.** Always query `points_ledger`.

**Do not write UPDATE or DELETE on `scans` or `points_ledger`.** Append only.

**Do not read `business_id` from customer-facing request bodies.** Always server-side from token or JWT.

**Do not use UUIDs as voucher codes.** 8-char alphanumeric only.

**Do not implement the four unresolved features.** Stub with a comment referencing this file.

**Do not implement post-MVP features.** If you think something is a good idea and it is not in this file, it is probably post-MVP. Ask before building it.