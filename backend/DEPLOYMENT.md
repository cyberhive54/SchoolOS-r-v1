# Backend Deployment (Beginner-Friendly)

This guide is for people who want to run backend safely without guessing.

You can run backend in 2 ways:
- Docker runtime
- Standalone runtime (Node + pnpm, no Docker)

Good news:
- If you use Supabase + Upstash, database and redis are already hosted for you.
- You only run the backend app.

---

## 1) First understand what to start

You do **not** start PostgreSQL manually if using Supabase.
You do **not** start Redis manually if using Upstash.

You only start:
- backend API process/container

---

## 2) Create Upstash Redis and get URL (step-by-step)

1. Open `https://console.upstash.com/`
2. Create account / login.
3. Click `Create Database`.
4. Choose:
   - Name: any (example `schoolos-prod`)
   - Region: closest to backend server
   - TLS: enabled (recommended)
5. After DB is created, open database details.
6. Copy the **Redis URI** (not REST URL). It usually looks like:

```env
rediss://default:<password>@<host>:<port>
```

If dashboard gives endpoint/port/password separately, build it like:

```env
REDIS_URL=rediss://default:<password>@<endpoint>:<port>
```

---

## 3) Supabase values you already have

You shared these:

```env
# Pooling URL
DATABASE_URL="postgresql://postgres.whakbhwevyhysfvikinm:[YOUR-PASSWORD]@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Direct URL for migrations
DIRECT_URL="postgresql://postgres.whakbhwevyhysfvikinm:[YOUR-PASSWORD]@aws-1-ap-south-1.pooler.supabase.com:5432/postgres"
```

Use both in backend `.env`:
- `DATABASE_URL` for app runtime
- `DIRECT_URL` for migrations (this project now supports this automatically)

Also set:

```env
DATABASE_SSL_MODE=require
```

---

## 4) Fastest path (recommended): Standalone mode

### Step A: Prepare `.env`

From backend folder:

Windows PowerShell:

```powershell
cd backend
Copy-Item .env.standalone.example .env
```

Linux/macOS:

```bash
cd backend
cp .env.standalone.example .env
```

Now edit `.env` and fill:
- Supabase `DATABASE_URL`
- Supabase `DIRECT_URL`
- Upstash `REDIS_URL`
- JWT secrets
- `CORS_ORIGINS`
- `PLATFORM_DOMAIN`

If frontend is on Vercel and backend is on Render (different domains), set:

```env
COOKIE_SECURE=true
COOKIE_SAMESITE=none
```

And set CORS origin exactly as frontend origin (no `/login` path):

```env
CORS_ORIGINS=https://school-os-r-frontend.vercel.app
```

Generate JWT secrets:

```bash
openssl rand -hex 32
openssl rand -hex 32
```

### Step B: Install and run

```bash
pnpm install
pnpm run migration:run
pnpm run build
pnpm run start
```

Backend should start on `API_PORT` (default `4000`).

---

## 5) Docker mode (if you prefer)

### Step A: Prepare env

```bash
cd backend
cp .env.docker.example .env
```

Fill real values (Supabase + Upstash also work here).

### Step B: Build image

```bash
docker build -t schoolos-backend:latest .
```

### Step C: Run migrations

```bash
docker run --rm --env-file .env schoolos-backend:latest node dist/database/run-migrations.js
```

### Step D: Start API

```bash
docker run -d \
  --name schoolos-backend \
  -p 4000:4000 \
  --env-file .env \
  schoolos-backend:latest
```

---

## 6) Required env checklist

Must be set:
- `NODE_ENV=production`
- `API_PORT=4000`
- `API_PREFIX=v1`
- `DATABASE_URL=...`
- `DIRECT_URL=...` (strongly recommended with Supabase)
- `DATABASE_SSL_MODE=require`
- `REDIS_URL=rediss://...`
- `JWT_SECRET=...`
- `JWT_REFRESH_SECRET=...`
- `CORS_ORIGINS=https://your-frontend-domain`
- `PLATFORM_DOMAIN=yourdomain.com`
- `COOKIE_SECURE=true`
- `COOKIE_SAMESITE=none` (if frontend/backend are different domains)

---

## 7) Test after start

Health check:

```bash
curl https://api.yourdomain.com/v1/healthz
```

Then test app flows:
- login
- OTP verify
- token refresh
- logout
- bulk import
- promotions

If bulk import/promotion fails, Redis is usually the first thing to check.

---

## 8) Render + Vercel quick mapping

For your setup:
- Frontend: `https://school-os-r-frontend.vercel.app`
- Backend: Render URL (example `https://your-api.onrender.com`)

Set backend env on Render dashboard:
- `CORS_ORIGINS=https://school-os-r-frontend.vercel.app`
- `COOKIE_SECURE=true`
- `COOKIE_SAMESITE=none`

Set frontend env on Vercel:
- `BACKEND_URL=https://your-api.onrender.com`
- `NEXT_PUBLIC_API_URL=https://your-api.onrender.com/v1`

---

## 9) Important production warning

Current OTP provider default is `EMAIL_PROVIDER=console`, which logs OTP in server logs.

Before real public launch, integrate real email sending flow.
