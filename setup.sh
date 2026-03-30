#!/bin/bash
set -e

echo ""
echo "  Atlas — Setup"
echo "  ─────────────"
echo ""

# Check prerequisites
command -v openssl >/dev/null 2>&1 || { echo "Error: openssl is required but not found."; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "Error: docker is required but not found."; exit 1; }
command -v curl >/dev/null 2>&1 || HEALTH_CHECK="wget" || HEALTH_CHECK="none"
HEALTH_CHECK="${HEALTH_CHECK:-curl}"

# Check Docker daemon is running
if ! docker info >/dev/null 2>&1; then
  echo "Error: Docker daemon is not running. Please start Docker and try again."
  exit 1
fi

# Generate .env if it doesn't exist
if [ ! -f .env ]; then
  echo "  [1/3] Generating secrets..."
  cp .env.example .env

  JWT_SECRET=$(openssl rand -hex 32)
  JWT_REFRESH_SECRET=$(openssl rand -hex 32)
  TOKEN_ENCRYPTION_KEY=$(openssl rand -hex 32)

  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s/^JWT_SECRET=CHANGE_ME$/JWT_SECRET=$JWT_SECRET/" .env
    sed -i '' "s/^JWT_REFRESH_SECRET=CHANGE_ME$/JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET/" .env
    sed -i '' "s/^TOKEN_ENCRYPTION_KEY=CHANGE_ME$/TOKEN_ENCRYPTION_KEY=$TOKEN_ENCRYPTION_KEY/" .env
  else
    sed -i "s/^JWT_SECRET=CHANGE_ME$/JWT_SECRET=$JWT_SECRET/" .env
    sed -i "s/^JWT_REFRESH_SECRET=CHANGE_ME$/JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET/" .env
    sed -i "s/^TOKEN_ENCRYPTION_KEY=CHANGE_ME$/TOKEN_ENCRYPTION_KEY=$TOKEN_ENCRYPTION_KEY/" .env
  fi

  chmod 600 .env
  unset JWT_SECRET JWT_REFRESH_SECRET TOKEN_ENCRYPTION_KEY
  echo "         Done. Secrets written to .env"
else
  echo "  [1/3] Using existing .env file"
fi

# Start services
echo "  [2/3] Starting containers (this may take a few minutes on first run)..."
docker compose -f docker-compose.production.yml up -d --build 2>&1 | tail -5

# Wait for health
echo "  [3/3] Waiting for Atlas to be ready..."
READY=false
for i in $(seq 1 60); do
  if [ "$HEALTH_CHECK" = "curl" ]; then
    if curl -sf http://localhost:3001/api/v1/health > /dev/null 2>&1; then
      READY=true
      break
    fi
  elif [ "$HEALTH_CHECK" = "wget" ]; then
    if wget -qO- http://localhost:3001/api/v1/health > /dev/null 2>&1; then
      READY=true
      break
    fi
  else
    # No curl or wget — just wait and hope
    sleep 30
    READY=true
    break
  fi
  printf "."
  sleep 2
done

echo ""
echo ""

if [ "$READY" = true ]; then
  echo "  Atlas is running!"
  echo ""
  echo "  Open http://localhost:3001 to get started."
  echo "  You'll create your admin account on first visit."
  echo ""
  echo "  Useful commands:"
  echo "    View logs:     docker compose -f docker-compose.production.yml logs -f atlas"
  echo "    Stop:          docker compose -f docker-compose.production.yml down"
  echo "    Restart:       docker compose -f docker-compose.production.yml restart atlas"
  echo ""
else
  echo "  Atlas didn't respond in time."
  echo ""
  echo "  Check the logs:"
  echo "    docker compose -f docker-compose.production.yml logs atlas"
  echo ""
  exit 1
fi
