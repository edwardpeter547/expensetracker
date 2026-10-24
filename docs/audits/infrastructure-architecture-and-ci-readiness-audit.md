# Infrastructure Architecture, Docker, CI/CD, and DevOps Roadmap Audit

**Repository:** `edwardpeter547/expensetracker`
**Primary integration branch:** `develop`
**Audit date:** 2026-10-24
**Audit basis:** checked-out branch `py/issue-89-application-improvement-foundation` (HEAD `6c3ed0b`), clean working tree
**Nature:** Read-only architecture assessment and implementation-planning task. No source, Docker, Taskfile, workflow, issue, branch, or database changes were made.

---

## 1. Executive Summary

The repository has a mature local development story but **no automated pull-request validation and no application containerization**. The local PostgreSQL provisioning is Docker-based and unusually well guarded (`build/scripts/database/postgres.sh`), and Go Task is a coherent command interface. What is missing is the layer that makes this repeatable for every contributor and every pull request: a multi-stage backend Dockerfile, Docker Compose for development and tests, and a GitHub Actions pipeline that runs the existing checks against `develop`.

The single most consequential verified fact for the Docker design is that **the Prisma generated client is gitignored** (`src/backend/.gitignore:25`), so any container must run `prisma generate`. Prisma resolves to **7.9.1**, which requires Node `^20.19 || ^22.12 || >=24.0` and uses an **embedded WASM query compiler** (`query_compiler_fast_bg.wasm-base64.js`) rather than a Rust engine. The backend's runtime dependencies are otherwise pure JavaScript (`bcryptjs`, `pg`, `jsonwebtoken`, `express`, `winston`, `nodemailer` — no sharp/canvas/sqlite3). These two facts make a small `node:22-alpine` image viable and make a dedicated "Prisma generate" build stage mandatory.

The recommended architecture is **Option B (container-first development and CI)**, refined for this repository:

- One multi-stage backend `Dockerfile` with named targets `development`, `test`, `build` (Prisma generate), and `production`.
- One `compose.yaml` using profiles for a development database, a development backend, and disposable integration-test services.
- Go Task remains the single developer interface, with a small number of new `docker:*` and `ci:*` tasks; the production image never contains the Task CLI.
- One GitHub Actions workflow (`ci.yml`) triggered on `pull_request` to `develop`, `push` to `develop`, and `workflow_dispatch`, running four jobs: backend static checks, backend integration tests (containerized against an ephemeral PostgreSQL service), production-image build/smoke test, and mobile validation (native, no mobile binary builds).

The immediate, highest-value ticket work is **#43 (backend Dockerfile), #3/#5 (Compose), and #30 (GitHub Actions PR validation)**. Stories #31–#38 (Kubernetes, Sentry, Terraform/Ansible, Redis, Celery, caching) are **deferred** — they solve problems that do not exist at this stage and would add premature complexity.

---

## 2. Audit Scope and Methodology

### Scope

Epic #29 and its full child hierarchy; the current Task/script/Docker tooling; backend and mobile package scripts; Prisma configuration, migrations, and generated-client handling; environment-variable flow; test infrastructure; and the design space for Docker, Compose, Go Task, and GitHub Actions.

### Method

1. Read `AGENTS.md` and root `README.md`.
2. Retrieved Epic #29 and all child issue bodies/acceptance criteria via read-only GitHub CLI (native `parent`/`subIssues` hierarchy).
3. Inspected `Taskfile.yml`, `build/Taskfile.yml`, `build/tasks/*.yml`, and `build/scripts/**`.
4. Inspected backend/mobile `package.json`, `package-lock.json`, `prisma.config.js`, `jest.config.js`, environment templates, `.gitignore`/`src/backend/.gitignore`.
5. Verified toolchain versions (`node`, `npm`, `task`, `docker`, `docker compose`) and Prisma/Expo engine requirements directly from installed packages.
6. Verified that the Prisma generated client is untracked and inspected its WASM/engine layout.
7. Confirmed `npx expo config --type public` and OpenAPI/Prisma validation run locally.

### Evidence classification

- **Verified:** confirmed against files, installed packages, or executed commands.
- **Recommendation:** a proposed design decision.
- **Future consideration:** relevant later, not now.
- **Decision required:** needs product/engineering sign-off before implementation.

No infrastructure was started, stopped, or modified during this audit.

---

## 3. Current Infrastructure Inventory

| Asset | Location | State |
| --- | --- | --- |
| Root Taskfile | `Taskfile.yml` | Present; includes `build/Taskfile.yml` |
| Task groups | `build/tasks/{database,development,documentation,network,prisma-tasks,quality,testing,utilities}.yml` | Present |
| PostgreSQL lifecycle | `build/scripts/database/postgres.sh` | Present; Docker CLI, container `expensetracker-postgres`, image `postgres:16-alpine`, volume `expensetracker-postgres-data`, binds `127.0.0.1:5432` |
| Integration harness | `build/scripts/testing/integration-env.sh` | Present; exports `RUN_DB_INTEGRATION=1`, `TEST_DATABASE_URL`, `NODE_ENV=testing` |
| Backend dev env template | `src/backend/src/environment/dev.env.example` | Present; `PORT=7001`, `DATABASE_URL`, `MIGRATION_DATABASE_URL`, role passwords |
| Integration env template | `src/backend/src/environment/integration.env.example` | Present; admin `postgres` role, host `127.0.0.1:5432` |
| Prisma config | `src/backend/prisma.config.js` | Present; datasource URL from `MIGRATION_DATABASE_URL` or `DATABASE_URL` |
| Prisma schema + migrations | `src/backend/src/prisma/` | Present; `init` + `decimal_and_currency` migrations committed |
| Prisma generated client | `src/backend/src/generated/` | **Gitignored** (`src/backend/.gitignore:25`) — regenerated locally |
| Backend tests | `src/backend/jest.config.js`, 25 test files | Present; 168 unit tests, 16 DB integration tests gated by `RUN_DB_INTEGRATION=1` |
| Mobile tests | `src/mobile/src/api/__tests__`, `src/localization/__tests__` | Present; 32 tests via Node test runner |
| OpenAPI + coverage test | `src/backend/openapi/openapi.yaml`, `src/docs/__tests__/apiDocs.test.js` | Present; `redocly` valid |
| Application Dockerfile | — | **Absent** |
| `.dockerignore` | — | **Absent** |
| Docker Compose file | — | **Absent** |
| GitHub Actions workflows | — | **Absent** (`.github/` has issue templates only) |

