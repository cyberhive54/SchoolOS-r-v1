# ── Stage 1: Builder ──────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@9

# Copy package manifest only (no workspace lockfile in standalone context)
COPY package.json ./

# Install all dependencies — no frozen-lockfile because this app is deployed
# standalone without the pnpm workspace root lockfile
RUN pnpm install --no-frozen-lockfile

# Copy source
COPY . .

# Build
RUN pnpm run build

# ── Stage 2: Production ───────────────────────────────────────────────────────
FROM node:22-alpine AS production

WORKDIR /app

RUN npm install -g pnpm@9

# Copy manifest for prod install
COPY package.json ./

# Install production dependencies only
RUN pnpm install --prod --no-frozen-lockfile

# Copy compiled dist from builder
COPY --from=builder /app/dist ./dist
# tsconfig-paths/register needs this file at runtime to resolve aliases
COPY --from=builder /app/tsconfig.json ./tsconfig.json

# Run as non-root
USER node

EXPOSE 4000

ENV NODE_ENV=production

CMD ["node", "-r", "tsconfig-paths/register", "dist/main.js"]
