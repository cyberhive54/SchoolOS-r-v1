# SchoolOS Deployment (Quick Guide)

Use this quick guide when frontend and backend are hosted separately.

Detailed guides:
- `frontend/DEPLOYMENT.md`
- `backend/DEPLOYMENT.md`

## 1) Deploy backend first

Backend supports two production modes:
- Docker runtime
- Standalone runtime (systemd/pm2 on VPS)

Choose one backend env template:
- `backend/.env.docker.example` for Docker + local Postgres/Redis containers
- `backend/.env.standalone.example` for managed services (for example Supabase + Upstash)

Required backend basics:

```env
NODE_ENV=production
API_PORT=4000
API_PREFIX=v1
DATABASE_URL=postgresql://...
DATABASE_SSL_MODE=require
REDIS_URL=rediss://...
JWT_SECRET=<64 hex chars>
JWT_REFRESH_SECRET=<64 hex chars>
CORS_ORIGINS=https://app.yourdomain.com
PLATFORM_DOMAIN=yourdomain.com
COOKIE_SECURE=true
COOKIE_SAMESITE=strict
```

Generate JWT secrets:

```bash
openssl rand -hex 32
```

Run migrations before first start and each deploy:

```bash
cd backend
pnpm run migration:run
```

## 2) Deploy frontend second

Minimum frontend env:

```env
BACKEND_URL=https://api.yourdomain.com
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/v1
NEXT_PUBLIC_PLATFORM_DOMAIN=yourdomain.com
```

## 3) DNS

- `app.yourdomain.com` -> frontend host
- `api.yourdomain.com` -> backend host

## 4) Smoke tests

- `https://api.yourdomain.com/v1/healthz` returns `200`
- Login + OTP + refresh + logout works
- Bulk import and promotion queues work (Redis connected)

## 5) Important production note

Current backend OTP provider is `console` by default (OTP appears in server logs).
Before real-user production, wire a real email provider flow.