### Toolchain (verified)

```text
node  v24.19.0
npm   11.17.0
task  3.54.0
docker 29.7.2
docker compose v5.3.1
git   2.56.0
```

No `.nvmrc`, `.node-version`, `.tool-versions`, or top-level `engines` field pins the Node version. Prisma 7.9.1 is the effective constraint: `node: ^20.19 || ^22.12 || >=24.0`.

---

## 4. Existing Epic #29 Ticket Assessment

### Infrastructure issue assessment matrix

| Issue | Current scope | Implementation evidence | Status | Dependencies | Recommendation |
| --- | --- | --- | --- | --- | --- |
| #3 Dockerize Backend | Story: Dockerfile + dev/prod Compose + workflow | None (no Dockerfile/Compose) | OPEN | Backend API exists | **Implement**; refine scope (see below) |
| #4 Setup Development Dockerfiles | Task (empty body) | None | OPEN | #3 | **Consolidate into #43/#3** — overlaps exactly |
| #5 Setup Docker-compose to run services | Task (empty body) | None | OPEN | #3 | **Refine** into Compose profiles; resolve legacy-script coexistence |
| #6 DockerHub Repository | Task: registry + tagging | Closed; external registry repo created (not verifiable in-repo) | CLOSED | — | **No further action**; prefer GHCR for future images (see §13) |
| #43 Create Dockerfile (multi-stage) | Task: single multi-stage Dockerfile | None | OPEN | #3 | **Implement directly**; refine base image/port/stages |
| #30 GitHub Actions CI/CD | Story: backend/mobile CI + CD | None | OPEN | #3, #43 | **Split**: implement PR CI now; defer CD and mobile binary builds |
| #31 Kubernetes | Story: manifests, HPA, stateful Postgres | None | OPEN | #3, #30 | **Defer** to Phase D |
| #32 Sentry | Story: backend/mobile SDK, alerts | None | OPEN | Backend/Mobile | **Defer** to Phase C |
| #33 Dockerize PostgreSQL | Story: dev/test/prod DB images | Dev + test DB already Dockerized via `postgres.sh`; prod not | OPEN | #3 | **Refine** to "test DB in Compose/CI"; defer prod |
| #34 PostgreSQL Setup | Story: schema, migration, backups | Dev DB + migrations + integration harness exist; backups/monitoring absent | OPEN | #33 | **Refine** remaining work (backups/DR) to Phase C; defer prod |
| #35 Terraform & Ansible | Story: cloud IaC + config mgmt | None; no cloud provider chosen | OPEN | #30 | **Defer** — no deployment target exists |
| #36 Redis | Story: cache/session/rate limiting | None; no consumer | OPEN | #3 | **Defer** — stateless JWT sessions; in-memory limiter suffices now |
| #37 Celery | Story: task queue | None; Python/Celery inappropriate for a Node backend | OPEN | #36 | **Defer/re-scope** — future Node queue (BullMQ) if needed |
| #38 Caching Strategy | Story: Redis caching | None; no measured bottleneck | OPEN | #36 | **Defer** |
| #89 Application Foundation Improvement | Story (completed) | Go Task, connectivity, Decimal/currency/category fixes merged via PR #93 | CLOSED | — | **Done** (verified) |

### Key structural observations

- **#3, #4, #5, and #43 overlap heavily.** #43 is the concrete "write the Dockerfile" task; #4 is an empty duplicate of #43; #5 should be narrowed to the Compose file. #3 should remain the parent story and its acceptance criteria should be rewritten to match the current Go Task + `postgres.sh` reality (its body still references "Makefile targets" and a nonexistent `docker-compose.prod.yml` production tier).
- **#33 and #34 are substantially satisfied already.** The local dev database, role separation (`expensetracker_app` / `expensetracker_migrate`), migrations, and the disposable integration-test harness all exist. Only the CI test database and future production backup/monitoring remain.
- **#30 conflates CI and CD.** PR validation is the immediate need; staging/production deployment and mobile store publishing are premature and should be split out.
- **#37 is technically mis-scoped.** Celery is a Python worker; this backend is JavaScript. If background jobs are ever needed, a Node queue (e.g., BullMQ on Redis) is the appropriate equivalent — but not now.

### Work not adequately represented by existing tickets

The following are **gaps** and should be tracked (report-only; no tickets created): a concrete "GitHub Actions PR validation workflow" task under #30; a "Compose profiles for dev + integration tests" task under #3/#5; and a "contributor onboarding/README for Dockerized workflow" task under #3. No entirely new Epic is needed.

---

## 5. Infrastructure Gaps and Risks

| Severity | Gap / risk | Evidence |
| --- | --- | --- |
| High | No automated PR validation; regressions are only caught locally | `.github/` contains no `workflows/`; `gh pr list` shows merges with no checks |
| High | No application Dockerfile; no deployable/container-testable artifact | no `Dockerfile*`/`compose*` files in repo |
| High | Prisma generated client is gitignored, so builds must generate it; a naive `COPY . .` image would fail to boot | `src/backend/.gitignore:25`; `prisma.connect.js` imports `../generated/client.js` |
| Medium | Production server default binds `127.0.0.1`; a container must explicitly set `HOST=0.0.0.0` to be reachable | `src/backend/src/configurations/env.config.js:32` |
| Medium | No `.dockerignore`; a build context would include `node_modules`, `.env*`, logs, and coverage | no `.dockerignore` found |
| Medium | No pinned Node version anywhere, so local and CI environments can drift | no `.nvmrc`/`engines`; local Node 24 vs Prisma range |
| Medium | CI cannot reproduce the local DB guard because `postgres.sh` and `integration.env` are gitignored | `build/scripts/lib.sh` reads `integration.env` |
| Low | `docs/architecture/system-overview.md:67,89` misstates the generated-client path (`src/prisma/generated` vs actual `src/generated`) | file inspection |

---

## 6. Multi-Stage Docker Architecture

### Base image decision (verified rationale)

