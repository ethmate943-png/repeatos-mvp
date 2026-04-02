# Koyeb MVP Runbook (RepeatOS)

## What this repo is (MVP basis)

- A single Fastify API powers:
  - `POST /scan` (public check-in endpoint)
  - Admin routes (e.g. analytics summary)
- A single embeddable widget (`/public/widget.iife.js`) calls `POST /scan` in the browser.
- Multi-tenancy is enforced by tenant resolution from `token -> business_id` and every query is scoped by `business_id`.

## Why deployments previously failed (and what’s fixed)

### 1) Broken git submodule
- Symptom: Koyeb clone/build error: `fatal: No url found for submodule path 'apps/web' in .gitmodules`
- Fix: Removed the broken submodule reference so `apps/web` is treated as a normal directory.

### 2) `dist/server.js` missing at runtime
- Symptom: runtime crash: `Cannot find module '/workspace/apps/api/dist/server.js'`
- Cause: Koyeb didn’t reliably build the API into `dist/` before starting.
- Fix used:
  - Build compiles both widget and API.
  - Dependencies are installed at the repo root (not inside `apps/*`), so Koyeb’s single `npm install` is sufficient.

## Deployment on Koyeb (no Docker)

### 1) Environment variables (must-have)
Set these in your Koyeb service:

`DATABASE_URL` (Neon PostgreSQL connection string)
- Example (you must use your real Neon string):
  - `postgresql://<user>:<password>@<host>/<db>?sslmode=require&channel_binding=require`

`ADMIN_API_KEY`
- Used for admin endpoints via `X-Admin-API-Key`.

`PORT`
- Set to `8000` (Koyeb default) to avoid any mismatch.

`LOG_LEVEL`
- `info` for normal logs.

Widget/CORS authorization:
- `WIDGET_ALLOWED_ORIGINS`
  - Comma-separated list of allowed origins for cross-origin requests.
  - Example:
    - `https://yourdomain.com,https://yourapp.koyeb.app`

Rate limiting:
- `RATE_LIMIT_MAX_PER_MINUTE`
- `SCAN_COOLDOWN_SECONDS`

Redis:
- `REDIS_URL`
  - Not required for the current MVP core scan path, but kept for future extensions.

### 2) Koyeb build & run commands
In the Koyeb UI, configure:

- Build command: `npm run build`
- Start command (run): `npm start`

This works because the repo root `package.json` builds:
- the widget (`apps/widget`)
- the API into `apps/api/dist/`

and then runs:
- `node apps/api/dist/server.js`

### 3) Database migrations & seeding
You only need to run migrations once (or anytime you add new SQL migrations).

Local (for reference):
```bash
cd apps/api
npm run db:migrate
npm run db:seed
```

On Koyeb, you have two options:
- Run migrations/seed locally during setup (Neon is cloud-accessible), then deploy.
- Or create a separate one-off Koyeb job/instance that runs:
  - `npm run db:migrate && npm run db:seed`

## Validation checklist (post-deploy)

1. Health:
   - `GET /health` returns `{"ok":true}`.

2. Demo page loads:
   - `GET /demo` returns HTML and loads widget script from:
     - `/public/widget.iife.js`

3. Check-in endpoint:
   - `POST /scan` returns:
     - `200` with `{ "visit_count": <n>, "reward": null | { "label": "..." } }`

4. Origin/authorization:
   - Same-origin browser requests may omit `Origin` header, and are allowed by the backend.
   - Cross-origin requests are still validated against tenant `allowed_origins`.

## Embedding the widget on a real customer site

Add this to the customer page:

```html
<script>
  window.REPEATOS_CONFIG = {
    token: "their-qr-token",
    businessName: "Business Name (optional)",
    rewardLabel: "Reward label (optional)",
    rewardVisits: 5,             // optional, default is 5
    apiBaseUrl: "https://<your-koyeb-domain>",
    primaryColor: "#c45e2c",    // optional
    mode: "modal"                // default; can be "inline"
  };
</script>

<script src="https://<your-koyeb-domain>/public/widget.iife.js"></script>
```

The widget will show a floating “Check In” button that opens a modal dialog and performs `POST /scan`.

