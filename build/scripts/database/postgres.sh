#!/usr/bin/env bash
# PostgreSQL container lifecycle using the Docker CLI (no Docker Compose).
#
# Subcommands: up, down, status, logs, provision-test, create-dev, finalize-dev.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../lib.sh"

resolve_integration_config

require_docker() {
    if ! docker info >/dev/null 2>&1; then
        echo "ERROR: Docker is not available or not running" >&2
        exit 2
    fi
}

container_state() {
    docker inspect -f '{{.State.Status}}' "$PG_CONTAINER" 2>/dev/null || true
}

is_safe_identifier() {
    [[ "$1" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]]
}

role_exists() {
    local admin_user="$1" admin_db="$2" role="$3" result
    result="$(docker exec "$PG_CONTAINER" psql -U "$admin_user" -d "$admin_db" -tAc \
        "SELECT 1 FROM pg_roles WHERE rolname = '$role'" 2>/dev/null || true)"
    [ "$result" = "1" ]
}

database_exists() {
    local admin_user="$1" admin_db="$2" db="$3" result
    result="$(docker exec "$PG_CONTAINER" psql -U "$admin_user" -d "$admin_db" -tAc \
        "SELECT 1 FROM pg_database WHERE datname = '$db'" 2>/dev/null || true)"
    [ "$result" = "1" ]
}

# Remove the runtime role's privileges on Prisma's migration bookkeeping table.
# The table only exists after the first migration is applied, so the statement
# is skipped when it is absent. This keeps the runtime role limited to
# application data even though the migration role owns the schema.
revoke_migration_table_access() {
    local admin_user="$1" dev_db="$2" app_user="$3"
    docker exec -i "$PG_CONTAINER" psql -U "$admin_user" -d "$dev_db" -v ON_ERROR_STOP=1 >/dev/null <<SQL
SELECT format('REVOKE ALL PRIVILEGES ON TABLE public._prisma_migrations FROM %I', '$app_user')
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '_prisma_migrations')
\gexec
SQL
}

wait_until_ready() {
    local i
    for i in $(seq 1 30); do
        if docker exec "$PG_CONTAINER" pg_isready -U "$POSTGRES_TEST_USER" >/dev/null 2>&1; then
            echo "PostgreSQL is ready on 127.0.0.1:${POSTGRES_TEST_PORT}"
            return 0
        fi
        sleep 1
    done
    echo "ERROR: PostgreSQL did not become ready" >&2
    exit 1
}

cmd_up() {
    require_docker
    local state
    state="$(container_state)"

    if [ "$state" = "running" ]; then
        echo "Container $PG_CONTAINER is already running"
    elif [ "$state" = "exited" ] || [ "$state" = "created" ] || [ "$state" = "paused" ]; then
        echo "Starting existing container $PG_CONTAINER"
        docker start "$PG_CONTAINER" >/dev/null
    elif [ -n "$state" ]; then
        echo "ERROR: container $PG_CONTAINER is in unexpected state '$state'" >&2
        exit 2
    else
        if [ -z "${POSTGRES_TEST_USER:-}" ] || [ -z "${POSTGRES_TEST_PASSWORD:-}" ]; then
            echo "ERROR: POSTGRES_TEST_USER and POSTGRES_TEST_PASSWORD are required to create a new container." >&2
            echo "       Configure them in $(integration_env_file) (copy $(integration_env_file).example)." >&2
            exit 2
        fi
        echo "Creating container $PG_CONTAINER from $PG_IMAGE"
        export POSTGRES_USER="$POSTGRES_TEST_USER"
        export POSTGRES_PASSWORD="$POSTGRES_TEST_PASSWORD"
        export POSTGRES_DB="$POSTGRES_TEST_DB"
        docker run -d --name "$PG_CONTAINER" \
            -e POSTGRES_USER -e POSTGRES_PASSWORD -e POSTGRES_DB \
            -p "127.0.0.1:${POSTGRES_TEST_PORT}:5432" \
            -v "$PG_VOLUME:/var/lib/postgresql/data" \
            "$PG_IMAGE" >/dev/null
    fi

    wait_until_ready
}

