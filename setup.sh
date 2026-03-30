#!/bin/bash
set -e

echo "Setting up Atlas..."

# Check prerequisites
command -v openssl >/dev/null 2>&1 || { echo "Error: openssl is required but not found."; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "Error: docker is required but not found."; exit 1; }

# Generate .env if it doesn't exist
if [ ! -f .env ]; then
  echo "Creating .env file..."
  cp .env.example .env

  # Generate secrets
  JWT_SECRET=$(openssl rand -hex 32)
  JWT_REFRESH_SECRET=$(openssl rand -hex 32)
  TOKEN_ENCRYPTION_KEY=$(openssl rand -hex 32)

  # Replace placeholders
  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s/^JWT_SECRET=CHANGE_ME$/JWT_SECRET=$JWT_SECRET/" .env
    sed -i '' "s/^JWT_REFRESH_SECRET=CHANGE_ME$/JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET/" .env
    sed -i '' "s/^TOKEN_ENCRYPTION_KEY=CHANGE_ME$/TOKEN_ENCRYPTION_KEY=$TOKEN_ENCRYPTION_KEY/" .env
  else
    sed -i "s/^JWT_SECRET=CHANGE_ME$/JWT_SECRET=$JWT_SECRET/" .env
    sed -i "s/^JWT_REFRESH_SECRET=CHANGE_ME$/JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET/" .env
    sed -i "s/^TOKEN_ENCRYPTION_KEY=CHANGE_ME$/TOKEN_ENCRYPTION_KEY=$TOKEN_ENCRYPTION_KEY/" .env
  fi

  # Secure the file and clear variables from memory
  chmod 600 .env
  unset JWT_SECRET JWT_REFRESH_SECRET TOKEN_ENCRYPTION_KEY

  echo "Secrets generated"
else
  echo "Using existing .env file"
fi

# Start services
echo "🐳 Starting Docker containers..."
docker compose -f docker-compose.production.yml up -d --build

# Wait for health
echo "⏳ Waiting for Atlas to be ready..."
for i in $(seq 1 30); do
  if curl -sf http://localhost:3001/api/v1/health > /dev/null 2>&1; then
    echo ""
    echo "✅ Atlas is running!"
    echo ""
    echo "   Open http://localhost:3001 to complete setup"
    echo "   You'll create your admin account on first visit."
    echo ""
    exit 0
  fi
  printf "."
  sleep 2
done

echo ""
echo "⚠️  Atlas didn't respond in time. Check logs with: docker compose -f docker-compose.production.yml logs atlas"
