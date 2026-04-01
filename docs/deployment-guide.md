# RepeatOS Deployment Guide (VPS / Bare Server)

No Docker. Just Node.js, Neon (managed Postgres), and a process manager.

## Prerequisites on the server

- Node.js 20+ (`node -v`)
- npm (`npm -v`)
- pm2 (process manager): `npm install -g pm2`
- A domain or IP with ports 80/443 open
- Nginx (reverse proxy + serves widget static file)

## 1) Clone and install

```bash
git clone <your-repo-url> /var/www/repeatos
cd /var/www/repeatos

cd apps/api
npm install --production=false

cd ../widget
npm install --production=false
```

## 2) Build both apps

```bash
# Build widget bundle
cd /var/www/repeatos/apps/widget
npm run build
# Output: dist/widget.iife.js

# Build API
cd /var/www/repeatos/apps/api
npm run build
# Output: dist/ (compiled JS)
```

## 3) Configure API environment

```bash
cd /var/www/repeatos/apps/api
cp .env.example .env
```

Edit `.env`:

```env
PORT=4000
NODE_ENV=production
LOG_LEVEL=info
DATABASE_URL=postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/repeatos?sslmode=require
ADMIN_API_KEY=<generate-a-strong-key>
RATE_LIMIT_MAX_PER_MINUTE=100
SCAN_COOLDOWN_SECONDS=60
WIDGET_ALLOWED_ORIGINS=https://yourdomain.com,https://vendorsite.com
WIDGET_DIST_PATH=/var/www/repeatos/apps/widget/dist
```

## 4) Run database migrations

```bash
cd /var/www/repeatos/apps/api
npm run db:migrate
npm run db:seed
```

## 5) Start API with pm2

```bash
cd /var/www/repeatos/apps/api
pm2 start dist/server.js --name repeatos-api
pm2 save
pm2 startup
```

Verify:

```bash
curl http://localhost:4000/health
# { "ok": true }
```

## 6) Configure Nginx

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    # API reverse proxy
    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name cdn.yourdomain.com;

    # Widget static bundle served directly by Nginx
    location / {
        root /var/www/repeatos/apps/widget/dist;
        add_header Access-Control-Allow-Origin *;
        add_header Cache-Control "public, max-age=86400";
        try_files $uri =404;
    }
}
```

Then:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## 7) Add SSL with Certbot

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d api.yourdomain.com -d cdn.yourdomain.com
```

## 8) Verify deployment

```bash
# Health check
curl https://api.yourdomain.com/health

# Widget bundle accessible
curl -I https://cdn.yourdomain.com/widget.iife.js

# Test scan
curl -X POST https://api.yourdomain.com/scan \
  -H "Content-Type: application/json" \
  -d '{"token":"demo-token-1234","phone":"+2348012345678"}'
```

## 9) Vendor embed snippet

Give this to vendors:

```html
<script>
  window.REPEATOS_CONFIG = {
    token: '<their-qr-token>',
    businessName: 'Their Business Name',
    rewardLabel: 'Free Coffee',
    rewardVisits: 5,
    apiBaseUrl: 'https://api.yourdomain.com',
  };
</script>
<script src="https://cdn.yourdomain.com/widget.iife.js"></script>
<div id="repeatos-widget"></div>
```

## Updating the deployment

```bash
cd /var/www/repeatos
git pull

# Rebuild
cd apps/widget && npm run build
cd ../api && npm run build

# Restart API
pm2 restart repeatos-api
```

## Monitoring

```bash
pm2 logs repeatos-api
pm2 monit
```

## Architecture on server

```
Internet
  │
  ├── https://api.yourdomain.com
  │     └── Nginx → localhost:4000 (Fastify API via pm2)
  │                    └── Neon Postgres (remote)
  │
  └── https://cdn.yourdomain.com
        └── Nginx serves /var/www/repeatos/apps/widget/dist/widget.iife.js
```

No Docker. No containers. Just Node + Nginx + pm2 + Neon.
