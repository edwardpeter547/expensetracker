#!/usr/bin/env bash
# Validate the local environment files required for frontend-to-backend
# development. This is read-only and never prints secret values.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

BACKEND_ENV="$REPO_ROOT/src/backend/src/environment/dev.env"
MOBILE_ENV="$REPO_ROOT/src/mobile/.env"

read_env_value() {
    local file="$1" key="$2" line k value
    [ -f "$file" ] || return 1
    while IFS= read -r line || [ -n "$line" ]; do
        case "$line" in
            ''|'#'*) continue ;;
        esac
        k="${line%%=*}"
        [ "$k" = "$key" ] || continue
        value="${line#*=}"
        value="${value%\"}"; value="${value#\"}"
        value="${value%\'}"; value="${value#\'}"
        printf '%s\n' "$value"
        return 0
    done < "$file"
    return 1
}

failures=0

require_value() {
    local file="$1" key="$2"
    if value="$(read_env_value "$file" "$key" 2>/dev/null || true)" && [ -n "$value" ]; then
        printf '  ok: %s is set\n' "$key"
    else
        printf '  MISSING: %s\n' "$key" >&2
        failures=$((failures + 1))
    fi
}

echo "Validating backend dev environment..."
if [ -f "$BACKEND_ENV" ]; then
    require_value "$BACKEND_ENV" PORT
    require_value "$BACKEND_ENV" DATABASE_URL
    require_value "$BACKEND_ENV" JWT_SECRET
else
    echo "  MISSING: $BACKEND_ENV (copy dev.env.example)" >&2
    failures=$((failures + 1))
fi

echo "Validating mobile environment..."
if [ -f "$MOBILE_ENV" ]; then
    require_value "$MOBILE_ENV" EXPO_PUBLIC_API_PORT
else
    echo "  MISSING: $MOBILE_ENV (copy .env.example)" >&2
    failures=$((failures + 1))
fi

if [ "$failures" -gt 0 ]; then
    echo "Environment validation failed with $failures problem(s)." >&2
    exit 1
fi

echo "Environment validation passed."
