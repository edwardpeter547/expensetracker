#!/usr/bin/env bash
# Print the API base URL the mobile app will use for local development.
#
# This mirrors the resolution performed by the mobile client: an explicit
# EXPO_PUBLIC_API_URL wins; otherwise the URL is built from the detected LAN
# address and EXPO_PUBLIC_API_PORT.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
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

api_url="$(read_env_value "$MOBILE_ENV" EXPO_PUBLIC_API_URL || true)"
if [ -n "$api_url" ]; then
    printf '%s\n' "${api_url%/}"
    exit 0
fi

port="$(read_env_value "$MOBILE_ENV" EXPO_PUBLIC_API_PORT || true)"
port="${port:-7001}"
ip="$("$SCRIPT_DIR/local-ip.sh")"

printf 'http://%s:%s/api/v1\n' "$ip" "$port"