- **Node version:** pin `node:22` LTS (`^22.12` satisfies Prisma 7.9.1). Node 24 is also valid but 22 LTS is the conservative common denominator; document a one-line upgrade path.
- **Alpine vs Debian slim:** use **Alpine**. Every runtime dependency is pure JavaScript (`bcryptjs`, `pg`, `jsonwebtoken`, `express`, `winston`, `nodemailer`, `handlebars`, `helmet`, `cors`, `geoip-lite`); Prisma 7 uses an embedded WASM query compiler, not a glibc-linked Rust binary. No `node-gyp`/native build is needed. Alpine yields the smallest image and is fully supported by Node's official images.
- **Separate build stage:** required, but **not** for compilation — the backend is plain JavaScript. The build stage exists solely to run `npx prisma generate`, because the generated client is gitignored.

### Proposed stage graph

```text
base (node:22-alpine, non-root) --------------------> production
  |                                                       ^
deps (npm ci, all deps)                                   |
  |                                                       |
prisma (npx prisma generate) --+                          |
  |                            |                          |
development  test              +-- generated client ------+
                             (copied into production)
deps-prod (npm ci --omit=dev) ---------------------------+
```

### Target matrix

| Target | Purpose | Builds on | Entry point | Used by |
| --- | --- | --- | --- | --- |
| `base` | Shared non-root runtime foundation (`USER node`, `/app`, `NODE_ENV`) | — | — | all downstream targets |
| `deps` | Reproducible full dependency install (`npm ci`) | `base` | — | `prisma`, `development`, `test` |
| `deps-prod` | Reproducible production dependency install (`npm ci --omit=dev`) | `base` | — | `production` |
| `prisma` (alias `build`) | Generate the gitignored Prisma client | `deps` | — | `development`, `test`, `production` |
| `development` | Dev runtime with source + nodemon | `prisma` | `npm run start:dev` | Compose dev profile |
| `test` | Full test environment (Jest + supertest + Prisma client) | `prisma` | `npm test` or injected command | Compose test profile, CI |
| `production` | Minimal deployable runtime | `base` + `deps-prod` + `prisma` | `node src/server.js` (with `HOST=0.0.0.0`) | Production deploy, CI smoke test |

### Production-image minimization (critical requirement)

The `production` target must contain only:

- Production `node_modules` from `deps-prod` (`npm ci --omit=dev` excludes Jest, supertest, nodemon, ts-jest, redocly).
- The generated client copied from `prisma` (`/app/src/generated`).
- Application source (`src/`, excluding tests via `.dockerignore`).
- `package.json` (for metadata; scripts are unused at runtime).

It must **not** contain `src/**/__tests__`, `coverage/`, `.env*`, logs, `openapi` test fixtures, or the Prisma CLI/`prisma` dev dependency. A `test`-only file should be excluded by `.dockerignore`, and a post-build verification step should assert that `jest` and `supertest` are absent from the production image (see §17G).

### Other production requirements

- **Non-root:** `USER node` (uid 1000); `COPY --chown=node:node` for source and generated client.
- **Health check:** `HEALTHCHECK` using busybox `wget`: `wget -qO- http://127.0.0.1:${PORT:-7001}/api/v1/health`.
- **Migration execution:** do **not** run migrations on app startup. Run `npx prisma migrate deploy` as a separate one-shot step (Compose `migrate` service or CI migration step) with `MIGRATION_DATABASE_URL`, then start the runtime process with `DATABASE_URL` using the least-privilege `expensetracker_app` role.
- **Secrets/environment:** inject at runtime via environment variables; never bake `.env` into the image.
- **Port:** `EXPOSE 7001` (matches `dev.env.example` and `config.resolver.ts`).
- **Vulnerability/SCA scanning:** add a later Trivy/Grype scan or GitHub dependency review; do not block this phase on it.

---

## 7. Containerized Backend Testing Strategy

### Test matrix

| Check | Requires DB | Runs in Docker `test` target | Runs host-native | Notes |
| --- | --- | --- | --- | --- |
| Unit tests (middleware/utils/validations/services/controllers) | No | Yes | Yes | `npm test` |
| OpenAPI + route-contract test | No | Yes | Yes | `docs:test` |
| Prisma schema validation | No | Yes | Yes | `npx prisma validate` |
| OpenAPI lint | No | Yes | Yes | `npm run docs:validate` |
| Integration tests (refresh/logout + future auth/ownership) | Yes | Yes (with DB service) | Yes | `RUN_DB_INTEGRATION=1` |

### Isolation approach (recommended)

Use **one `test` image** rather than separate unit and integration images. The same target runs unit tests directly and runs DB-backed tests only when `RUN_DB_INTEGRATION=1` and `TEST_DATABASE_URL` is supplied. Splitting into two images adds maintenance without a build-time benefit: the DB requirement is a runtime/environment concern, not a dependency concern.

- **Local developer:** keeps the existing host-native `task test` / `task test:integration` (no forced Docker for day-to-day unit testing).
- **Local containerized:** `task docker:test` runs the full suite (unit + integration) inside Compose against a disposable PostgreSQL.
- **CI:** one backend job runs unit/static checks in the `test` image; a second job runs integration tests in the same image with a GitHub Actions `postgres:16-alpine` service.

### Separation alternatives considered

- *Separate unit vs integration images:* rejected — no dependency difference, more images to maintain.
- *Separate GitHub Actions jobs for unit vs integration:* **accepted** — different failure speeds and environment needs.
- *Compose profiles for dev vs test:* accepted for local ergonomics.
- *Ephemeral CI service without Compose:* accepted for CI (GH Actions services); Compose is the local equivalent.

### Conceptual test lifecycle

```text
1. Build image (target test) with BuildKit layer cache.
2. Unit/static job: docker run test npm test && npx prisma validate && npm run docs:validate
3. Integration job: start postgres:16-alpine service (CREATEDB superuser), wait pg_isready.
4. Run test image with --network host, RUN_DB_INTEGRATION=1,
   TEST_DATABASE_URL=postgresql://postgres:<ephemeral>@localhost:5432/postgres.
5. Harness creates disposable DBs, runs prisma db push, executes tests, drops DBs.
6. Upload JUnit/coverage artifacts; nonzero exit fails the job; cleanup runs on failure.
```

---

## 8. PostgreSQL Integration Test Isolation

### Existing harness (verified)

