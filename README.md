# ExpenseTracker

ExpenseTracker is a personal finance application for tracking income and expenses, managing categories, and setting budgets. It consists of an Expo/React Native mobile client and a Node.js/Express API backed by PostgreSQL.

## Structure

| Directory | Purpose |
| --- | --- |
| `src/backend/` | Express 5 API in ES modules, Prisma 7 + PostgreSQL, JWT auth |
| `src/mobile/` | Expo SDK 57 app with TypeScript and `expo-router` |
| `build/` | Go Task orchestration and Bash helper scripts |
| `docs/` | Architecture and engineering guidance |
| `Taskfile.yml` | Entry point for developer commands |

The two packages are independent (separate `package.json` files); Go Task orchestrates them. There is no root npm workspace.

## Getting started

```bash
task install          # install backend + mobile dependencies
task --list           # list all developer commands
task backend:dev      # run the API in watch mode
task mobile:dev       # start the Expo app
```

### Installing Task

Go Task is the only required developer tool beyond Node.js, npm, and Docker.
The verified minimum version is **v3.54.0**.

```bash
# macOS
brew install go-task/tap/go-task

# Linux
sh -c "$(curl -sL https://taskfile.dev/install.sh)" -- -d
```

Windows developers should use WSL or Git Bash. Task must be available on
`PATH`; run `task --version` to confirm.

Backend configuration lives in environment files under `src/backend/src/environment/` (gitignored); see `src/mobile/.env.example` for the mobile environment variables.

## Developer commands

The root `Taskfile.yml` is the developer command interface. Run `task --list`
for the full list; the most common commands are:

```bash
task dev                # start backend + mobile together
task backend:dev        # backend only (task backend:dev PORT=4000)
task mobile:dev         # Expo app only
task db:up              # start or create the local PostgreSQL container
task db:down            # stop the PostgreSQL container (data kept)
task db:status          # show container + readiness state
task db:logs            # tail PostgreSQL logs
task db:create-dev      # provision expensetracker_dev + roles (idempotent)
task test               # standard backend tests (integration skipped)
task test:integration   # real-PostgreSQL integration tests
task docs:validate      # validate the OpenAPI specification
task backend:docs       # backend with Swagger enabled
task prisma:validate    # validate the Prisma schema (read-only)
task prisma:deploy      # apply committed migrations (noninteractive)
task prisma:status      # show migration state
task check              # backend + mobile quality checks
```

Legacy `make` commands map to their Task equivalents:

| Old (`make`) | New (`task`) |
| --- | --- |
| `make dev` | `task dev` |
| `make backend-dev` | `task backend:dev` |
| `make frontend-dev` | `task mobile:dev` |
| `make db-up` / `db-down` / `db-status` / `db-logs` | `task db:up` / `db:down` / `db:status` / `db:logs` |
| `make test-backend` | `task test` |
| `make test-integration` | `task test:integration` |
| `make docs-validate` / `docs-test` / `docs-check` | `task docs:validate` / `docs:test` / `docs:check` |
| `make check` | `task check` |
| `make start-backend-dev` | `task backend:dev` |
| `make start-mobile` | `task mobile:dev` |

## Local PostgreSQL database

Development uses a persistent, locally hosted PostgreSQL 16 instance in Docker.
It replaces the previous Neon-hosted development database: local development
never connects to Neon. The container is `expensetracker-postgres` (image
`postgres:16-alpine`) and binds only to `127.0.0.1:5432`; its data lives in the
named volume `expensetracker-postgres-data`.

Data survives application and container restarts, Docker daemon restarts, and
`task db:down` / `task db:up`. **Stopping the container does not delete data.**
Deleting the named Docker volume destroys the database unless a backup exists;
no backup automation is configured yet.

Two roles keep runtime access and schema management separate:

- `expensetracker_app` — runtime role (login only; no superuser, no CREATEDB).
- `expensetracker_migrate` — migration role (owns the schema; may create the
  shadow databases Prisma uses during `migrate dev`).

Integration tests use their own administrative role and disposable databases;
they never drop, truncate, or otherwise touch `expensetracker_dev`.

### One-time setup

```bash
cp src/backend/src/environment/dev.env.example src/backend/src/environment/dev.env
# edit dev.env: set JWT_SECRET and the two role passwords
cp src/backend/src/environment/integration.env.example src/backend/src/environment/integration.env
# edit integration.env: set the container superuser password

task db:up          # start or reuse the persistent container
task db:create-dev  # idempotently provision expensetracker_dev + roles
task prisma:deploy  # apply committed migrations (noninteractive)
task backend:dev
```

### Daily development

```bash
task db:up
task backend:dev
```

### Schema changes

```bash
task prisma:migrate -- --name add_some_table   # create + apply a migration
task prisma:deploy                             # apply committed migrations only
task prisma:status                             # show migration state
```

Connection settings are environment-driven: the local development environment
points at `127.0.0.1:5432`, while future containerized environments can use a
service hostname such as `postgres:5432` without changing application code.

## Testing

```bash
task test              # Jest + Supertest with coverage
task test:integration  # gated real-PostgreSQL integration suites
task lint              # mobile lint (no mobile test script yet)
```

> Go Task must be installed separately; see the installation notes above.

## Documentation

- [System overview](docs/architecture/system-overview.md)
- [Coding standards](docs/engineering/coding-standards.md)
- [Design principles](docs/engineering/design-principles.md)
- [Testing strategy](docs/engineering/testing-strategy.md)
- [Backend API documentation](docs/backend-documentation.md)
- [Architecture decisions](docs/decisions/README.md)
- [GitHub ticket automation](tickets/README.md)
- [Product domain design](docs/architecture/product-domain-design.md)

### Product strategy

- [Product vision](docs/product/product-vision.md)
- [Current feature inventory](docs/product/current-feature-inventory.md)
- [Market research](docs/product/market-research.md)
- [Competitive analysis](docs/product/competitive-analysis.md)
- [Feature opportunities](docs/product/feature-opportunities.md)
- [Target users](docs/product/target-users.md)
- [Subscription strategy](docs/product/subscription-strategy.md)
- [Product roadmap](docs/product/product-roadmap.md)
- [Product requirements](docs/product/product-requirements.md)
- [Success metrics](docs/product/success-metrics.md)

Traceability: vision -> target users -> feature opportunities -> subscription strategy -> roadmap -> product requirements -> conceptual domain design, with engineering standards and testing strategy governing implementation.
