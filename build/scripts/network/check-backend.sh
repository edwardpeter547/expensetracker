#!/usr/bin/env bash
# Check whether the backend health endpoint is reachable and print a concise
# diagnostic. This performs a read-only GET and exposes no secrets.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

base_url="$("$SCRIPT_DIR/resolved-url.sh")"
health_url="${base_url%/}/health"

echo "Checking backend health at $health_url"
if curl -fsS --max-time 5 "$health_url"; then
    echo
    echo "Backend is reachable."
    exit 0
else
    echo
    echo "ERROR: backend is not reachable at $health_url" >&2
    echo "       Confirm the backend is running, HOST/PORT are correct, and the" >&2
    echo "       macOS firewall allows incoming connections on that port." >&2
    exit 1
fi