- Gated by `RUN_DB_INTEGRATION=1`; tests self-skip otherwise.
- `TEST_DATABASE_URL` must resolve to `localhost`/`127.0.0.1`/`::1` (`integration-env.sh:25-30` and `auth.service.refresh.integration.test.js:40-44`).
- The suite treats `TEST_DATABASE_URL` as an **administrative** connection, creates uniquely named databases (`${prefix}_${Date.now()}_${random}`), and drops only what it created.
- Schema is applied per disposable DB with `npx prisma db push` (`auth.service.refresh.integration.test.js:129`).
- One test also applies the committed init migration SQL explicitly to validate migration correctness.
- `task test:integration` sets `--runInBand`, serializing within a job.

### Required privileges

The admin role must have `CREATEDB`. Locally this is the default `postgres` superuser (`integration.env.example`). In CI the GH Actions `postgres:16-alpine` service's `postgres` superuser satisfies this.

### CI-specific requirement (important)

The localhost-only guard must be preserved, **not weakened**. On an `ubuntu-latest` runner, GitHub Actions service containers map their ports onto the runner's `localhost`. Therefore the backend test container must run with **`--network host`** (Compose `network_mode: host`) so its `localhost:5432` is the runner loopback where the service is published. This keeps `TEST_DATABASE_URL=postgresql://...@localhost:5432/...` valid without changing the safety check.

### Mandatory safety recommendations

1. Never set `TEST_DATABASE_URL` to a production/remote host; keep the existing guard.
2. Use a CI-only, ephemeral password for the PostgreSQL service; never reuse any real credential.
3. Add `pg_isready`/`healthcheck` to the service and wait for readiness before running tests.
4. Use `--runInBand` to avoid intra-job parallelism races.
5. Ensure `DROP DATABASE` runs in `afterAll`/`finally` so cleanup occurs on failure.
6. Give the integration job no secrets and `permissions: contents: read`.
7. Run integration tests on `push` to `develop` and PRs, but allow the job to be re-run manually.

---

## 9. Docker Compose Architecture

### Single file + profiles (recommended)

One `compose.yaml` at the repo root with named volumes, health checks, and profiles is simpler than multiple override files at this stage. Profiles avoid forcing every developer to run the DB when they only want tests.

### Service architecture table

| Service | Purpose | Build target | Depends on | Persistent data | Profile |
| --- | --- | --- | --- | --- | --- |
| `postgres-dev` | Persistent local development database | `postgres:16-alpine` | — | named volume `expensetracker_dev_data` | `dev` |
| `backend-dev` | Hot-reloading backend development | `development` | `postgres-dev` healthy | none (bind mount) | `dev` |
| `migrate` | One-shot `prisma migrate deploy` | `production` (or `prisma`) | `postgres-dev` healthy | none | `dev` (run manually) |
| `postgres-test` | Disposable integration-test database | `postgres:16-alpine` | — | tmpfs/ephemeral | `test` |
| `backend-test` | Runs backend test suite in container | `test` | `postgres-test` healthy | none | `test` |

### Design decisions

- **Networks:** one default network for each profile; `backend-test`/`postgres-test` isolated from `dev`.
- **Health checks:** `pg_isready -U postgres` for Postgres; `wget .../api/v1/health` for the backend dev/production services.
- **Volumes:** dev DB uses a named volume; test DB uses tmpfs or no volume so state never persists between runs.
- **Ports:** dev Postgres on `127.0.0.1:5432`; backend dev on `7001`. Test Postgres should use a different host port or be internal-only to avoid clashing with a running dev database.
- **Bind mounts:** `backend-dev` mounts `./src/backend:/app` and an anonymous `node_modules` volume so host `node_modules` does not shadow the image's install.
- **Environment:** pass only non-secret values through `compose.yaml`; secrets come from a gitignored `src/backend/src/environment/dev.env` (via `env_file`) or shell environment.

### Coexistence with `postgres.sh` (migration path)

The existing `expensetracker-postgres` container already owns host port `5432`. Introduce Compose **incrementally**:

1. **Now:** add Compose with the `test` profile only (ephemeral `postgres-test` on an internal network; no host port conflict). The existing `task db:*` and `postgres.sh` remain the dev database path.
2. **Next:** add the `dev` profile and document a one-time migration: `task db:down` (stops, keeps data), then `docker compose --profile dev up -d postgres-dev` reusing the same named volume if desired.
3. **Eventually:** make `task db:up/down/status/logs` thin wrappers over `docker compose` and retire the raw `docker run` path in `postgres.sh`. Do not run two database managers indefinitely; the transition period is bounded and documented.

### Local development and test lifecycle

```text
Development:
  docker compose --profile dev up -d postgres-dev
  docker compose --profile dev run --rm migrate     # one-time migration
  docker compose --profile dev up backend-dev

Tests:
  docker compose --profile test run --rm backend-test npm test
  docker compose --profile test run --rm backend-test \
    sh -c 'npx prisma validate && npm run docs:validate'
  docker compose --profile test run --rm backend-test npm run test:integration # via harness env
```

---

## 10. Go Task Integration Strategy

Go Task remains the developer entry point. The production image must **not** contain the Task CLI; Task orchestrates Docker/Compose from the host, and containers run `npm`/`node` commands directly. This removes any Task↔Compose recursion risk.

### Proposed command matrix

| Command | Operation | Host-native or Docker | New/Existing |
| --- | --- | --- | --- |
| `task db:up/down/status/logs/create-dev` | `postgres.sh` (dev DB) | Host-native | Existing — unchanged during transition |
| `task backend:dev`, `task mobile:dev`, `task dev` | local servers | Host-native | Existing — unchanged |
| `task prisma:generate/validate/migrate/deploy/status` | Prisma CLI | Host-native | Existing — unchanged |
| `task test`, `task test:unit` | `npm test` | Host-native | Existing — unchanged |
| `task test:integration` | `integration-env.sh jest ...` | Host-native | Existing — unchanged |
| `task docs:validate`, `task docs:test` | redocly + apiDocs test | Host-native | Existing — unchanged |
| `task lint`, `task test:mobile`, `task test:typecheck` | mobile checks | Host-native | Existing — unchanged |
| `task docker:build` | `docker build` (all targets or `--target`) | Docker | **New** |
| `task docker:up` | `docker compose --profile dev up -d` | Docker | **New** |
| `task docker:down` | `docker compose down` | Docker | **New** |
| `task docker:logs` | `docker compose logs -f` | Docker | **New** |
| `task docker:test` | `docker compose --profile test run --rm backend-test` | Docker | **New** |
| `task docker:test:integration` | same with `RUN_DB_INTEGRATION=1` | Docker | **New** |
| `task ci:check` | orchestrates backend + mobile checks | Both | **New** |
| `task ci:backend` | static + unit checks | Docker or host | **New** |
| `task ci:mobile` | mobile lint/typecheck/tests | Host-native | **New** |

