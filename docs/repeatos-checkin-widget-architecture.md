# RepeatOS Check-in Widget Architecture Reference

This document is the implementation reference for the RepeatOS check-in widget MVP. It captures the architectural decisions, constraints, and execution flow needed to start building with confidence.

## 1) Purpose and Scope

The widget flow is intentionally simple for end users:

1. Scan QR
2. Enter phone
3. See updated visit count and reward progress

The underlying system is not trivial because it is:

- Public-facing
- Multi-tenant
- Embeddable in third-party websites we do not control
- Abuse-sensitive (visit farming / scripted traffic)

This architecture optimizes for MVP speed, correctness, and low integration friction while leaving clear hardening paths for post-MVP.

## 1.1) Product Surface Separation (Important)

RepeatOS has two distinct product surfaces and they should be designed separately:

- **Consumer surface (widget)**
  - Public, no-login flow for customer check-in.
  - Optimized for speed and minimal friction.
  - Very limited UI and state.
- **Admin surface (dashboard)**
  - Authenticated business operator experience.
  - Used to configure rewards, manage QR tokens/origins, and review analytics.
  - Higher data density, filters, reporting, and operations actions.

These surfaces can share backend domain modules, but they must not share UI assumptions or security models.

## 2) System Actors and Boundaries

- **RepeatOS**
  - Owns API, database, widget bundle, CDN, and infrastructure controls.
- **Vendor (business)**
  - Embeds the widget script and injects config.
  - Does not run RepeatOS backend logic.
- **Customer**
  - Scans QR and submits phone.
  - No account, no login, no app.
- **QR code**
  - Physical trust anchor that carries a token mapping to one business context.

### Boundary Principle

Client input is untrusted. Vendor input is also untrusted for authorization.  
`business_id` must always be derived server-side from QR token lookup.

## 3) Embed Architecture

### Integration Contract

Vendors include:

- `window.REPEATOS_CONFIG` (token + optional display settings)
- CDN script `widget.js`
- Render target container (`#repeatos-widget`)

### Why script embed (not iframe)

- Direct DOM rendering in host page
- Synchronous config via global object
- Easier vendor theming/branding
- Lower integration complexity than iframe + `postMessage`

Tradeoff:

- Host page can mutate DOM/client behavior
- Mitigation: server validates all critical state and tenant scope

### Why config object over direct URL parsing in widget

- Keeps contract explicit between vendor backend and widget
- Supports SSR token injection
- Keeps non-essential display values out of query parameters

### Single bundle for all businesses

- High CDN cache efficiency
- One deploy updates all tenants
- No per-business build pipeline

## 4) API Architecture (`POST /scan`)

Single public endpoint handles scan/check-in flow.

### Required Request Payload

- `token: string`
- `phone: string`

No `business_id` accepted from client for authorization decisions.

### Response Shape

- `{ visit_count: number, reward: { label: string } | null }`

UI interpretation stays in widget; API stays presentation-agnostic.

### Execution Flow (authoritative order)

1. Parse/validate input shape
2. Lookup token in `qr_codes` and derive `business_id`
3. Validate origin against business allowlist
4. Enforce anti-abuse rules
5. Upsert customer visit count
6. Append scan log entry
7. Resolve reward match for returned `visit_count`
8. Return minimal response payload

## 5) Database Architecture

Single shared PostgreSQL database with tenant isolation enforced in query design.

### Tables and Responsibilities

- `businesses`
  - Tenant root record
  - Slug, plan tier, allowed origin(s)
- `admins`
  - Dashboard users per business
  - Password hashes only
- `qr_codes`
  - Token to business mapping
  - Activation flag
- `customers`
  - Unique customer identity per business (`business_id + phone`)
  - Denormalized `visit_count`
- `scans`
  - Append-only scan log for audit + analytics + anti-fraud
- `rewards`
  - Data-driven loyalty triggers (`visits_required`, `active`)

### Index Baseline (must exist before production traffic)

