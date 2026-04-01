# RepeatOS Modular Architecture Blueprint

This document defines a clean modular architecture for the RepeatOS check-in project so implementation remains maintainable as features grow.

## Design Principles

- Keep the scan path small, deterministic, and testable.
- Separate domain rules from transport/web framework details.
- Keep tenant security invariants enforced in one place.
- Make each module replaceable without rewriting the system.
- Prefer explicit contracts over implicit shared state.
- Separate consumer (public widget) and admin (authenticated dashboard) concerns.

## Top-Level Modules

## Product Sections (First-Class Boundary)

- **Consumer section**
  - `widget-sdk` + `scan-api` contracts
  - optimized for fast check-in and low-latency write path
- **Admin section**
  - `admin-backoffice` + analytics APIs
  - optimized for configuration and reporting

Both sections reuse shared domain modules, but do not share UI logic or access-control assumptions.

## 1) `widget-sdk` (Embeddable Frontend)

### Responsibilities

- Boot from `window.REPEATOS_CONFIG`
- Render check-in UI state machine
- Validate/normalize user input for UX only
- Call public API endpoint
- Render success/error outcomes

### Must Not Do

- Decide tenant identity
- Store persistent customer identity/session
- Implement reward logic beyond display

### Public Contract

- Input: `REPEATOS_CONFIG`
- Output: DOM rendering + `POST /scan` calls

## 2) `scan-api` (HTTP Edge Layer)

### Responsibilities

- Parse/validate request payload
- Resolve token to business context
- Enforce origin and abuse controls
- Invoke domain use-case
- Return API response shape

### Must Not Do

- Embed SQL directly for business logic orchestration
- Contain widget presentation decisions

### Public Contract

- Endpoint: `POST /scan`
- Request: `{ token, phone }`
- Response: `{ visit_count, reward }`

## 3) `checkin-domain` (Core Business Logic)

### Responsibilities

- Own check-in use-case orchestration
- Enforce invariants:
  - business derived from token
  - cooldown checks
  - visit increment rules
  - reward resolution
- Define domain errors (`INVALID_TOKEN`, `COOLDOWN_ACTIVE`, etc.)

### Must Not Do

- Know HTTP headers or Fastify/Express specifics
- Know SQL table details

### Public Contract

- Use-case API:
  - `executeCheckin({ token, phone, origin, requestMeta })`
- Result:
  - success payload or typed domain error

## 4) `anti-abuse` (Policy Module)

### Responsibilities

- Global request throttling policy adapter
- Per-customer cooldown policy
- Per-token/per-business anomaly hooks (future)

### Must Not Do

- Mutate customer visit counts

### Public Contract

- `assertAllowed(context): void | AbuseError`

## 5) `tenant-security` (Isolation Module)

### Responsibilities

- Resolve token to tenant (`business_id`)
- Validate origin allowlist for tenant
- Guarantee no client-provided tenant override

### Must Not Do

- Handle reward or visit logic

### Public Contract

- `resolveTenantFromToken(token): TenantContext | null`
- `assertOriginAllowed(tenantContext, origin): void | SecurityError`

## 6) `loyalty-engine` (Rewards Module)

### Responsibilities

- Resolve reward outcome for `(business_id, visit_count)`
- Keep rules data-driven from DB state

### Must Not Do

- Trigger UI messaging directly

### Public Contract

- `resolveReward({ businessId, visitCount }): Reward | null`

## 7) `customer-ledger` (Visit Accounting Module)

### Responsibilities

- Atomic customer upsert/increment
- Append-only scan event write
- Reconciliation primitives from scan history (future)

### Must Not Do

- Apply origin policy decisions

### Public Contract

- `recordCheckin({ businessId, phone, requestMeta }): { customerId, visitCount, scanId }`

## 8) `data-access` (Repository Layer)

### Responsibilities

- Own SQL and transaction boundaries
- Expose repository interfaces to domain modules
- Centralize query tuning and indexing assumptions

### Must Not Do

- Encode cross-module orchestration policy

### Public Contract (examples)

- `QrCodeRepo.findActiveByToken(token)`
- `CustomerRepo.upsertVisit(businessId, normalizedPhone, tx)`
- `ScanRepo.insert(scanRecord, tx)`
- `RewardRepo.findByVisitCount(businessId, visitCount)`

## 9) `observability` (Logging/Metrics/Tracing)

### Responsibilities