### Design rules

- Docker tasks call `docker`/`docker compose`; they never invoke `task` inside a container.
- `ci:*` tasks are thin conveniences; GitHub Actions will call the underlying commands directly so workflow steps are explicit and auditable.
- Keep `build/tasks/*.yml` organized: add `docker.yml` and `ci.yml` includes rather than growing `development.yml`.
- Errors propagate naturally (`set -euo pipefail` in scripts; nonzero exit from `npm`/`docker`).
- Keep `task --list` descriptions accurate; avoid aliases that duplicate an existing command.

---

## 11. GitHub Actions CI Design

### Trigger strategy

- `pull_request` targeting `develop` (primary).
- `push` to `develop` (validates the integration branch and provides the production-image build signal).
- `workflow_dispatch` (manual).
- Use `concurrency` with `cancel-in-progress: true` keyed by `github.ref`/PR number to cancel superseded runs.
- Do **not** use `pull_request_target` (unsafe for forks). Forked PRs run with read-only token and no secrets.
- Path filters are optional; prefer full validation over path-based skipping until build times justify it, because a skipped job can otherwise break a required status check.

### Workflow and jobs

One workflow (`ci.yml`) with four jobs gives a single, easy-to-read status line.

```yaml
name: ci
on:
  pull_request:
    branches: [develop]
  push:
    branches: [develop]
  workflow_dispatch:

permissions:
  contents: read

concurrency:
  group: ci-${{ github.ref }}-${{ github.event_name }}
  cancel-in-progress: true

jobs:
  backend-static:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@<pinned-sha>
      - uses: actions/setup-node@<pinned-sha>
        with: { node-version: 22, cache: npm, cache-dependency-path: src/backend/package-lock.json }
      - run: npm ci
        working-directory: src/backend
      - run: npx prisma generate
        working-directory: src/backend
      - run: npx prisma validate
        working-directory: src/backend
      - run: npm run docs:validate
        working-directory: src/backend
      - run: npm test
        working-directory: src/backend

  backend-integration:
    needs: backend-static
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: ci_ephemeral_password
          POSTGRES_DB: postgres
        options: >-
          --health-cmd pg_isready --health-interval 5s --health-timeout 5s --health-retries 10
        ports: ['5432:5432']
    steps:
      - uses: actions/checkout@<pinned-sha>
      - run: docker build --target test -t expensetracker-backend:test src/backend
      - run: >-
          docker run --network host -e RUN_DB_INTEGRATION=1
          -e TEST_DATABASE_URL=postgresql://postgres:ci_ephemeral_password@localhost:5432/postgres
          -e NODE_OPTIONS=--experimental-vm-modules
          expensetracker-backend:test npm test -- --runInBand

  backend-image:
    needs: backend-static
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@<pinned-sha>
      - run: docker build --target production -t expensetracker-backend:ci src/backend
      - run: docker run --rm -e HOST=0.0.0.0 -e PORT=7001 expensetracker-backend:ci node -e "console.log('boot smoke ok')"

  mobile:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@<pinned-sha>
      - uses: actions/setup-node@<pinned-sha>
        with: { node-version: 22, cache: npm, cache-dependency-path: src/mobile/package-lock.json }
      - run: npm ci
        working-directory: src/mobile
      - run: npx expo config --type public
        working-directory: src/mobile
      - run: npm run lint
        working-directory: src/mobile
      - run: npm run test:typecheck
        working-directory: src/mobile
      - run: npm test
        working-directory: src/mobile
```

> The YAML above is an **illustrative sketch**, not an implemented file. Actions should be pinned by commit SHA; the `backend-image` smoke step is a placeholder for the real health-check smoke test described in §17G.

### Stage mapping

- **Stage A (config validation):** `backend-static` (`prisma validate`, `docs:validate`) and mobile `expo config`.
- **Stage B (backend unit tests):** `backend-static` `npm test`.
- **Stage C (DB integration tests):** `backend-integration` with the PostgreSQL service.
- **Stage D (mobile validation):** `mobile` job (lint, typecheck, unit tests, Expo config).
- **Stage E (production build verification):** `backend-image` job.

### Failure feedback

- JUnit/coverage artifacts from the backend job for downloadable diagnostics.
- Logs are streamed in the Actions UI; no secrets are present in any job.
- A single failed job fails the check; branch protection should require `backend-static`, `backend-integration`, `backend-image`, and `mobile` (see §21).

---

## 12. CI Caching, Performance, and Cost

### Worthwhile now

- **npm cache:** `actions/setup-node` with `cache: npm` keyed by each package's lockfile. This is the single biggest win.
- **Docker BuildKit + GitHub Actions cache:** use `cache-from: type=gha,scope=backend` and `cache-to: type=gha,mode=max,scope=backend` so layer caches persist across runs without a registry.
- **Parallel jobs:** `backend-static`, `backend-integration`, `backend-image`, and `mobile` run in parallel where their dependency graph allows; `backend-image` depends on `backend-static` to avoid building a broken image.
- **Lockfile-driven rebuilds:** `npm ci` and Docker layer caching already key on `package-lock.json`.
- **Concurrency cancellation:** `cancel-in-progress: true` avoids wasted minutes on superseded commits.

### Defer until evidence of a bottleneck

- Test sharding (the suite is ~2s; sharding adds overhead).
- Registry-published intermediate images (adds push/pull latency and secret surface; not needed for CI-only reuse).
- Self-hosted runners (operational burden; public runners are adequate).
- Aggressive path filtering (risks skipping a required check).

### Cost posture

Use the free-tier GitHub-hosted runners and GHCR (private) rather than Docker Hub for any future publishing. Building the production image only after unit/static checks pass avoids paying build minutes on obviously broken commits. No benchmark numbers are asserted; a benchmarking plan would measure per-job wall-clock before and after caching, then decide whether to split the mobile job or shard tests.

---

## 13. Security and Supply-Chain Considerations

