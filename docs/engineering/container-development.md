# Backend Container Development

This document describes how to build, run, test, and migrate the backend with the multi-stage Docker image introduced by issue #43. The architecture rationale is in `docs/infrastructure/architecture.md`.

## File convention

- Dockerfile: `src/backend/docker/Dockerfile`
- Build context: `src/backend`
- `.dockerignore`: `src/backend/.dockerignore`

The build context excludes `node_modules`, environment files, logs, coverage, and the gitignored Prisma client; the client is regenerated inside the image.

## Targets

| Target | Responsibility |
| --- | --- |
| `development` | Full source + dev dependencies; `npm run start:dev` (nodemon) |
| `test` | Full source + test dependencies; `npm test` |
| `migrate` | Prisma CLI + schema/migrations; `npx prisma migrate deploy` |
| `production` | Minimal non-root runtime; `node src/server.js` |

## Build

```bash
docker build -f src/backend/docker/Dockerfile --target development -t expensetracker-backend:development src/backend
docker build -f src/backend/docker/Dockerfile --target test -t expensetracker-backend:test src/backend
docker build -f src/backend/docker/Dockerfile --target migrate -t expensetracker-backend:migrate src/backend
docker build -f src/backend/docker/Dockerfile --target production -t expensetracker-backend:production src/backend
```

All targets build from a clean checkout; no host-generated Prisma files are required.

## Run production

The production runtime binds `0.0.0.0:7001` and expects configuration via environment variables. `DATABASE_URL` is required; `JWT_SECRET` is required for authenticated requests but not for process startup.

```bash
docker run --rm -p 7001:7001 \
  -e DATABASE_URL='postgresql://expensetracker_app:...@host.docker.internal:5432/expensetracker_dev' \
  -e JWT_SECRET='local-only-secret' \
  expensetracker-backend:production
```

The liveness endpoint is `GET /api/v1/health`; the container health check polls it every 30 seconds with a 20-second startup grace period. It verifies the process is alive, not database readiness.

## Run development

`npm run start:dev` reads `nodemon.json`, whose exec command loads `src/environment/dev.env`. That file is intentionally not in the image, so provide it as a read-only bind mount:

```bash
docker run --rm -p 7001:7001 \
  -v "$(pwd)/src/backend/src/environment/dev.env:/app/src/environment/dev.env:ro" \
  expensetracker-backend:development
```

## Run tests

Backend unit and static tests run inside the `test` target and return a nonzero exit status on failure:

```bash
docker run --rm expensetracker-backend:test
docker run --rm expensetracker-backend:test npm run docs:validate
docker run --rm expensetracker-backend:test npx prisma validate
```

Database-backed integration tests require `RUN_DB_INTEGRATION=1` and a localhost PostgreSQL per the repository's safety harness. They are named `*.integration.test.js` (see `docs/engineering/testing-strategy.md`) so `task test:integration` discovers them automatically. These tests are intentionally not run by the default `test` target.

Run them host-natively on macOS (Docker Desktop does not support Linux host networking):

```bash
task test:integration
```

Run them inside the `test` image on a Linux runner with host networking and an isolated localhost PostgreSQL:

```bash
docker run --rm --network host \
  -e RUN_DB_INTEGRATION=1 \
  -e TEST_DATABASE_URL='postgresql://postgres:<password>@localhost:5432/postgres' \
  -e JWT_SECRET='test-only-secret' \
  -e NODE_OPTIONS=--experimental-vm-modules \
  expensetracker-backend:test \
  npx jest --runInBand --testPathPatterns='\.integration\.test\.js$'
```

## Run migrations

The `migrate` target contains the Prisma CLI and runs only the non-destructive `prisma migrate deploy`:

```bash
docker run --rm \
  -e MIGRATION_DATABASE_URL='postgresql://expensetracker_migrate:...@host.docker.internal:5432/expensetracker_dev' \
  expensetracker-backend:migrate
```

The API runtime never performs migrations, and the migration role remains separate from the application runtime role.

## Multi-component testing

The repository has three test categories: backend Node.js tests, mobile React Native/Expo tests, and Python tooling tests under `scripts/`. The backend `test` target covers only backend tests. Mobile and Python tests stay out of the backend image and are orchestrated as separate jobs in the future CI workflow: backend checks in this image, mobile checks natively with Node, and Python checks with `python3 -m unittest discover -s scripts/github_tickets/tests -v`.
