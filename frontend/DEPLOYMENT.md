# Frontend Deployment (Detailed Guide)

This guide explains how to host the SchoolOS frontend by itself, even if backend is on another server.

## What this frontend needs

The frontend is a Next.js app.
It does not need backend source code, but it does need a running backend API URL.

Frontend depends on:
- a reachable backend API (`/v1/*`)
- correct environment variables during build and runtime

## Environment variables

Set these values in your hosting platform or `.env.local`.

| Variable | Required | Example | What it does | How to get it |
|---|---|---|---|---|
| `BACKEND_URL` | Yes | `https://api.schoolos.com` | Server-side rewrite target for `/v1/*` | Your backend public URL |
| `NEXT_PUBLIC_API_URL` | Yes | `https://api.schoolos.com/v1` | Public API base used by server theme fetch | Backend URL + `/v1` |
| `NEXT_PUBLIC_PLATFORM_DOMAIN` | Yes | `schoolos.com` | Domain used for tenant/subdomain logic | Your main root domain |
| `NEXT_PUBLIC_SCHOOL_ID` | Optional | `12e9720e-...` | Tenant header fallback for local/dev | Value printed by backend seed script |

Notes:
- `BACKEND_URL` can be with or without `/v1`; app normalizes it.
- `NEXT_PUBLIC_API_URL` can be with or without `/v1`; app normalizes it.
- Set `BACKEND_URL` in both build-time and runtime environments.

## Option A: Managed Next.js hosting (no Docker)

Use this for Vercel, Netlify, or any platform that supports Next.js.

### Steps

1. Connect this `frontend` folder/repository to your platform.
2. Add environment variables from the table above.
3. Build command: `pnpm run build`
4. Start command: `pnpm run start`
5. Deploy.

### Important checks

- Backend health URL is reachable from the frontend host region.
- Your backend CORS allows your frontend domain.
- If using cookies for auth, your frontend and backend should both be HTTPS in production.

## Option B: VPS with Docker

Use this when you want to run frontend as a container.

### Build image

```bash
cd frontend
docker build \
  --build-arg BACKEND_URL=https://api.schoolos.com \
  --build-arg NEXT_PUBLIC_API_URL=https://api.schoolos.com/v1 \
  --build-arg NEXT_PUBLIC_PLATFORM_DOMAIN=schoolos.com \
  -t schoolos-frontend:latest .
```

### Run container

```bash
docker run -d \
  --name schoolos-frontend \
  -p 3000:3000 \
  schoolos-frontend:latest
```

Then open `http://<your-server-ip>:3000`.

### Recommended production setup

Put Nginx/Caddy/Traefik in front and route:
- `/` -> frontend container
- `/v1/` -> backend API

This keeps browser requests same-origin and avoids CORS/cookie issues.

## How to confirm deployment is correct

1. Open frontend login page.
2. Check backend proxy from frontend domain:
   - `https://app.schoolos.com/v1/healthz` should return `200`.
3. Login with test account.
4. Verify OTP flow works.
5. Open dashboard and confirm data loads.

## Common issues and fixes

### Issue: API returns 404 from frontend domain

Cause:
- Missing rewrite/proxy for `/v1/*`

Fix:
- Set `BACKEND_URL` correctly
- Ensure reverse proxy forwards `/v1/*` to backend

### Issue: Login succeeds but session is not kept

Cause:
- Cookie settings + HTTP/HTTPS mismatch

Fix:
- Use HTTPS for both frontend and backend in production
- Verify backend cookie settings (`COOKIE_SECURE`, `COOKIE_SAMESITE`)

### Issue: Theme or tenant branding not loading

Cause:
- Tenant not resolved in local/testing

Fix:
- Set `NEXT_PUBLIC_SCHOOL_ID` for local or non-subdomain testing

## Minimal deploy checklist

- Backend is live
- `BACKEND_URL` is correct
- `NEXT_PUBLIC_API_URL` is correct
- Frontend and backend domains are configured
- Login + OTP + dashboard tested