- `UNIQUE customers(business_id, phone)` (upsert correctness)
- `UNIQUE qr_codes(token)` (fast + unambiguous token lookup)
- `INDEX scans(customer_id, scanned_at DESC)` (cooldown check)
- `INDEX scans(business_id, scanned_at DESC)` (tenant analytics)
- Optional growth index: `INDEX rewards(business_id, visits_required, active)`

## 6) Core Invariants (Do Not Break)

1. `business_id` is derived from token, never trusted from client
2. Customer uniqueness is scoped by `(business_id, phone)`
3. `scans` remains append-only
4. Reward resolution is data-driven from DB, not hardcoded in UI
5. Widget has no persisted customer auth/session state

## 7) Security and Abuse Model

### Current Model

- QR token acts as scoped bearer credential
- Origin allowlist reduces casual cloning from unregistered domains
- Global IP rate limit protects infrastructure
- Per-customer cooldown protects loyalty economics

### Important Limitations

- CORS does not stop server-side scripted abuse
- Token leakage risk exists when tokens appear in URLs/logs/referrers
- Phone identity can fragment without normalization

## 8) Widget State Machine

```text
idle -> loading -> success
               \-> error
```

- `idle`: input editable, submit enabled
- `loading`: request in flight, submit disabled
- `success`: render visit/reward progress; allow reset for next customer
- `error`: render actionable error and allow retry

Design choice: no remembered session/auth/persistence between page loads.

## 9) Scalability Characteristics

- API tier is stateless and horizontally scalable
- DB is single source of shared state
- Hot-path queries are index-backed
- Widget bundle is static CDN asset with high cacheability

Primary future pressure points:

- Cooldown checks at very high write volume
- Token abuse patterns
- Reward rule complexity growth

## 9.1) Analytics Architecture (Dashboard-Focused)

Analytics is primarily an **admin concern** and should be modeled as a separate read path from the consumer check-in flow.

### Why separate analytics from scan writes

- Prevent dashboard queries from slowing scan endpoint latency.
- Enable richer aggregations (daily/weekly cohorts, reward conversion, top hours) without coupling to hot write path.
- Keep scan endpoint deterministic and small.

### Recommended analytics pattern

- `scans` remains source-of-truth event log.
- Build admin-facing analytics read models from `scans`:
  - either SQL views/materialized views
  - or scheduled rollups into summary tables.
- Dashboard API reads from rollups/read models, not from heavy ad hoc queries on raw scan events.

### Initial dashboard metrics

- scans per day/week/month
- unique customers by time window
- reward trigger count/rate
- repeat rate (returning vs first-time within period)
- P95 scan latency and rejection reasons (`429`, invalid token, origin blocked)

## 10) Recommended v1.1 Hardening (After MVP Baseline)

1. Add idempotency key support on `POST /scan` to suppress duplicate increments
2. Wrap upsert + scan insert + reward lookup in one DB transaction
3. Add token rotation/expiry strategy
4. Normalize phone inputs server-side (permissive but consistent)
5. Add per-token and per-business abuse detection limits
6. Add metrics for cooldown hits, token spikes, reward hit rates, and 4xx reasons

## 11) End-to-End Lifecycle (Reference)

1. Customer scans QR URL containing token
2. Vendor backend injects token into widget config
3. Browser loads RepeatOS widget bundle from CDN
4. Widget renders in vendor page container
5. Customer submits phone
6. Widget posts `{ token, phone }` to RepeatOS API
7. API derives business context from token and validates origin
8. API enforces anti-abuse checks
9. API updates customer visit count atomically
10. API appends scan record
11. API resolves reward rule for new count
12. Widget renders progress and reward outcome

## 12) Implementation Kickoff Checklist

- [ ] Create database schema + indexes from sections above
- [ ] Implement `POST /scan` with invariant-safe flow
- [ ] Add global and per-customer throttling
- [ ] Build embeddable widget bootstrap (`window.REPEATOS_CONFIG`)
- [ ] Implement widget state machine and response rendering
- [ ] Add tenant origin allowlist management in admin flow
- [ ] Add structured logs and metrics for scan pipeline
- [ ] Create analytics read model for admin dashboard metrics
- [ ] Build admin analytics endpoint(s) separate from `POST /scan`
- [ ] Run basic load and abuse simulation before pilot rollout

