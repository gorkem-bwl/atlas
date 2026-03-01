# ── Stage 1: Build ──────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root config files
COPY package.json package-lock.json tsconfig.base.json ./

# Copy workspace package.json files for dependency resolution
COPY packages/shared/package.json packages/shared/
COPY packages/server/package.json packages/server/
COPY packages/client/package.json packages/client/

# Install all dependencies (including dev for building)
RUN npm ci --legacy-peer-deps

# Copy source code
COPY packages/shared packages/shared
COPY packages/server packages/server
COPY packages/client packages/client

# Copy app manifests for catalog seeding
COPY apps apps

# Build shared types first (other packages depend on it)
RUN cd packages/shared && npx tsc

# Build client (tsc + vite build)
RUN cd packages/client && npx tsc && npx vite build

# Build server (tsc)
RUN cd packages/server && npx tsc

# ── Stage 2: Production ────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

# Install dumb-init for proper PID 1 signal handling
RUN apk add --no-cache dumb-init

# Copy root config files for workspace resolution
COPY package.json package-lock.json ./

# Copy workspace package.json files
COPY packages/shared/package.json packages/shared/
COPY packages/server/package.json packages/server/

# Install production dependencies only
# better-sqlite3 requires native compilation, so build tools are needed
RUN apk add --no-cache python3 make g++ && \
    npm ci --legacy-peer-deps --omit=dev && \
    apk del python3 make g++

# Copy built artifacts from builder stage
COPY --from=builder /app/packages/shared/dist packages/shared/dist
COPY --from=builder /app/packages/server/dist packages/server/dist
COPY --from=builder /app/packages/client/dist packages/client/dist

# Copy app manifests for catalog seeding at startup
COPY apps apps

# Create persistent data directories
RUN mkdir -p /app/data /app/packages/server/uploads

# Create non-root user
RUN addgroup -g 1001 atlas && adduser -u 1001 -G atlas -s /bin/sh -D atlas
RUN chown -R atlas:atlas /app
USER atlas

ENV NODE_ENV=production
EXPOSE 3001

# Health check against the existing /api/v1/health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3001/api/v1/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "packages/server/dist/index.js"]
