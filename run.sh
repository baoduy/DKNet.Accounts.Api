#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

# --pull refreshes the FROM base images; a stale cached sdk:10.0 fails the API build.
docker compose build --pull
docker compose up -d --wait

port=$(grep -E '^CONSOLE_PORT=' .env 2>/dev/null | cut -d= -f2)
open "http://localhost:${port:-3000}"

docker compose logs -f
