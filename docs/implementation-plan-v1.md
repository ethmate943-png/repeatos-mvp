# RepeatOS Check-in Widget v1 Implementation Plan

This plan turns the architecture into an execution sequence with clear deliverables, exit criteria, and dependency order.

## Module-by-Module Execution Order

This is the concrete implementation order by module so teams can work in parallel without breaking architecture boundaries.

1. **`data-access`**
   - Implement DB client wiring, migrations runner, repositories.
   - This unblocks all domain modules.
2. **`tenant-security`**
   - Token lookup and origin allowlist enforcement.
   - Core isolation invariant lands early.
3. **`customer-ledger`**
   - Atomic visit upsert + scan append logic.
   - Depends on `data-access`.
4. **`loyalty-engine`**
   - Reward resolution by `(business_id, visit_count)`.
5. **`anti-abuse`**
   - Per-customer cooldown, then per-token/per-business throttles.
6. **`checkin-domain`**
   - Orchestration layer calling modules 2-5 in order.
7. **`scan-api`**
   - Route validation, error mapping, request metadata capture.
8. **`widget-sdk`**
   - Public consumer flow and state machine integration with `/scan`.
9. **`analytics-read-model`**
   - Admin dashboard rollups/views and fast read endpoints.
10. **`admin-backoffice`**
    - Authenticated management UI and analytics screens.
11. **`observability`**
    - Structured logs, metrics, and alerting across all modules.

### Parallelization Guidance

- `widget-sdk` can start once `/scan` contract is stable (after module 7).
- `analytics-read-model` can begin as soon as scan writes are finalized (after module 3).
- `admin-backoffice` can start against mocked analytics responses, then bind to real endpoints.

## Phase 0: Foundation and Repo Conventions

### Goals

- Establish project structure, env contracts, and baseline tooling before feature work.

### Deliverables

- Environment contract documented (`API`, `DB`, `CDN`, `WIDGET_ORIGIN` variables)
- Shared error format and response conventions
- Logging format + request correlation ID strategy
- Migration workflow agreed (`dev`, `staging`, `prod`)

### Exit Criteria

- Engineers can run API + DB locally with one documented flow.
- CI can run lint/typecheck/test placeholders successfully.

## Phase 1: Database Schema and Indexes

### Goals

- Create all MVP tables and indexes with tenant-safe constraints.

### Deliverables

- Tables: `businesses`, `admins`, `qr_codes`, `customers`, `scans`, `rewards`
- Constraints:
  - `UNIQUE(customers.business_id, customers.phone)`
  - `UNIQUE(qr_codes.token)`
- Indexes:
  - `scans(customer_id, scanned_at DESC)`
  - `scans(business_id, scanned_at DESC)`
  - optional `rewards(business_id, visits_required, active)`
- Seed script for one test business + QR + reward rule

### Exit Criteria

- Migrations run clean in local and staging environments.
- Seeded business can be queried end-to-end for scan simulation.

## Phase 2: Core Scan Endpoint (`POST /scan`)

### Goals

- Implement the invariant-safe scan flow in a single route.

### Deliverables

- Request validation for `{ token, phone }`
- Token lookup in `qr_codes` with active check
- Derive `business_id` from token (never from client)
- Origin validation against business allowlist
- Anti-abuse:
  - Global IP rate-limit middleware
  - Per-customer cooldown check
- Atomic customer upsert using DB constraint
- Scan append log write
- Reward resolution by `visits_required = visit_count`
- Response: `{ visit_count, reward }`

### Exit Criteria

- Happy path, cooldown path, invalid token, invalid origin, and generic error paths covered by tests.
- No duplicate customer rows under concurrent same-phone requests.

## Phase 3: Widget Bootstrap and Rendering

### Goals

- Deliver embeddable widget that reads host config and renders core flow.

### Deliverables

- Bootstrap reads `window.REPEATOS_CONFIG`
- Container discovery (`#repeatos-widget`) with clear fallback error
- State machine implementation: `idle -> loading -> success/error`
- API client call to `/scan`
- UI output:
  - visit count
  - reward banner (if any)
  - progress dots/bar
  - error messaging by status code (`404`, `429`, network fallback)
- "Done" reset path for next customer

### Exit Criteria

- Widget works in a plain HTML host page with only script + config + container.
- Retry behavior works without full-page reload.

## Phase 4: Vendor Integration Contract

### Goals

- Make third-party integration deterministic and supportable.

### Deliverables

- Vendor integration doc with exact snippet and required fields
- Config schema for:
  - `token`
  - optional business display labels
- CORS allowlist admin flow for registered vendor origins
- Staging validation checklist for new vendor onboarding

### Exit Criteria

- A new vendor can self-integrate from docs and pass checklist with no engineer intervention.

## Phase 5: Observability and Ops Readiness

### Goals

- Make production behavior visible and debuggable before launch.

### Deliverables

- Structured logs for each scan attempt with reasoned outcomes
- Metrics:
  - scans accepted/rejected
  - cooldown hits
  - invalid token rate
  - origin rejection rate
  - reward trigger rate
- Basic dashboards and alert thresholds

### Exit Criteria

- On-call can answer "why did this scan fail?" from logs and metrics within minutes.

## Phase 6: Security and Abuse Hardening (Post-MVP but pre-scale)

### Goals

- Add low-complexity protections for practical abuse patterns.

### Deliverables

- Phone normalization strategy (permissive but canonicalized)
- Idempotency key support to absorb retries
- Per-token and per-business throttles
- Token lifecycle controls (deactivate/rotate operational playbook)

### Exit Criteria

- Duplicate submissions from retries do not inflate counts.
- Token abuse blast radius is reduced and observable.

## Test Strategy by Layer

- **DB tests**
  - migration integrity
  - uniqueness/constraint behavior
  - concurrent upsert correctness
- **API tests**
  - request validation matrix
  - CORS/origin enforcement
  - cooldown and reward logic
- **Widget tests**
  - state transitions
  - error rendering behavior
  - host config parsing
- **End-to-end smoke**
  - seeded token + phone check-in from hosted test page

## Suggested Build Order (2-Week MVP cadence)

1. Phase 1 (schema/indexes)
2. Phase 2 (scan endpoint)
3. Phase 3 (widget)
4. Phase 4 (vendor docs + onboarding)
5. Phase 5 (observability baseline)

Keep Phase 6 partially parallelized as lightweight follow-up tasks once first pilot traffic starts.

## Definition of Done (MVP)

- One vendor can embed widget and complete scans in production-like staging.
- Data remains tenant-isolated and concurrency-safe.
- Core failure modes produce deterministic user feedback.
- Basic abuse and rate limits are active.
- Operational team can monitor and debug live behavior.
