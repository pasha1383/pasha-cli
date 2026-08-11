#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo "=== {{projectName}} — Microservices ==="
echo ""

if [ ! -f .env ]; then
  echo "→ Creating .env from .env.example ..."
  cp .env.example .env
fi

echo "→ Building all services ..."
docker compose build

echo ""
echo "→ Starting all services ..."
docker compose up -d

echo ""
echo "→ Waiting for health checks ..."
sleep 3

echo ""
echo "→ Status:"
docker compose ps

echo ""
echo "Done. Gateway is at http://localhost:${GATEWAY_PORT:-8080}"