| Control | Recommendation |
| --- | --- |
| Token permissions | `permissions: contents: read` at workflow level; no write access in PR validation |
| Forked PRs | Use `pull_request` (read-only token, no secrets); never `pull_request_target` |
| Secrets | No production secrets in PR jobs; CI DB password is an ephemeral constant; deploy jobs (future) use isolated environments/secrets |
| Third-party actions | Pin by commit SHA; prefer `actions/checkout`, `actions/setup-node`, `actions/cache`, `docker/setup-buildx-action` |
| Registry | Prefer GitHub Container Registry (`ghcr.io`) over Docker Hub for future images; publish only on merge/tag, never on PR |
| Dependency updates | Enable Dependabot for `npm` and GitHub Actions (separate from this audit; requires repo settings) |
| SCA scanning | Add `npm audit` (careful: audit-only, non-blocking initially) and, later, Trivy/Grype image scanning in the `backend-image` job |
| Secrets masking | Never print `DATABASE_URL`, `JWT_SECRET`, or credentials; keep the existing masked-logging convention |
| Supply chain | `npm ci` only (no `npm install`); lockfiles committed and authoritative |

Application-security dependencies (JWT pinning, CORS, rate limiting) are out of scope here but are prerequisites for the production image to be meaningful; they are tracked in Epic #7, not Epic #29.

---

## 14. Infrastructure Architecture Alternatives

### Option A — Minimal native CI

GitHub Actions Node jobs run `npm ci` + `npm test` natively; a `postgres:16-alpine` service backs integration tests; Docker is used only to build a production image.

### Option B — Container-first development and CI (preferred)

Multi-target backend Dockerfile; Compose for dev and tests; backend tests run inside Docker; mobile checks run natively; Go Task is the unified command interface.

### Option C — Registry-centered build pipeline

Shared image targets published to a registry; reusable workflows; extensive artifact reuse; separate build and test workflows.

### Comparison

| Criterion | Option A | Option B | Option C |
| --- | --- | --- | --- |
| Developer experience | Good (fast native tests) | Best (one Docker/Compose path + optional native) | Good (more moving parts) |
| CI reproducibility | Good for unit, weaker for env drift | Strong (backend runs in the same image) | Strong |
| Test isolation | Strong via service DB | Strong via disposable Compose/CI DB | Strong |
| Build performance | Fastest (no Docker for tests) | Good with BuildKit/gha cache | Best long-term, slowest to set up |
| Security | Good | Good | Requires registry auth/tags discipline |
| Operational complexity | Lowest | Low-medium | Highest |
| Maintenance cost | Low (duplicate native/Docker paths) | Low-medium (one Dockerfile + one Compose) | High (registry + reusable workflows) |
| Future extensibility | Adequate | Good (targets map to deploy/scan later) | Excellent |

### Selection

**Option B.** It matches the stated direction, gives the best balance of reproducibility and complexity, and directly supports the "backend tested in a container" goal without the registry overhead of Option C. Option A remains the pragmatic fallback for the unit/static jobs if Dockerized unit tests prove slower than expected; Option C is the evolution path when deployment and reusable-workflow needs materialize.

---

## 15. Recommended Architecture and Decision Rationale

The recommended design is Option B with these refinements specific to the repository:

- **Alpine, not Debian slim**, because the dependency tree is pure JS and Prisma 7 ships a WASM query compiler (verified).
- **A dedicated `prisma`/`build` stage**, because the generated client is gitignored.
- **Two install stages (`deps` and `deps-prod`)**, so the production image can exclude Jest/supertest/nodemon without an unreliable `npm prune`.
- **`network_mode: host` for the CI integration container**, to preserve the existing localhost-only DB safety guard.
- **Compose profiles instead of multiple override files**, to keep one source of truth at this scale.
- **Coexistence, then consolidation, with `postgres.sh`**, so existing contributors are not broken on day one.

This design is proportionate: it introduces exactly the artifacts needed for reproducible PR validation and a deployable backend, and deliberately omits Kubernetes, Terraform, Redis, Celery, Sentry, and a registry-publish pipeline until a real deployment target exists.

---

## 16. Proposed Repository File Structure

```text
src/backend/
  Dockerfile                      # multi-stage, named targets
  .dockerignore                   # excludes node_modules, env, tests, logs, coverage
compose.yaml                      # profiles: dev, test
src/backend/src/environment/
  ci.env.example                  # (optional) documented CI env contract
.github/
  workflows/
    ci.yml                        # PR/push/workflow_dispatch validation
build/tasks/
  docker.yml                      # docker:* tasks
  ci.yml                          # ci:* tasks
docs/engineering/
  infrastructure.md               # (new) container/Compose/CI contributor guide
```

No changes to `src/backend/package.json` scripts are required: `npm test`, `npm run docs:validate`, `npx prisma validate`, and `npx prisma generate` already exist.

---

## 17. Detailed Implementation Blueprint

### A. Docker target specification

```text
base
  FROM node:22-alpine
  RUN apk add --no-cache tini (optional) && addgroup -S app && adduser -S app -G app
  WORKDIR /app
  ENV NODE_ENV=production
  USER app

deps
  FROM base AS deps
  USER root
  COPY --chown=app:app package.json package-lock.json ./
  RUN npm ci
  USER app

deps-prod
  FROM base AS deps-prod
  USER root
  COPY --chown=app:app package.json package-lock.json ./
  RUN npm ci --omit=dev
  USER app

prisma (alias build)
  FROM deps AS prisma
  USER root
  COPY --chown=app:app prisma.config.js ./
  COPY --chown=app:app src/prisma ./src/prisma
  COPY --chown=app:app src/configurations/env.config.js ./src/configurations/env.config.js
  RUN npx prisma generate
  USER app

development
  FROM prisma AS development
  ENV NODE_ENV=development
  COPY --chown=app:app . .
  EXPOSE 7001
  CMD ["npm","run","start:dev"]

test
  FROM prisma AS test
  ENV NODE_ENV=testing
  COPY --chown=app:app . .
  CMD ["npm","test"]

production
  FROM base AS production
  COPY --chown=app:app --from=deps-prod /app/node_modules ./node_modules
  COPY --chown=app:app --from=prisma /app/src/generated ./src/generated
  COPY --chown=app:app package.json ./
  COPY --chown=app:app src ./src
  ENV HOST=0.0.0.0 PORT=7001 NODE_ENV=production
  EXPOSE 7001
  HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD wget -qO- http://127.0.0.1:${PORT:-7001}/api/v1/health || exit 1
  USER app
  CMD ["node","src/server.js"]
```

