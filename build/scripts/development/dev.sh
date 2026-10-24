#!/usr/bin/env bash
# Run backend and mobile development servers together and terminate both
# cleanly on interrupt or when either process exits.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

RESOLVED_API_URL="$( "$SCRIPT_DIR/../network/resolved-url.sh" 2>/dev/null || true )"
if [ -n "$RESOLVED_API_URL" ]; then
    echo "Mobile API endpoint: $RESOLVED_API_URL"
fi

BACKEND_PID=""
MOBILE_PID=""

shutdown() {
    local pid
    for pid in "$MOBILE_PID" "$BACKEND_PID"; do
        if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
            kill -INT "$pid" 2>/dev/null || true
        fi
    done
    sleep 1
    for pid in "$MOBILE_PID" "$BACKEND_PID"; do
        if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
            kill -TERM "$pid" 2>/dev/null || true
        fi
    done
    for pid in "$MOBILE_PID" "$BACKEND_PID"; do
        [ -n "$pid" ] && wait "$pid" 2>/dev/null || true
    done
}
trap shutdown INT TERM EXIT

(
    cd "$REPO_ROOT/src/backend"
    exec npm run start:dev
) &
BACKEND_PID=$!

(
    cd "$REPO_ROOT/src/mobile"
    exec npm run start
) &
MOBILE_PID=$!

while :; do
    if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
        wait "$BACKEND_PID"
        status=$?
        shutdown
        exit "$status"
    fi
    if ! kill -0 "$MOBILE_PID" 2>/dev/null; then
        wait "$MOBILE_PID"
        status=$?
        shutdown
        exit "$status"
    fi
    sleep 1
done