cmd_down() {
    require_docker
    if [ -z "$(container_state)" ]; then
        echo "Container $PG_CONTAINER does not exist" >&2
        exit 1
    fi
    docker stop "$PG_CONTAINER"
    echo "Stopped container $PG_CONTAINER (data preserved)"
}

cmd_status() {
    require_docker
    local state
    state="$(container_state)"
    if [ -z "$state" ]; then
        echo "container $PG_CONTAINER: not present"
        exit 1
    fi
    echo "container $PG_CONTAINER: $state"
    if [ "$state" = "running" ]; then
        if docker exec "$PG_CONTAINER" pg_isready -U "$POSTGRES_TEST_USER" >/dev/null 2>&1; then
            echo "postgresql: ready"
        else
            echo "postgresql: not ready"
        fi
    else
        echo "postgresql: not running"
    fi
}

cmd_logs() {
    require_docker
    if [ -z "$(container_state)" ]; then
        echo "Container $PG_CONTAINER does not exist" >&2
        exit 1
    fi
    docker logs --tail "$DB_LOG_TAIL" -f "$PG_CONTAINER"
}

cmd_provision_test() {
    require_docker
    local state
    state="$(container_state)"
    if [ "$state" != "running" ]; then
        echo "ERROR: container $PG_CONTAINER must be running" >&2
        exit 2
    fi
    if [ -z "${POSTGRES_TEST_USER:-}" ] || [ -z "${POSTGRES_TEST_PASSWORD:-}" ]; then
        echo "ERROR: POSTGRES_TEST_USER and POSTGRES_TEST_PASSWORD are required" >&2
        echo "       Set them in $(integration_env_file)." >&2
        exit 2
    fi

    # Escape single quotes so values are safe inside SQL string literals on
    # stdin. The password never appears in the psql process arguments.
    local role escaped_pw
    role="${POSTGRES_TEST_USER//\'/\'\'}"
    escaped_pw="${POSTGRES_TEST_PASSWORD//\'/\'\'}"

    docker exec -i "$PG_CONTAINER" psql -U "$POSTGRES_TEST_USER" -d "$POSTGRES_TEST_DB" -v ON_ERROR_STOP=1 >/dev/null <<SQL
SELECT format('CREATE ROLE %I LOGIN CREATEDB PASSWORD %L', '${role}', '${escaped_pw}')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${role}')
\gexec
SQL

    echo "Test role '$POSTGRES_TEST_USER' is present with LOGIN and CREATEDB"
}

