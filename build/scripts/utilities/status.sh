#!/usr/bin/env bash
# Read-only development environment status. Never modifies state or prints
# credentials or complete database URLs.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../lib.sh"

resolve_integration_config

echo "ExpenseTracker development status"
printf '  branch:      %s\n' "$(git -C "$LIB_ROOT_REPO" rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)"

if command -v task >/dev/null 2>&1; then
    printf '  task:        %s\n' "$(task --version 2>/dev/null | head -n 1 || echo available)"
else
    echo "  task:        unavailable"
fi

if docker info >/dev/null 2>&1; then
    echo "  docker:      available"
    if docker inspect "$PG_CONTAINER" >/dev/null 2>&1; then
        printf '  postgres:    container %s (%s)\n' "$PG_CONTAINER" "$(docker inspect -f '{{.State.Status}}' "$PG_CONTAINER")"
    else
        printf '  postgres:    container %s not present\n' "$PG_CONTAINER"
    fi
else
    echo "  docker:      unavailable"
fi

printf '  node:        %s\n' "$(node --version 2>/dev/null || echo unavailable)"
printf '  npm:         %s\n' "$(npm --version 2>/dev/null || echo unavailable)"

[ -f "$LIB_ROOT_REPO/src/backend/src/environment/dev.env" ] && echo "  dev env:     present" || echo "  dev env:     missing"
[ -f "$LIB_ROOT_REPO/src/backend/src/environment/test.env" ] && echo "  test env:    present" || echo "  test env:     missing"

if [ -n "$TEST_DATABASE_URL" ] || { [ -n "${POSTGRES_TEST_USER:-}" ] && [ -n "${POSTGRES_TEST_PASSWORD:-}" ]; }; then
    echo "  integration: database configured (masked)"
else
    echo "  integration: database not configured"
fi
