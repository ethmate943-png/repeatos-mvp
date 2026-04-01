# RepeatOS Environment Setup

This is the baseline environment contract for local development and staging parity.

## 1) Required Services

- PostgreSQL (primary database, Neon for cloud environments)
- Redis (rate-limit and future cache/idempotency support)

### Neon (recommended now)

1. Create a Neon project and database.
2. Copy the pooled connection string into `apps/api/.env` as `DATABASE_URL`.
3. Ensure SSL mode is required (`sslmode=require`) in the URL.

Example:

```env
DATABASE_URL=postgresql://<user>:<password>@<host>/<db>?sslmode=require
```

## 2) Local Infrastructure Boot (optional for non-Neon local dev)

From repo root:

```bash
cp infra/.env.example infra/.env
docker compose --env-file infra/.env -f infra/docker-compose.yml up -d
```

Check services:

```bash
docker compose --env-file infra/.env -f infra/docker-compose.yml ps
```

## 3) API Environment (`apps/api/.env`)

Start from:

```bash
cp apps/api/.env.example apps/api/.env
```

Variables:

- `PORT` - API port (default `4000`)
- `NODE_ENV` - runtime mode (`development`, `test`, `production`)
- `ADMIN_API_KEY` - key for admin analytics endpoints
- `DATABASE_URL` - Postgres/Neon connection string
- `REDIS_URL` - Redis connection string
- `RATE_LIMIT_MAX_PER_MINUTE` - global request throttle cap
- `SCAN_COOLDOWN_SECONDS` - per-customer cooldown window
- `LOG_LEVEL` - logger verbosity (`info`, `debug`, etc.)
- `WIDGET_ALLOWED_ORIGINS` - comma-separated fallback origins for local testing

## 4) Widget Environment (`apps/widget/.env`)

Start from:

```bash
cp apps/widget/.env.example apps/widget/.env
```

Variables:

- `WIDGET_API_BASE_URL` - scan API base URL
- `WIDGET_CDN_BASE_URL` - asset/CDN base URL for widget runtime
- `WIDGET_ENV` - environment label for build/runtime

## 5) Web/Admin Environment (`apps/web/.env`)

Start from:

```bash
cp apps/web/.env.example apps/web/.env
```

Variables:

- `WEB_API_BASE_URL` - API base URL
- `WEB_ADMIN_API_KEY` - admin API key for local dashboard requests
- `WEB_ENV` - environment label

## 6) Infrastructure Env (`infra/.env`)

- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_PORT`
- `REDIS_PORT`

## 7) Recommended Secrets Policy

- Never commit `.env` files.
- Commit only `.env.example`.
- Use distinct credentials per environment.
- Rotate `ADMIN_API_KEY` per deployment environment.

## 8) Quick Start Checklist

- [ ] Configure Neon `DATABASE_URL` (or boot local Postgres via Docker compose)
- [ ] Create all app `.env` files from examples
- [ ] Run SQL migrations in `infra/sql` (init then seed)
- [ ] Run API type-check and boot API server
- [ ] Verify `/health`, `/scan`, and `/admin/analytics/summary`