cmd_create_dev() {
    require_docker
    local state
    state="$(container_state)"
    if [ "$state" != "running" ]; then
        echo "ERROR: container $PG_CONTAINER must be running (run 'task db:up')" >&2
        exit 2
    fi
    wait_until_ready

    resolve_dev_config

    local admin_user="${POSTGRES_TEST_USER:-}" admin_db="${POSTGRES_TEST_DB:-postgres}"
    local dev_db="$POSTGRES_DEV_DB" app_user="$POSTGRES_DEV_USER" migrate_user="$POSTGRES_MIGRATE_USER"
    local app_pw="${POSTGRES_DEV_PASSWORD:-}" migrate_pw="${POSTGRES_MIGRATE_PASSWORD:-}"

    if [ -z "$admin_user" ] || [ -z "${POSTGRES_TEST_PASSWORD:-}" ]; then
        echo "ERROR: POSTGRES_TEST_USER and POSTGRES_TEST_PASSWORD are required" >&2
        echo "       Set them in $(integration_env_file)." >&2
        exit 2
    fi
    if [ -z "$app_pw" ] || [ -z "$migrate_pw" ]; then
        echo "ERROR: POSTGRES_DEV_PASSWORD and POSTGRES_MIGRATE_PASSWORD are required" >&2
        echo "       Set them in $(dev_env_file) (copy $(dev_env_file).example)." >&2
        exit 2
    fi

    local id
    for id in "$admin_user" "$admin_db" "$dev_db" "$app_user" "$migrate_user"; do
        if ! is_safe_identifier "$id"; then
            echo "ERROR: unsafe PostgreSQL identifier '$id'" >&2
            exit 2
        fi
    done

    if ! is_local_host "${POSTGRES_TEST_HOST:-127.0.0.1}"; then
        echo "ERROR: refusing to provision a non-local PostgreSQL host" >&2
        exit 2
    fi

    # Escape single quotes for safe SQL string literals. Credentials are fed to
    # psql on stdin and never appear in process arguments or in this output.
    local app_pw_lit migrate_pw_lit
    app_pw_lit="${app_pw//\'/\'\'}"
    migrate_pw_lit="${migrate_pw//\'/\'\'}"

    if role_exists "$admin_user" "$admin_db" "$migrate_user"; then
        echo "Role '$migrate_user' already exists"
    else
        docker exec -i "$PG_CONTAINER" psql -U "$admin_user" -d "$admin_db" -v ON_ERROR_STOP=1 >/dev/null <<SQL
CREATE ROLE "$migrate_user" LOGIN CREATEDB PASSWORD '$migrate_pw_lit';
SQL
        echo "Created role '$migrate_user' (LOGIN, CREATEDB)"
    fi

    if role_exists "$admin_user" "$admin_db" "$app_user"; then
        echo "Role '$app_user' already exists"
    else
        docker exec -i "$PG_CONTAINER" psql -U "$admin_user" -d "$admin_db" -v ON_ERROR_STOP=1 >/dev/null <<SQL
CREATE ROLE "$app_user" LOGIN PASSWORD '$app_pw_lit';
SQL
        echo "Created role '$app_user' (LOGIN)"
    fi

    if database_exists "$admin_user" "$admin_db" "$dev_db"; then
        echo "Database '$dev_db' already exists"
    else
        docker exec -i "$PG_CONTAINER" psql -U "$admin_user" -d "$admin_db" -v ON_ERROR_STOP=1 >/dev/null <<SQL
CREATE DATABASE "$dev_db" OWNER "$migrate_user";
SQL
        echo "Created database '$dev_db' (owner: $migrate_user)"
    fi

    docker exec -i "$PG_CONTAINER" psql -U "$admin_user" -d "$dev_db" -v ON_ERROR_STOP=1 >/dev/null <<SQL
SELECT format('GRANT CONNECT ON DATABASE %I TO %I', '$dev_db', '$app_user') \gexec
SELECT format('GRANT USAGE ON SCHEMA public TO %I', '$app_user') \gexec
SELECT format('GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO %I', '$app_user') \gexec
SELECT format('GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO %I', '$app_user') \gexec
SELECT format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO %I', '$migrate_user', '$app_user') \gexec
SELECT format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO %I', '$migrate_user', '$app_user') \gexec
SQL

    revoke_migration_table_access "$admin_user" "$dev_db" "$app_user"

    echo "Development database '$dev_db' is ready"
    echo "  schema owner: $migrate_user (migration role, may create shadow databases)"
    echo "  runtime role: $app_user (SELECT/INSERT/UPDATE/DELETE on public tables)"
}

cmd_finalize_dev() {
    require_docker
    local state
    state="$(container_state)"
    if [ "$state" != "running" ]; then
        echo "ERROR: container $PG_CONTAINER must be running (run 'task db:up')" >&2
        exit 2
    fi

    resolve_dev_config

    local admin_user="${POSTGRES_TEST_USER:-}" admin_db="${POSTGRES_TEST_DB:-postgres}"
    local dev_db="$POSTGRES_DEV_DB" app_user="$POSTGRES_DEV_USER"
    local id
    for id in "$admin_user" "$admin_db" "$dev_db" "$app_user"; do
        if ! is_safe_identifier "$id"; then
            echo "ERROR: unsafe PostgreSQL identifier '$id'" >&2
            exit 2
        fi
    done

    revoke_migration_table_access "$admin_user" "$dev_db" "$app_user"
    echo "Runtime role '$app_user' has no privileges on Prisma's migration bookkeeping table"
}

case "${1:-}" in
    up) cmd_up ;;
    down) cmd_down ;;
    status) cmd_status ;;
    logs) cmd_logs ;;
    provision-test) cmd_provision_test ;;
    create-dev) cmd_create_dev ;;
    finalize-dev) cmd_finalize_dev ;;
    *)
        echo "Usage: postgres.sh {up|down|status|logs|provision-test|create-dev|finalize-dev}" >&2
        exit 2
        ;;
esac