- Emit structured events for scan lifecycle
- Emit counters/timers for success, failures, cooldowns, latency
- Attach correlation/request IDs

### Must Not Do

- Own business decisions

## 10) `admin-backoffice` (Vendor Operations Surface)

### Responsibilities

- Manage allowed origins
- Manage rewards and active flags
- Manage QR lifecycle (create/deactivate/rotate)

### Must Not Do

- Bypass domain invariants used by scan flow

## 11) `analytics-read-model` (Dashboard Data Module)

### Responsibilities

- Build and serve reporting-friendly aggregates from scan events
- Keep expensive aggregations off the scan hot path
- Provide stable metric definitions for dashboard widgets

### Must Not Do

- Block or slow `POST /scan` write path
- Mutate customer visit counts

### Public Contract

- `getScanVolume({ businessId, from, to, granularity })`
- `getUniqueCustomers({ businessId, from, to })`
- `getRewardConversion({ businessId, from, to })`
- `getFailureBreakdown({ businessId, from, to })`

## Recommended Runtime Flow by Module

1. `widget-sdk` sends `POST /scan`
2. `scan-api` validates payload format
3. `tenant-security` resolves token -> tenant and validates origin
4. `anti-abuse` enforces throttling/cooldown policies
5. `checkin-domain` orchestrates business use-case
6. `customer-ledger` performs transactional visit record updates via `data-access`
7. `loyalty-engine` resolves reward
8. `observability` emits outcome metrics/logs
9. `scan-api` returns response
10. `widget-sdk` renders state

Admin analytics flow:

1. `admin-backoffice` requests dashboard metrics
2. analytics API layer validates admin auth + tenant scope
3. `analytics-read-model` returns pre-aggregated/optimized results
4. `admin-backoffice` renders charts/tables/cards

## Module Boundaries and Dependency Rules

- `widget-sdk` -> `scan-api` only
- `scan-api` -> `checkin-domain`, `tenant-security`, `anti-abuse`, `observability`
- `checkin-domain` -> interfaces only (implemented by `data-access`, `loyalty-engine`, `customer-ledger`)
- `data-access` depends on DB/ORM driver, never on widget or HTTP
- `admin-backoffice` reuses shared domain services; no duplicate rules
- Admin analytics queries should go through `analytics-read-model`, not direct raw scan queries from UI handlers.

Rule of thumb: dependencies point inward toward domain contracts, not outward toward frameworks.

## Suggested Monorepo Package Layout

```text
apps/
  api/
  widget/
  admin/
packages/
  domain-checkin/
  tenant-security/
  anti-abuse/
  loyalty-engine/
  customer-ledger/
  data-access/
  analytics-read-model/
  shared-types/
  observability/
infra/
  migrations/
  dashboards/
```

## Module APIs (Type-Level Sketch)

```ts
// shared-types
export type ScanRequest = { token: string; phone: string };
export type ScanResponse = { visit_count: number; reward: { label: string } | null };

export type TenantContext = { businessId: string; allowedOrigins: string[] };

export type CheckinResult = {
  visitCount: number;
  reward: { label: string } | null;
};
```

```ts
// domain-checkin
export interface CheckinUseCase {
  execute(input: {
    token: string;
    phone: string;
    origin: string;
    ip?: string;
    userAgent?: string;
  }): Promise<CheckinResult>;
}
```

## Module-by-Module MVP Priority

### P0 (must-have)

- `scan-api`
- `tenant-security`
- `checkin-domain`
- `customer-ledger`
- `data-access`
- `widget-sdk`

### P1 (launch-hardening)

- `anti-abuse` expansion (per-token/business rules)
- `observability` dashboards + alerts
- `admin-backoffice` origin and QR operations polish
- `analytics-read-model` with dashboard endpoints and rollups

### P2 (post-MVP)

- richer `loyalty-engine` rule DSL
- idempotency module with replay-safe keys
- analytics read models

## Architectural Pitfalls to Avoid

- Letting route handlers grow into business logic classes
- Repeating tenant derivation logic across multiple files
- Mixing policy checks with SQL code in ad hoc ways
- Sharing mutable state between requests
- Encoding reward text or thresholds in widget code
- Running heavy dashboard aggregations directly on hot scan tables in request time

## Definition of Properly Architected (Project Bar)

- One place for tenant derivation and origin policy
- One place for check-in use-case orchestration
- One place for data writes with clear transaction boundaries
- Widget remains a thin client over stable API contract
- New features land as new modules or extensions, not rewrites
