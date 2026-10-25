#!/usr/bin/env bash
# CI production smoke test for the backend container (Linux host networking).
#
# Assumes the `expensetracker-backend:production` image already exists. Starts
# the container, waits for the health endpoint, prints container logs on
# timeout, and always removes the container before exiting.
#
# Usage: smoke.sh <port> <database_url> <jwt_secret> [container_name]

set -euo pipefail

PORT="${1:-7001}"
DATABASE_URL="${2:-postgresql://postgres:postgres@127.0.0.1:5432/postgres}"
JWT_SECRET="${3:-test-only-secret}"
CONTAINER="${4:-expensetracker-backend-smoke}"

# Verify the production image excludes development/test tooling.
docker run --rm --entrypoint sh expensetracker-backend:production -c \
    "test ! -d /app/node_modules/jest && \
     test ! -d /app/node_modules/supertest && \
     test ! -d /app/node_modules/nodemon && \
     test ! -e /app/node_modules/.bin/prisma"

# Start the container with host networking (Linux/CI topology).
docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
docker run -d --name "$CONTAINER" --network host \
    -e NODE_ENV=production \
    -e HOST=0.0.0.0 \
    -e PORT="$PORT" \
    -e DATABASE_URL="$DATABASE_URL" \
    -e JWT_SECRET="$JWT_SECRET" \
    expensetracker-backend:production

# Wait for the health endpoint, then always clean up.
status=0
code=""
url="http://localhost:${PORT}/api/v1/health"
for _ in $(seq 1 30); do
    if code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 3 "$url" 2>/dev/null || true)" && [ "$code" = "200" ]; then
        echo "health check returned 200"
        break
    fi
    sleep 1
done

if [ "$code" != "200" ]; then
    echo "health check timed out for $url" >&2
    docker logs "$CONTAINER" >&2 || true
    status=1
fi

docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
exit "$status"
