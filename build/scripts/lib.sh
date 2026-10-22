#!/usr/bin/env bash
# Shared helpers for ExpenseTracker repository orchestration scripts.
#
# These helpers intentionally stay bash 3.2 compatible (the version shipped
# with macOS) and never print credentials or complete database URLs.

set -euo pipefail

# Absolute path to the repository root (build/scripts/lib.sh -> two levels up).
LIB_ROOT_REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# PostgreSQL container settings shared by database and status tooling.
PG_CONTAINER="${PG_CONTAINER:-expensetracker-postgres}"
PG_IMAGE="${PG_IMAGE:-postgres:16-alpine}"
PG_VOLUME="${PG_VOLUME:-expensetracker-postgres-data}"
DB_LOG_TAIL="${DB_LOG_TAIL:-100}"

# Path to the authoritative integration-test environment file.
integration_env_file() {
    printf '%s\n' "${LIB_ROOT_REPO}/src/backend/src/environment/integration.env"
}

# Read a KEY=value entry from a dotenv-style file without sourcing it.
#
# Supports blank lines, full-line comments, and single- or double-quoted
# values. It deliberately does not execute anything from the file.
read_env_file_value() {
    local file="$1"
    local key="$2"
    local line k value

    [ -f "$file" ] || return 1

    while IFS= read -r line || [ -n "$line" ]; do
        case "$line" in
            ''|'#'*) continue ;;
        esac
        k="${line%%=*}"
        [ "$k" = "$key" ] || continue
        value="${line#*=}"
        case "$value" in
            \"*\") value="${value#\"}"; value="${value%\"}" ;;
            \'*\') value="${value#\'}"; value="${value%\'}" ;;
        esac
        printf '%s\n' "$value"
        return 0
    done < "$file"
    return 1
}

# Resolve one integration setting with the required precedence:
# exported/environment variable first, then the integration.env file.
config_value() {
    local name="$1"
    local env_file="$2"

    if [ -n "${!name:-}" ]; then
        printf '%s\n' "${!name}"
        return 0
    fi
    read_env_file_value "$env_file" "$name" || true
}

# Percent-encode a value for safe use inside a PostgreSQL connection URL.
# Non-ASCII credentials are not supported here; provide a full, pre-encoded
# TEST_DATABASE_URL for such cases.
urlencode() {
    local input="$1"
    local out="" c hex i n
    n=${#input}
    for ((i = 0; i < n; i++)); do
        c="${input:i:1}"
        case "$c" in
            [a-zA-Z0-9.~_-]) out="${out}${c}" ;;
            *) printf -v hex '%%%02X' "'$c"; out="${out}${hex}" ;;
        esac
    done
    printf '%s\n' "$out"
}

# Build an administrative PostgreSQL URL from separate components, encoding
# the parts that may contain URL-reserved characters.
build_admin_url() {
    local user="$1" pass="$2" db="$3" host="$4" port="$5"
    printf 'postgresql://%s:%s@%s:%s/%s\n' \
        "$(urlencode "$user")" \
        "$(urlencode "$pass")" \
        "$host" \
        "$port" \
        "$(urlencode "$db")"
}

# True when a PostgreSQL URL targets localhost only. This is a lightweight
# preflight; the integration harness performs its own authoritative check.
is_local_database_url() {
    local url="$1"
    local host

    host="${url#*://}"
    host="${host%%/*}"
    case "$host" in
        *@*) host="${host##*@}" ;;
    esac
    case "$host" in
        *:*) host="${host%:*}" ;;
    esac
    case "$host" in
        '['*']') host="${host#\[}"; host="${host%\]}" ;;
    esac

    case "$host" in
        localhost|127.0.0.1|::1) return 0 ;;
        *) return 1 ;;
    esac
}

# Load all integration settings into shell variables, applying defaults.
resolve_integration_config() {
    local env_file
    env_file="$(integration_env_file)"

    POSTGRES_TEST_USER="$(config_value POSTGRES_TEST_USER "$env_file")"
    POSTGRES_TEST_PASSWORD="$(config_value POSTGRES_TEST_PASSWORD "$env_file")"
    POSTGRES_TEST_DB="$(config_value POSTGRES_TEST_DB "$env_file")"
    POSTGRES_TEST_HOST="$(config_value POSTGRES_TEST_HOST "$env_file")"
    POSTGRES_TEST_PORT="$(config_value POSTGRES_TEST_PORT "$env_file")"
    TEST_DATABASE_URL="$(config_value TEST_DATABASE_URL "$env_file")"

    POSTGRES_TEST_HOST="${POSTGRES_TEST_HOST:-127.0.0.1}"
    POSTGRES_TEST_PORT="${POSTGRES_TEST_PORT:-5432}"
    POSTGRES_TEST_DB="${POSTGRES_TEST_DB:-postgres}"
}

# Path to the authoritative development environment file.
dev_env_file() {
    printf '%s\n' "${LIB_ROOT_REPO}/src/backend/src/environment/dev.env"
}

# Load development database provisioning settings into shell variables.
resolve_dev_config() {
    local env_file
    env_file="$(dev_env_file)"

    POSTGRES_DEV_DB="$(config_value POSTGRES_DEV_DB "$env_file")"
    POSTGRES_DEV_USER="$(config_value POSTGRES_DEV_USER "$env_file")"
    POSTGRES_DEV_PASSWORD="$(config_value POSTGRES_DEV_PASSWORD "$env_file")"
    POSTGRES_MIGRATE_USER="$(config_value POSTGRES_MIGRATE_USER "$env_file")"
    POSTGRES_MIGRATE_PASSWORD="$(config_value POSTGRES_MIGRATE_PASSWORD "$env_file")"

    POSTGRES_DEV_DB="${POSTGRES_DEV_DB:-expensetracker_dev}"
    POSTGRES_DEV_USER="${POSTGRES_DEV_USER:-expensetracker_app}"
    POSTGRES_MIGRATE_USER="${POSTGRES_MIGRATE_USER:-expensetracker_migrate}"
}

# True when a host string targets the local machine only.
is_local_host() {
    case "$1" in
        localhost|127.0.0.1|::1|'[::1]') return 0 ;;
        *) return 1 ;;
    esac
}
