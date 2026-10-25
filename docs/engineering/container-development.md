# Backend Container Development

This document describes how to build, run, test, and migrate the backend (and run the mobile tests) with Docker. Go Task is the single source of truth for developers: run `task --list` to see every available command.

## File conventions

- Backend Dockerfile: `src/backend/docker/Dockerfile` (build context `src/backend`, ignore file `src/backend/.dockerignore`)
- Mobile Dockerfile: `src/mobile/docker/Dockerfile` (build context `src/mobile`, ignore file `src/mobile/.dockerignore`)

Both contexts exclude `node_modules`, environment files, logs, coverage, and caches; the backend Prisma client is regenerated inside its image.

## Backend targets

| Target | Responsibility |
| --- | --- |
| `development` | Full source + dev dependencies; `npm run start:dev` (nodemon) |
| `test` | Full source + test dependencies; `npm test` |
| `migrate` | Prisma CLI + schema/migrations; `npx prisma migrate deploy` |
| `production` | Minimal non-root runtime; `node src/server.js` |

## Task commands (primary)

```bash
task docker:build                        # production image (default)
task docker:build TARGET=test            # any target: production|development|test|migrate

task docker:test                         # build + run backend unit tests
task docker:test:integration             # Linux/CI host-network integration suite
task docker:test:mobile                  # build + run mobile test suite

task docker:dev                          # backend development container (hot reload)
task docker:run:production               # local production container
task docker:migrate                      # apply migrations with the migrate image
```

CI composes the Docker targets through a dedicated task family, so the local
developer commands stay focused and CI-specific combinations live in one place:

```bash
task ci:backend-static                   # static validation + unit tests
task ci:backend-integration              # DB integration tests
task ci:backend-image                    # image build + smoke test
task ci:mobile                           # mobile install/check/test
task ci:python                           # Python tooling tests + manifest validation
task ci:check                            # all of the above
```

Required values are passed as Task variables; the tasks fail fast with a clear message when they are missing:

```bash
task docker:run:production \
  DATABASE_URL='postgresql://expensetracker_app:<password>@127.0.0.1:5432/expensetracker_dev' \
  JWT_SECRET='<secret>'

task docker:migrate \
  MIGRATION_DATABASE_URL='postgresql://expensetracker_migrate:<password>@127.0.0.1:5432/expensetracker_dev'

task docker:test:integration \
  TEST_DATABASE_URL='postgresql://postgres:<password>@127.0.0.1:5432/postgres'
```

`docker:dev` requires `src/backend/src/environment/dev.env` to exist on the host; the source tree is bind-mounted for hot reload, and anonymous volumes isolate `node_modules`, the generated Prisma client, and logs from the host checkout.

Port publishing is parameterized on the run tasks: `BIND_HOST` (default `127.0.0.1`), `HOST_PORT` (default `7001`), and `CONTAINER_PORT` (default `7001`, kept in sync with the app's `PORT`). For example:

```bash
task docker:dev HOST_PORT=7002
task docker:run:production HOST_PORT=7002 DATABASE_URL='...' JWT_SECRET='...'
```

`docker:dev` also accepts `SOURCE_MOUNT`, `NODE_MODULES_VOLUME`, `GENERATED_VOLUME`, and `LOGS_VOLUME` when a non-default mount layout is required; the defaults are the repository paths above.

## Run production

The production runtime binds `0.0.0.0:7001` and needs `DATABASE_URL`; `JWT_SECRET` is required for authenticated requests.

```bash
task docker:run:production DATABASE_URL='...' JWT_SECRET='...'
```

The liveness endpoint is `GET /api/v1/health`; the container health check polls it every 30 seconds with a 20-second startup grace period. It verifies the process is alive, not database readiness.

## Run development

`npm run start:dev` reads `nodemon.json`, whose exec command loads `src/environment/dev.env`. The task bind-mounts the backend source for hot reload and masks `node_modules` and the generated client with anonymous volumes:

```bash
task docker:dev
```

## Run tests

Backend unit tests run in the `test` image and propagate a nonzero exit status on failure:

```bash
task docker:test
```

Static checks remain host-native via `task prisma:validate` and `task docs:validate`, or bundled with the unit suite for CI via `task ci:backend-static`.

Database-backed integration suites are named `*.integration.test.js` (see `docs/engineering/testing-strategy.md`). Run them host-natively on macOS:

```bash
task test:integration
```

Run them in the `test` image on Linux/CI with host networking:

```bash
task docker:test:integration TEST_DATABASE_URL='postgresql://postgres:<password>@127.0.0.1:5432/postgres'
```

## Run migrations

The `migrate` target contains the Prisma CLI and runs only the non-destructive `prisma migrate deploy`:

```bash
task docker:migrate MIGRATION_DATABASE_URL='...'
```

The API runtime never performs migrations, and the migration role remains separate from the application runtime role.

## Mobile test runner

The mobile app has an independent test runner at `src/mobile/docker/Dockerfile` (target `test`). It runs the Node built-in test suite (TypeScript via Node 24's native type stripping), not native Android/iOS builds.

```bash
task docker:test:mobile
```

## Multi-component testing

The repository has three test categories: backend Node.js tests, mobile React Native/Expo tests, and Python tooling tests under `scripts/`. Each has its own entry point; no image gains unrelated dependencies:

```bash
task docker:test        # backend (Docker)
task docker:test:mobile # mobile (Docker)
python3 -m unittest discover -s scripts/github_tickets/tests -v   # Python tooling
```

Future CI orchestration (#30) composes these as separate jobs.

## Manual Docker reference

The raw commands below are the equivalents the Task commands wrap; they are useful when writing CI workflows or debugging:

```bash
docker build -f src/backend/docker/Dockerfile --target production -t expensetracker-backend:production src/backend
docker run --rm expensetracker-backend:test
docker run --rm expensetracker-backend:test npm run docs:validate
docker run --rm expensetracker-backend:test npx prisma validate
docker build -f src/mobile/docker/Dockerfile --target test -t expensetracker-mobile:test src/mobile
```