`prisma generate` requires `prisma.config.js`, which imports `src/configurations/env.config.js`; both are copied. The generated client lands in `/app/src/generated`.

### B. Compose specification

- Services: `postgres-dev` (profile `dev`, named volume, `pg_isready` healthcheck, `127.0.0.1:5432:5432`), `backend-dev` (profile `dev`, build target `development`, bind mount `./src/backend:/app`, anonymous `node_modules` volume, depends_on `postgres-dev` healthy, port `7001:7001`), `migrate` (profile `dev`, build target `production`, command `npx prisma migrate deploy`, env `MIGRATION_DATABASE_URL`), `postgres-test` (profile `test`, tmpfs `/var/lib/postgresql/data`, internal network, no host port), `backend-test` (profile `test`, build target `test`, depends_on `postgres-test` healthy).
- Networks: `dev` and `test` networks; no cross-profile reachability.
- Env: use `env_file: src/backend/src/environment/dev.env` for `backend-dev`/`migrate`; pass `TEST_DATABASE_URL` inline for `backend-test`.

### C. CI workflow specification

As in §11: one `ci.yml`, four jobs, read-only permissions, concurrency cancellation, Postgres service with `pg_isready`, `--network host` integration run, and pinned actions.

### D. Go Task specification

Add `build/tasks/docker.yml` and `build/tasks/ci.yml`, included from `build/Taskfile.yml`. Docker tasks invoke `docker build`/`docker compose` only. `ci:check` deps: `ci:backend` and `ci:mobile`. No container invokes `task`.

### E. Database test specification

- CI service: `postgres:16-alpine`, superuser `postgres`, ephemeral password, `pg_isready`.
- Backend test container runs with `--network host`, `RUN_DB_INTEGRATION=1`, `TEST_DATABASE_URL` at `localhost`.
- Harness creates unique databases, runs `npx prisma db push`, drops created databases in teardown.
- Failures propagate via nonzero exit; artifacts uploaded for diagnosis.

### F. Production image verification

1. Build the `production` target.
2. Assert `docker run --rm image sh -c "test ! -d node_modules/jest && test ! -d node_modules/supertest"` (test-only deps absent).
3. Start the image with `HOST=0.0.0.0 PORT=7001` and a `DATABASE_URL`; poll `http://localhost:7001/api/v1/health` until healthy.
4. Optionally run a later Trivy scan in the `backend-image` job.

### G. Acceptance criteria

- `docker build --target test src/backend` and `--target production src/backend` succeed on a clean checkout (no local `src/generated`).
- `docker compose --profile test run --rm backend-test` runs unit tests green.
- `docker compose --profile test run --rm backend-test` with `RUN_DB_INTEGRATION=1` runs integration tests green against the disposable DB.
- `docker compose --profile dev up` starts Postgres + backend; `migrate` applies migrations; `/api/v1/health` returns 200.
- Production image contains no `jest`/`supertest`/`nodemon` and runs as the non-root `app` user.
- `ci.yml` reports four checks (static, integration, image, mobile) on every PR to `develop`; all pass on the current codebase.
- No production secret appears in any workflow or image layer.

### H. Rollout strategy

Introduce Docker and CI **without changing** the existing host-native `task db:*`, `task backend:dev`, or `task test` commands. Add `docker:*` and `ci:*` alongside; document both. Merge the Dockerfile first, then Compose, then CI, then contributor docs. Rollback is a revert of the new files — no existing behavior is altered. Consolidate `postgres.sh` into Compose only after the dev profile has been validated by contributors.

---

## 18. Existing GitHub Ticket Mapping

| Recommended work | Existing issue | Action |
| --- | --- | --- |
| Multi-stage backend Dockerfile | #43 | Implement directly; refine: Node 22 (LTS), Alpine OK, add Prisma-generate stage, `HOST=0.0.0.0`, HEALTHCHECK, no "compile" step |
| `.dockerignore` + build-context hygiene | #43 | Include in #43 scope |
| Compose dev/test profiles | #3, #5 | Refine #5 to "Compose profiles"; keep #3 as parent story |
| Consolidate/close empty duplicate | #4 | Recommend closing as duplicate of #43 or reparenting |
| GitHub Actions PR validation (CI) | #30 | Split: implement CI now; defer CD and mobile store builds |
| CI task decomposition | #30 | Add proposed child tasks (workflow, services, caching) — report-only |
| DockerHub registry | #6 | Already closed; no action (future registry = GHCR) |
| Kubernetes / Sentry / Terraform / Redis / Celery / caching | #31, #32, #35, #36, #37, #38 | Defer to Phases C/D |
| PostgreSQL dev/test CI | #33, #34 | Refine: test DB in CI/Compose now; backups/monitoring to Phase C |

### Proposed new tickets (report-only; not created)

- **Story/Task under #30:** "Implement GitHub Actions PR validation workflow" — scope: `ci.yml` with static/integration/image/mobile jobs, caching, read-only permissions.
- **Task under #3/#5:** "Add Docker Compose profiles for development and integration tests" — scope: `compose.yaml` services, health checks, volumes, migration path from `postgres.sh`.
- **Task under #3:** "Document Dockerized contributor workflow and CI" — scope: `docs/engineering/infrastructure.md`, README updates, branch-protection checklist.

These respect the manifest-driven ticket automation; a later, separately authorized task may create them via `scripts/github_tickets.py`.

---

## 19. Proposed Pull Request Delivery Sequence

Each PR is small, reviewable, and independently revertible, targeting `develop`.

