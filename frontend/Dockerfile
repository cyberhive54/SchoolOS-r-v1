# Stage 1: Builder
FROM node:22-alpine AS builder

WORKDIR /app

RUN npm install -g pnpm@9

# Copy manifest/lockfile for deterministic installs
COPY package.json pnpm-lock.yaml* ./

# Install all dependencies.
# Using no-frozen-lockfile keeps builds resilient when package.json/lockfile
# drift across environments or branches.
RUN pnpm install --no-frozen-lockfile

# Copy source
COPY . .

# Build-time configuration:
# - NEXT_PUBLIC_* is inlined into browser bundles.
# - BACKEND_URL is used by Next.js rewrites (/v1/* -> backend).
ARG BACKEND_URL=http://localhost:3001
ARG NEXT_PUBLIC_API_URL=http://localhost:4000/v1
ARG NEXT_PUBLIC_PLATFORM_DOMAIN=localhost
ENV BACKEND_URL=${BACKEND_URL}
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_PLATFORM_DOMAIN=${NEXT_PUBLIC_PLATFORM_DOMAIN}

RUN pnpm run build

# Stage 2: Production (Next.js standalone output)
FROM node:22-alpine AS production

WORKDIR /app

# Next.js standalone output bundles runtime dependencies
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy public assets (fonts, images, favicons, etc.)
COPY --from=builder /app/public ./public

USER node

EXPOSE 3000

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

CMD ["node", "server.js"]
