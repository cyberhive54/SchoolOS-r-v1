# SchoolOS

> Multi-tenant SaaS School ERP — open, Docker-native, production-grade

SchoolOS is a complete school management platform for Indian K-12 schools. It covers student management, admissions, academics, attendance, examinations, fees, HR, payroll, and communication — all under one roof with secure multi-tenancy.

---

## What's inside (Phase 2)

| Piece | What it does |
|-------|-------------|
| **backend/** | NestJS 11 REST API — authentication, multi-tenancy, RBAC, academics module |
| **frontend/** | Next.js 15 web app — login, OTP, dashboard shell, academics UI |
| **PostgreSQL 16** | Primary database (one DB, school-scoped queries) |
| **Redis 7** | Cache, session store, BullMQ job queues |
| **Nginx** | Reverse proxy for production Docker stack |

---

## Prerequisites

| Tool | Minimum version |
|------|----------------|
| Docker Desktop | 24+ |
| Docker Compose | v2 (bundled with Docker Desktop) |
| Node.js | 22 LTS |
| pnpm | 9+ (`npm install -g pnpm`) |

---

## Quick Start — Replit (zero-config)

If you're running this project on Replit, everything is managed by a single startup script. No manual steps needed.

### What `start.sh` does automatically

1. Starts Redis (daemonized on port 6379)
2. Compiles the NestJS backend (only if `dist/` is missing)
3. Runs all pending database migrations
4. Starts the backend API on **port 3001**
5. Starts the Next.js frontend on **port 5000**
6. Pre-warms the frontend pages so the first browser request is instant

### Services after startup

| Service | URL |
|---------|-----|
| Web app | Port 5000 (Replit preview pane) |
| API | Port 3001 — `http://localhost:3001/v1/healthz` |
| Redis | `localhost:6379` |

### Seed development data (first time only)

```bash
cd backend
pnpm run seed
```

This creates:
- A demo school (`slug: demo`)
- A super-admin user

**Login credentials:**
```
Email:    admin@demo.schoolos.com
Password: Admin@123
```

When you log in, a 6-digit OTP is printed to the backend console log. Copy it and enter it on the OTP screen.

---

## Quick Start — Docker (recommended for local dev)

### 1. Clone and configure

```bash
git clone <repo-url> schoolos
cd schoolos

cp .env.example .env
```

Open `.env` and fill in the secrets:

```env
# Required — generate with: openssl rand -hex 32
JWT_SECRET=your-long-random-secret-here
JWT_REFRESH_SECRET=another-long-random-secret-here

# Database (can leave defaults for local dev)
DATABASE_NAME=schoolos
DATABASE_USER=schoolos
DATABASE_PASSWORD=choose-a-password

# Platform
PLATFORM_DOMAIN=localhost
CORS_ORIGINS=http://localhost:3000
```

### 2. Start all services

```bash
docker compose -f docker/docker-compose.dev.yml up
```

This starts:
- **PostgreSQL** on `localhost:5432`
- **Redis** on `localhost:6379`
- **API** on `http://localhost:4000`
- **Web** on `http://localhost:3000`

First boot takes ~2 minutes while Docker builds the images.

### 3. Run database migrations

Open a new terminal:

```bash
pnpm schoolos:migrate
```

### 4. Seed development data

```bash
pnpm schoolos:seed
```

**Login credentials:**
```
Email:    admin@demo.schoolos.com
Password: Admin@123
```

When you log in you'll receive a 6-digit OTP in the **API server console** (development mode).

### 5. Open the app

| Service | URL |
|---------|-----|
| Web app | http://localhost:3000 |
| API | http://localhost:4000/v1/healthz |

---

## Useful Docker commands

```bash
# Start in background
docker compose -f docker/docker-compose.dev.yml up -d

# Stop all services
pnpm schoolos:down

# Watch logs for the API service
docker compose -f docker/docker-compose.dev.yml logs -f api

# Rebuild after code changes (if hot-reload doesn't pick them up)
docker compose -f docker/docker-compose.dev.yml build api

# Destroy everything including volumes (fresh start)
docker compose -f docker/docker-compose.dev.yml down -v
```

---

## Running without Docker (bare metal)

You need PostgreSQL 16 and Redis 7 running locally. Then use the unified startup script:

```bash
# One command starts everything
bash start.sh
```

Or start services individually:

```bash
# Install dependencies (first time)
cd backend && pnpm install && cd ..
cd frontend && pnpm install && cd ..

# Start Redis (if not already running)
redis-server --daemonize yes

# Run migrations
cd backend && pnpm run migration:run && cd ..

# Start the API (port 3001)
cd backend
TS_NODE_PROJECT=tsconfig.paths.json node -r tsconfig-paths/register dist/main.js

# Start the web app (port 5000, in a separate terminal)
cd frontend
PORT=5000 pnpm run dev
```

Environment variables must be set in `backend/.env` and `frontend/.env.local`.

### Port reference (bare metal / Replit)

| Service | Port |
|---------|------|
| Frontend (Next.js) | 5000 |
| Backend (NestJS) | 3001 |
| Redis | 6379 |
| PostgreSQL | 5432 |

---

## Rebuilding the backend after code changes

```bash
cd backend
rm -rf dist/
./node_modules/.bin/tsc -p tsconfig.build.json
```

---

## Multi-school / Tenant Header

SchoolOS is multi-tenant. Every API request must identify which school it belongs to. In development you can use the `X-School-ID` header:

```bash
# Docker/local (port 4000)
curl -H "X-School-ID: <uuid-from-seed-output>" \
     http://localhost:4000/v1/healthz

# Replit/bare metal (port 3001)
curl -H "X-School-ID: <uuid-from-seed-output>" \
     http://localhost:3001/v1/healthz
```

In production, tenants are resolved via subdomain (`school-slug.schoolos.com`).

---

## Authentication flow

1. `POST /v1/auth/login` — enter email + password → a 6-digit OTP is generated
2. Check API server console for the OTP (dev mode; production sends to email/SMS)
3. `POST /v1/auth/verify-otp` → receive JWT access token + HttpOnly refresh token cookie
4. All further requests use `Authorization: Bearer <access-token>`
5. `POST /v1/auth/refresh` → rotate tokens when access token expires (15 min)
6. `POST /v1/auth/logout` → invalidate session

---

## Production deployment

Edit `.env` with real values (never commit it). Then:

```bash
docker compose -f docker/docker-compose.yml up -d
```

The production stack adds Nginx as a reverse proxy with TLS termination. Place your SSL certificates in `docker/nginx/ssl/`.

---

## Common issues

| Problem | Fix |
|---------|-----|
| 502 on first page load | The startup script pre-warms pages — restart the workflow and wait for "Pre-warm done" in logs |
| Port already in use | Change port in `.env` and `docker-compose.dev.yml` |
| OTP not appearing | Check backend console / `docker logs schoolos_api` |
| DB connection error | Wait for Postgres health check (`docker ps` → healthy) |
| `migration:run` fails | Ensure `DATABASE_URL` in `.env` matches your DB config |
| Hot-reload not working | Ensure volume mounts in compose are correct; try `docker compose restart api` |
| Backend changes not applied | Run the rebuild command above, then restart the workflow |

---

## Project structure

```
schoolos/
├── backend/              NestJS 11 API (port 3001 bare-metal / 4000 Docker)
│   ├── src/modules/      Feature modules (auth, academics, students, …)
│   ├── src/database/     Migrations, seeds, TypeORM config
│   └── dist/             Compiled output (generated — do not commit)
├── frontend/             Next.js 15 web app (port 5000 bare-metal / 3000 Docker)
│   └── src/app/          App Router pages and layouts
├── docker/               Docker Compose files + Nginx config
├── documentation/        Architecture, coding guidelines, module design docs
│   └── modules-docs/     Per-module design documents (academics, students, …)
├── Progress-track/       Agent run logs + developer reference
├── start.sh              Unified startup script (Replit / bare-metal)
└── .env.example          All required env vars documented
```

---

## License

MIT
