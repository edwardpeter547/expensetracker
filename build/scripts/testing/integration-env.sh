#!/usr/bin/env bash
# Resolve integration-test database configuration and run a command with the
# required environment exported. The command runs from src/backend.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../lib.sh"

resolve_integration_config

if [ -n "$TEST_DATABASE_URL" ]; then
    ADMIN_URL="$TEST_DATABASE_URL"
else
    if [ -z "${POSTGRES_TEST_USER:-}" ] || [ -z "${POSTGRES_TEST_PASSWORD:-}" ] || [ -z "${POSTGRES_TEST_DB:-}" ]; then
        echo "ERROR: integration database is not configured." >&2
        echo "       Set TEST_DATABASE_URL, or POSTGRES_TEST_USER, POSTGRES_TEST_PASSWORD," >&2
        echo "       and POSTGRES_TEST_DB in $(integration_env_file)" >&2
        echo "       (copy $(integration_env_file).example)." >&2
        exit 2
    fi
    ADMIN_URL="$(build_admin_url "$POSTGRES_TEST_USER" "$POSTGRES_TEST_PASSWORD" "$POSTGRES_TEST_DB" "$POSTGRES_TEST_HOST" "$POSTGRES_TEST_PORT")"
fi

if ! is_local_database_url "$ADMIN_URL"; then
    echo "ERROR: TEST_DATABASE_URL must point at a disposable local PostgreSQL" >&2
    echo "       (localhost, 127.0.0.1, or ::1). Refusing to run integration tests" >&2
    echo "       against a remote database." >&2
    exit 2
fi

export RUN_DB_INTEGRATION=1
export TEST_DATABASE_URL="$ADMIN_URL"
export NODE_ENV=testing
export NODE_OPTIONS=--experimental-vm-modules

echo "Integration database configured (localhost, masked)." >&2

cd "$LIB_ROOT_REPO/src/backend"
exec "$@"