1. **Backend Docker multi-stage foundation (#43).** Scope: `src/backend/Dockerfile`, `src/backend/.dockerignore`. Validation: build all targets locally. Rollback: delete the two files.
2. **Compose and Go Task integration (#3/#5).** Scope: `compose.yaml`, `build/tasks/docker.yml`, Taskfile includes. Validation: dev + test profiles run. Rollback: remove Compose/Task additions (existing commands untouched).
3. **GitHub Actions backend pipeline (#30).** Scope: `ci.yml` static + integration jobs. Validation: green run on a PR. Rollback: remove workflow.
4. **Mobile checks and production-image verification (#30).** Scope: `mobile` and `backend-image` jobs. Validation: full `ci.yml` green. Rollback: revert workflow.
5. **Documentation, onboarding, and branch protection (#3).** Scope: `docs/engineering/infrastructure.md`, README, required-status-checks checklist. Validation: fresh-contributor walkthrough. Rollback: doc revert (branch protection is a settings change, separately authorized).

One oversized infrastructure PR is explicitly **not** recommended.

---

## 20. Phased Infrastructure Roadmap

### Phase A — Immediate collaborative development infrastructure

- **Scope:** backend Dockerfile + `.dockerignore`; Compose dev/test profiles; GitHub Actions PR validation; contributor docs.
- **Dependencies:** none external.
- **Existing tickets:** #43, #3, #5, #30 (CI slice).
- **Acceptance criteria:** every PR to `develop` runs static/unit/integration/image/mobile checks; backend builds and tests in containers; contributors can run `task docker:up` and `task docker:test`.
- **Deferrals:** K8s, Terraform, Redis, Celery, Sentry, mobile binary builds, image publishing.

### Phase B — MVP deployment readiness

- **Scope:** publish the production image to GHCR on merge/tag; a `staging` deployment target; migration job; basic health/smoke checks after deploy.
- **Dependencies:** Phase A; a hosting decision (see §21).
- **Existing tickets:** #6 (revisit registry), #30 (CD slice), #33/#34 (prod DB config).

### Phase C — Early production operations

- **Scope:** managed PostgreSQL (or hardened self-hosted) with backups/DR; centralized logging and Sentry; secret management; environment isolation; rollback procedure.
- **Dependencies:** Phase B and a real production workload.
- **Existing tickets:** #32, #34, #35 (subset).

### Phase D — Scale-driven infrastructure

- **Scope:** Kubernetes or a managed container platform only when horizontal scaling/self-healing is demonstrated as necessary; Redis only for distributed rate limiting or caching with a measured bottleneck; background queue only when async work exists.
- **Dependencies:** production load evidence.
- **Existing tickets:** #31, #36, #37, #38.

---

## 21. Decisions Requiring Approval

1. **Node version pin:** confirm `node:22` LTS (or `node:24`) as the single CI/Docker version; add `.nvmrc`/`engines`.
2. **Base image flavor:** confirm Alpine (recommended) vs Debian slim.
3. **Registry:** GHCR (recommended) vs Docker Hub for future publishing.
4. **Dev DB consolidation:** whether/when `task db:*` becomes a Compose wrapper; whether the existing `expensetracker-postgres` container is migrated now or later.
5. **CI DB credentials:** confirm an ephemeral CI-only PostgreSQL password is acceptable (it is never a production secret).
6. **Branch protection:** which of the four checks become required status checks on `develop` (repository-settings change, outside this audit).
7. **Image publish trigger:** publish on merge to `develop` and on semver tags, or tags only.
8. **Mobile binary builds:** confirm EAS is the distribution path and defer native builds out of PR validation.
9. **SCA scanning:** whether `npm audit` is blocking or advisory initially, and when to add Trivy/Grype.
10. **Deployment target:** a cloud provider/managed-Postgres decision must precede Phase B.

---

## 22. Acceptance Criteria and Validation Plan

The implementation is complete when, on a clean checkout with no local `src/generated` and no local Docker containers:

1. `docker build --target development|test|build|production src/backend` all succeed.
2. `docker compose --profile dev up -d postgres-dev && docker compose --profile dev run --rm migrate && docker compose --profile dev up -d backend-dev` yields a healthy `/api/v1/health`.
3. `docker compose --profile test run --rm backend-test npm test` passes unit tests.
4. `docker compose --profile test run --rm backend-test` with `RUN_DB_INTEGRATION=1` and a disposable DB passes integration tests and leaves no test databases behind.
5. The production image runs as non-root, binds `0.0.0.0:7001`, contains no `jest`/`supertest`/`nodemon`, and passes the health-check smoke test.
6. `ci.yml` runs four checks on every PR to `develop`; all pass on the current codebase; no secrets are present in logs or layers.
7. `task --list` exposes the new `docker:*` and `ci:*` commands, and no container invokes Task.

Validation strategy: local `docker build`/`docker compose` runs, a `workflow_dispatch`/PR run, and the existing test suites as the regression baseline.

---

## 23. Appendix — Evidence, Commands, and References

### Read-only commands executed

```text
gh issue list --repo edwardpeter547/expensetracker --state all --limit 1000 \
  --json number,title,state,stateReason,parent,subIssues,labels,body   # escalated, network
node --version && npm --version && task --version
docker --version && docker compose version
git check-ignore -v src/backend/src/generated/client.js
git ls-files src/backend/src/generated
node -e "console.log(require('./src/backend/node_modules/prisma/package.json').engines)"
cd src/mobile && npx expo config --type public
rg -n 'db push|RUN_DB_INTEGRATION|TEST_DATABASE_URL' src/backend/src/services/__tests__/auth.service.refresh.integration.test.js
```

### Key evidence

- Prisma generated client gitignored: `src/backend/.gitignore:25` (`src/generated/`).
- Prisma 7.9.1 Node requirement: `node: ^20.19 || ^22.12 || >=24.0` (installed `prisma/package.json`).
- Prisma 7 WASM compiler: `src/backend/src/generated/query_compiler_fast_bg.wasm-base64.js`.
- Pure-JS backend dependency set: `src/backend/package.json` (no sharp/canvas/sqlite3/bcrypt native).
- Production bind default: `src/backend/src/configurations/env.config.js:32`.
- DB lifecycle/roles: `build/scripts/database/postgres.sh`, `build/scripts/lib.sh`.
- Integration harness: `build/scripts/testing/integration-env.sh`, `auth.service.refresh.integration.test.js`.
- Test config/coverage: `src/backend/jest.config.js`.
- Task groups: `build/tasks/*.yml`.
- No workflows/Dockerfile/Compose: `find .github -type f`, repository file inventory.

### Existing infrastructure issue hierarchy

Epic #29 children reviewed: #3, #4, #5, #6, #30, #31, #32, #33, #34, #35, #36, #37, #38, #43, #89. States: #6 closed; #89 closed; all others open.

---

## Report integrity

No application code, Docker configuration, Taskfiles, workflows, GitHub issues, branches, or database records were modified. The only write performed was the creation of this report under `docs/audits/`.
