# Atlas

Self-hosted business platform with CRM, HRM, digital signatures, document editor, task management, spreadsheets, file storage, and drawing tools.

## Quick start (Docker)

```bash
git clone https://github.com/bluewave-labs/atlas.git
cd atlas
chmod +x setup.sh
./setup.sh
```

This will:
1. Generate secure secrets automatically
2. Start PostgreSQL, Redis, and Atlas via Docker
3. Wait for the service to be healthy

Then open **http://localhost:3001** and create your admin account.

## Manual Docker setup

```bash
# 1. Copy environment file and generate secrets
cp .env.example .env

# Generate and replace the three CHANGE_ME values:
# JWT_SECRET, JWT_REFRESH_SECRET, TOKEN_ENCRYPTION_KEY
# Each: openssl rand -hex 32

# 2. Build and start
docker compose -f docker-compose.production.yml up -d --build

# 3. Open http://localhost:3001
```

## Development setup

```bash
# 1. Start PostgreSQL and Redis
docker compose up -d

# 2. Install dependencies
npm install --legacy-peer-deps

# 3. Create environment file with dev secrets
cp .env.example .env
# Generate secrets (required even for dev):
#   openssl rand -hex 32  → paste into JWT_SECRET
#   openssl rand -hex 32  → paste into JWT_REFRESH_SECRET
#   openssl rand -hex 32  → paste into TOKEN_ENCRYPTION_KEY

# 4. Start dev servers
npm run dev
```

- Client: http://localhost:5180
- Server: http://localhost:3001
- On first visit, you'll be prompted to create an admin account.

## Apps

| App | Description |
|-----|-------------|
| CRM | Pipeline, contacts, companies, deals, dashboard, workflow automations |
| HRM | Employees, departments, leave management, attendance, org chart |
| Sign | PDF digital signatures with multi-signer support and field placement |
| Drive | File storage with folders, versioning, sharing, and file preview |
| Tables | Spreadsheets with rich field types and multiple views |
| Tasks | Task management with projects, kanban, and recurring tasks |
| Write | Document editor with templates and version history |
| Draw | Collaborative drawing canvas |

## Tech stack

- **Frontend**: React, TypeScript, Vite, TanStack Query, Zustand
- **Backend**: Express, TypeScript, Drizzle ORM, PostgreSQL
- **Infrastructure**: Docker, Redis, BullMQ

## Environment variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `JWT_SECRET` | Yes | — | JWT signing key (min 32 chars) |
| `JWT_REFRESH_SECRET` | Yes | — | Refresh token signing key (min 32 chars) |
| `TOKEN_ENCRYPTION_KEY` | Yes | — | 64-char hex string for AES-256 encryption |
| `POSTGRES_PASSWORD` | No | `atlas` | PostgreSQL password (Docker setup) |
| `DATABASE_URL` | No | localhost | PostgreSQL connection string |
| `REDIS_URL` | No | — | Redis connection (enables background sync) |
| `PORT` | No | `3001` | Server port |
| `SERVER_PUBLIC_URL` | No | `http://localhost:3001` | Public URL for the server |
| `CLIENT_PUBLIC_URL` | No | `http://localhost:3001` | Public URL for the client |
| `GOOGLE_CLIENT_ID` | No | — | Google OAuth (for CRM email/calendar sync) |
| `GOOGLE_CLIENT_SECRET` | No | — | Google OAuth secret |
| `SMTP_HOST` | No | — | SMTP server for password reset emails |
| `SMTP_PORT` | No | `587` | SMTP port |
| `SMTP_USER` | No | — | SMTP username |
| `SMTP_PASS` | No | — | SMTP password |

## License

[Business Source License 1.1](LICENSE) — free for non-production use. Converts to Apache 2.0 after 4 years.
