# ── Stage 1: Build ──────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root config files
COPY package.json package-lock.json tsconfig.base.json ./

# Copy workspace package.json files for dependency resolution
COPY packages/shared/package.json packages/shared/
COPY packages/server/package.json packages/server/
COPY packages/client/package.json packages/client/

# Install all dependencies (including dev for building).
# Uses `npm install`, not `npm ci`: the root overrides block (react/react-dom
# pinned to a single exact version — see package.json) only takes effect when
# npm actually re-resolves the dependency tree. `npm ci` installs verbatim
# from whatever is already recorded in package-lock.json and ignores
# overrides added after that lockfile was last generated. Confirmed live:
# the committed lockfile had a stray root-level react@18.3.1 peer
# placeholder (satisfying some package's `react: ^18 || ^19` peerDependency)
# sitting in node_modules alongside @react-pdf/reconciler, which is hoisted
# to the repo root -- @react-pdf/reconciler's own `require('react')` call
# resolved that 18.3.1 copy instead of the correct 19.2.5 one nested in
# packages/server/node_modules/react, despite the override. This is the
# exact failure mode documented in diegomura/react-pdf#2964. `npm install`
# re-resolves against the override and writes a fresh, consistent lockfile
# as part of this build, eliminating the stray root copy.
RUN npm install

# Copy source code (cache-bust: changes to any source invalidates build)
COPY packages/shared packages/shared
COPY packages/server packages/server
COPY packages/client packages/client
ARG CACHE_BUST=1

# Build shared types first (other packages depend on it)
RUN cd packages/shared && npx tsc --skipLibCheck

# Build client (vite build handles its own TS compilation)
RUN cd packages/client && NODE_OPTIONS="--max-old-space-size=4096" npx vite build

# Build server (tsc — increase heap for large type-heavy codebase)
RUN cd packages/server && NODE_OPTIONS="--max-old-space-size=4096" npx tsc --skipLibCheck

# ── Stage 2: Production ────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

# Install dumb-init for proper PID 1 signal handling, plus postgresql-client
# for pg_dump — the scheduled DB-backup job (see bootstrap/backup scripts)
# shells out to pg_dump directly and was failing with "spawn pg_dump ENOENT"
# on every run, since Alpine's base image has neither installed by default.
# A failed pg_dump wrote its full connection string (including the Postgres
# password) to the application log on every attempt, so this doubles as a
# real credential-exposure fix, not just restoring a broken backup job.
RUN apk add --no-cache dumb-init postgresql-client

# Copy root config files for workspace resolution
COPY package.json package-lock.json ./

# Copy workspace package.json files
COPY packages/shared/package.json packages/shared/
COPY packages/server/package.json packages/server/

# Install production dependencies only. Same npm install vs. npm ci
# reasoning as the build stage above -- this stage's node_modules is what
# actually ships and runs @react-pdf/renderer in production, so it needs
# the override to take effect here too, not just at build time.
RUN npm install --omit=dev

# Copy built artifacts from builder stage
COPY --from=builder /app/packages/shared/dist packages/shared/dist
COPY --from=builder /app/packages/server/dist packages/server/dist
COPY --from=builder /app/packages/client/dist packages/client/dist
# SQL migration files — tsc skips non-TS assets, so copy them next to the compiled JS.
# bootstrapDatabase reads .sql files from this dir on every start (see packages/server/src/db/bootstrap.ts).
COPY packages/server/src/db/migrations/*.sql packages/server/dist/db/migrations/
# Locale JSONs — server loads them at runtime for seeded-workflow i18n
COPY --from=builder /app/packages/client/src/i18n/locales packages/client/src/i18n/locales

# Patch shared package.json to point to compiled JS (source .ts is not available in production)
RUN sed -i 's|"main": "./src/index.ts"|"main": "./dist/index.js"|' packages/shared/package.json && \
    sed -i 's|"types": "./src/index.ts"|"types": "./dist/index.d.ts"|' packages/shared/package.json

# Create persistent data directories
RUN mkdir -p /app/data /app/packages/server/uploads

# Copy entrypoint script (auto-detects public IP)
COPY docker-entrypoint.sh /app/docker-entrypoint.sh

# Create non-root user
RUN addgroup -g 1001 atlas && adduser -u 1001 -G atlas -s /bin/sh -D atlas
RUN chown -R atlas:atlas /app
USER atlas

ENV NODE_ENV=production
ENV CLIENT_PUBLIC_URL=http://localhost:3001
ENV CORS_ORIGINS=http://localhost:3001
EXPOSE 3001

# Health check against the existing /api/v1/health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3001/api/v1/health || exit 1

ENTRYPOINT ["dumb-init", "--", "/app/docker-entrypoint.sh"]
CMD ["node", "packages/server/dist/index.js"]
