# CI/CD Architecture

**Status:** Proposed. Workflows, composite actions, runners, and deployments described here are planned, not implemented.

This document defines GitHub Actions organization, pull-request validation, artifact publishing, deployment orchestration, self-hosted runners, database migration policy, health checks, and Expo EAS builds. It is the authoritative source for these policies; [architecture.md](architecture.md) and [ci-cd-roadmap.md](ci-cd-roadmap.md) link here rather than duplicating them.

## 1. Repository organization

```text
.github/
├── actions/          # local composite actions (reusable step sequences)
└── workflows/        # workflow definitions
```

### Composite actions vs reusable workflows

- **Composite actions** (`action.yml`) reuse a sequence of **steps** inside a job (for example: checkout + Node setup + `npm ci`).
- **Reusable workflows** (`workflow_call`) reuse whole **jobs**, including runner selection, permissions, and secret boundaries.

Extract a composite action only when two or more jobs share a non-trivial multi-step sequence. Do not wrap one-line operations.

### Proposed structure

| Path | Kind | Phase | Responsibility |
| --- | --- | --- | --- |
| `.github/actions/setup-node-backend/` | composite | 2 | Checkout, Node setup, backend `npm ci` with cache |
| `.github/actions/setup-node-mobile/` | composite | 2 | Checkout, Node setup, mobile `npm ci` with cache |
| `.github/actions/docker-metadata/` | composite | 3 | Compute image tags and OCI labels |
| `.github/actions/dockerhub-login/` | composite | 3 | Docker Hub login (trusted/deploy only) |
| `.github/workflows/ci.yml` | workflow | 2 | PR/push validation; also `workflow_call` reusable |
| `.github/workflows/backend-deploy.yml` | workflow | 4 | Build, publish, and deploy backend (development environment) |
| `.github/workflows/mobile-build.yml` | workflow | 5 | Expo EAS development/preview/production builds |
| `.github/workflows/release.yml` | workflow | 3 | Component release creation and tagging |
| `.github/workflows/security.yml` | workflow | 3+ | Dependency and container scanning |
| `.github/workflows/infra-plan.yml` | workflow | 6 | IaC plan (read-only) |
| `.github/workflows/infra-apply.yml` | workflow | 6 | IaC apply (trusted, reviewed) |
| `.github/workflows/infra-destroy.yml` | workflow | 7 | Ephemeral teardown (identity-scoped, production-excluded) |
| `.github/workflows/maintenance.yml` | workflow | 8 | Scheduled cleanup, backup verification, drift detection |

## 2. Workflow responsibility matrix (correction M)

| Workflow | Trigger | Trust | Runner | Permissions | Secrets | Dependencies | Target | Failure behavior | Phase |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `ci.yml` | `pull_request` to `develop`, `push` to `develop`, `workflow_dispatch`, `workflow_call` | Untrusted-safe | GitHub-hosted | `contents: read` | none | none | none | fails check on any failing job | 2 |
| `backend-deploy.yml` | `push` to `develop` after CI, `workflow_dispatch` | Trusted | self-hosted `deploy` or GitHub-hosted | `contents: read`, `id-token` (future) | Docker Hub + environment secrets | `ci.yml` (reusable) on merged SHA | development environment | rollback on health failure; deployment marked failed | 4 |
| `mobile-build.yml` | `push` to `develop` (path-filtered), `workflow_dispatch` | Trusted | GitHub-hosted (EAS runs remotely) | `contents: read` | EAS token | none | EAS | build failure reported; independent of backend | 5 |
| `release.yml` | `workflow_dispatch` (version input), tag push | Trusted | GitHub-hosted | `contents: write` (release) | none (or signing) | successful `ci.yml` | GitHub Release + tags | release not created on failure | 3 |
| `security.yml` | schedule, `push` to `develop` | Trusted | GitHub-hosted | `contents: read`, `security-events: write` | none | none | none | advisory/blocking per policy | 3+ |
| `infra-plan.yml` | `pull_request` on `infrastructure/**`, `workflow_dispatch` | Untrusted-safe | GitHub-hosted | `contents: read`, `id-token` (read-only plan) | cloud read | none | none | plan diff reported | 6 |
| `infra-apply.yml` | `workflow_dispatch` after reviewed plan | Trusted | GitHub-hosted or deploy runner | `contents: read`, `id-token` | cloud write | `infra-plan` approval | non-production first | apply not run if plan stale | 6 |
| `infra-destroy.yml` | `workflow_dispatch` (env id) | Trusted | GitHub-hosted | `contents: read`, `id-token` | cloud write | verified state | ephemeral only | reconciliation on failure | 7 |
| `maintenance.yml` | schedule | Trusted | GitHub-hosted | `contents: read` | none | none | none | alerts on drift/orphans | 8 |

## 3. Pull-request continuous integration

Every PR to `develop` runs `ci.yml` with four jobs, `permissions: contents: read`, and concurrency cancellation.

| Job | Checks | Environment |
| --- | --- | --- |
| `backend-static` | `npm ci`, `npx prisma generate`, `npx prisma validate`, `npm run docs:validate`, `npm test` (unit) | Docker `test` image |
| `backend-integration` | Database-backed tests | Docker `test` image + disposable PostgreSQL |
| `backend-image` | Production image build + startup/health smoke test | Docker `production` image + disposable PostgreSQL |
| `mobile` | `npx expo config --type public`, `npm run lint`, `npm run test:typecheck`, `npm test` | Native Node |

### Consistent backend validation (correction A, part 1)

All backend checks run in the same Docker `test` image. Static checks are part of `backend-static`, not separate native steps, so local and CI behavior are identical.

### Verification commands (correction P)

The following are the actual, verified commands (from `package.json` and `Taskfile`), not invented:

- Backend unit tests: `cd src/backend && npm test` → `NODE_OPTIONS=--experimental-vm-modules NODE_ENV=testing jest --coverage --verbose`.
- Backend integration tests: `task test:integration` → `integration-env.sh npx jest --runInBand --testPathPatterns='(auth\.service\.refresh\.integration|auth\.service\.logout\.integration|auth\.logout\.route)\.test\.js'`.
- Prisma validation: `cd src/backend && npx prisma validate`.
- OpenAPI validation: `cd src/backend && npm run docs:validate` (Redocly lint).
- Mobile unit tests: `cd src/mobile && npm test` (Node test runner).
- Mobile lint: `cd src/mobile && npm run lint` (`expo lint`).
- Mobile type-check: `cd src/mobile && npm run test:typecheck` (`tsc -p tsconfig.node.json`).
- Mobile config: `cd src/mobile && npx expo config --type public`.

### Integration-test skip behavior and CI policy (correction P)

The database-backed integration suites self-skip unless `RUN_DB_INTEGRATION=1` (`describe.skip`). Therefore `npm test` **does not** prove database behavior. CI must treat `backend-integration` as the authoritative database validation: it runs with `RUN_DB_INTEGRATION=1` and must fail on any failure. A green `backend-static` job with skipped integration tests is only acceptable because a separate, required `backend-integration` job exists.

### Coverage policy (correction P)

`src/backend/jest.config.js` declares an 80% global threshold, but the observed `npm test` run exits 0 at 26.97% statements, so the threshold is **configured but not enforced**. CI must not introduce a stricter threshold than the current baseline without a remediation plan. Recommended gradual approach: (1) leave the threshold non-blocking now; (2) enforce a floor equal to the measured baseline; (3) raise the floor in small increments as controller/service tests are added. Distinguish "target coverage" (documentation aspiration) from "enforceable CI coverage" (current policy).

### Integration-test topology (correction A, part 2)

The integration harness enforces a **hostname-only** guard: `TEST_DATABASE_URL` must resolve to `localhost`, `127.0.0.1`, or `::1` (`build/scripts/testing/integration-env.sh:25`; `auth.service.refresh.integration.test.js:40`). It does **not** validate credentials or database identity. The harness treats `TEST_DATABASE_URL` as an administrative connection, creates uniquely named databases, applies `npx prisma db push`, and drops only what it created.

The guard is preserved unchanged. Platform-specific executable topology:

#### A. macOS local development

- **PostgreSQL:** the existing `expensetracker-postgres` container, bound to `127.0.0.1:5432`.
- **Tests:** run **host-natively** — `task test:integration`. Docker Desktop for macOS does not provide Linux-style host networking, so a containerized test runner cannot reliably reach `localhost:5432` through the guard.
- **Topology:** process → host loopback → container-mapped port.
- **Credentials/isolation:** `integration.env` admin role; harness creates/drops disposable databases.
- **Cleanup:** harness teardown.
- **Failure:** nonzero exit from Jest.

#### B. Linux local development

- **PostgreSQL:** either the existing host container (`127.0.0.1:5432`) or a Compose `postgres-test` service.
- **Tests:** `task test:integration` host-natively, **or** `docker compose --profile test run --rm --network host backend-test` with `TEST_DATABASE_URL=postgresql://postgres:...@localhost:5432/postgres`. On Linux, `--network host` shares the runner/host network namespace, satisfying the guard.
- **Topology:** container process shares host network → `localhost:5432`.
- **Credentials/isolation/cleanup/failure:** as above; use a CI-only/disposable password.

#### C. GitHub-hosted Linux CI

- **PostgreSQL:** `services: postgres:16-alpine` with `pg_isready` health check, mapped to `127.0.0.1:5432`, `POSTGRES_USER=postgres`, `POSTGRES_DB=postgres`, and an ephemeral password.
- **Tests:** run the `test` image with `--network host`, `RUN_DB_INTEGRATION=1`, and `TEST_DATABASE_URL=postgresql://postgres:<ephemeral>@localhost:5432/postgres`.
- **Isolation:** each job gets its own service container; the harness creates and drops unique databases.
- **Cleanup:** `afterAll`/`finally` drop; service container discarded by GitHub.
- **Failure:** nonzero exit fails the job.

No Compose service-DNS workaround is used for database tests, because it would require weakening the localhost guard. If the harness is ever changed to accept a non-loopback CI host, that future change must add an explicit allowlist (for example, `CI=true` plus a fixed `postgres` service name) and a corresponding assertion that production hosts remain rejected — documented here only as a future option, not implemented.

## 4. Publishing and deployment boundaries (correction C)

Seven logical responsibilities are separated:

1. Validate source.
2. Build the production artifact.
3. Publish the approved artifact.
4. Record immutable artifact identity.
5. Deploy the approved artifact.
6. Verify deployment.
7. Record the deployment outcome.

There is exactly **one authoritative publishing path**: `backend-deploy.yml` on `push` to `develop`. `ci.yml` is declared `workflow_call`-reusable, and `backend-deploy.yml` invokes it against the **exact merged commit** (`github.sha`) before building. This means:

- A green PR check is not treated as proof that the merge commit passed CI; the merged SHA is re-validated in the same workflow.
- The deploy job never rebuilds from a moving branch ref. It builds `github.sha`, tags `sha-<sha>`, pushes, and records the digest.
- The deploy step consumes the digest output of the build step, never a mutable tag.

### Artifact handoff

| Mechanism | Use | Trade-off |
| --- | --- | --- |
| Docker image digest | Primary deploy identity | Immutable, but requires registry read access |
| Registry tag (`sha-<sha>`) | Convenience, provenance | Mutable in principle; never used to deploy |
| GitHub Actions artifact | Logs, manifests, test reports | Ephemeral, not a deploy identity |
| Reusable workflow outputs | Pass digest between jobs in one run | Within-run only |
| Workflow-run metadata | Audit trail | Not a deploy identity |

`workflow_run` is avoided for the privileged deploy path: consuming artifacts across workflow runs adds a trust boundary (a less-trusted workflow's artifacts feeding a privileged workflow). The reusable-workflow model keeps validation and deployment in one run with one verified SHA.

### Sequence

```mermaid
sequenceDiagram
  participant P as push to develop (github.sha)
  participant CI as ci.yml (workflow_call)
  participant B as build+publish job
  participant R as Docker Hub
  participant D as deploy job
  participant E as development environment
  P->>CI: validate merged commit
  CI-->>B: success
  B->>R: build + push sha-<sha>
  B-->>D: output image digest
  D->>E: run migrate target (MIGRATION_DATABASE_URL)
  D->>E: deploy image@sha256:<digest>
  D->>E: wait readiness + health checks
  D-->>P: record deployment metadata / rollback
```

## 5. Deployment ordering and concurrency (correction D)

Serialization is not ordering. The development environment uses a **latest-eligible-commit policy**:

1. Environment-level concurrency (`group: deploy-dev, cancel-in-progress: false`) serializes deployments.
2. At deploy time, fetch `origin/develop` and verify `github.sha` is an ancestor of (or equal to) the current `develop` tip.
3. If `develop` has advanced past `github.sha`, the deployment is **superseded** and exits successfully without deploying; the newer commit's run will deploy.
4. Deployments are never canceled mid-flight; a canceled job marks the deployment **indeterminate** and requires reconciliation rather than silently continuing.
5. Manual rollback is an explicit `workflow_dispatch` with an input digest; it bypasses the latest-commit rule, records the rollback, and is the only path that deploys an older digest automatically.
6. Each attempt records commit, digest, run ID, timestamp, and outcome; this audit trail is the basis for out-of-order prevention.

This prevents a slower older run from overwriting a newer successful deployment, because the older run detects it is superseded before deploying.

## 6. Self-hosted runners (correction E)

Labels and groups are necessary but do not create host isolation. Initial default topology is **Option A**: the local server hosts the **development** backend and a **deployment runner** in separate logical environments (dedicated user/container/network, no production credentials). This is acceptable only because the deployment runner executes trusted `push`-triggered jobs, never untrusted PR code.

```mermaid
flowchart TD
  subgraph Trusted["Trusted (push to develop)"]
    DW["deploy jobs"]
  end
  subgraph Untrusted["Untrusted (forked PRs)"]
    PR["PR jobs"]
  end
  GH["GitHub-hosted runners"] --> PR
  SR["Self-hosted deploy runner (privileged)"] --> DW
  PR -.never.-> SR
```

Controls:

- Runner **groups/labels** (`deploy` vs `build`); jobs declare eligible runners explicitly.
- A runner with Docker socket access is **highly privileged**; it must not run untrusted code or hold production secrets.
- Prefer **ephemeral** runners for sensitive deploy jobs so credentials are not retained.
- GitHub Environment **approvals are useful but do not replace host isolation**.
- Network egress is restricted to required endpoints (GitHub, Docker Hub, deployment target).
- Credentials live in environment-scoped GitHub secrets; short-lived OIDC where the cloud/deployment target supports it.
- Automate runner updates, disk cleanup, and BuildKit cache pruning; maintain a compromise-recovery runbook (revoke token, rotate secrets, rebuild host).

**Option B** (local server runs deployment automation while the backend runs on cloud) becomes preferable once a cloud environment exists (Phase 6+) or if the development backend is exposed beyond localhost. Option A is not a prerequisite for Phases 1–2, which run on GitHub-hosted runners.

## 7. Database migration and rollback (correction N)

- **Migration execution:** the `migrate` Docker target (same source revision as the deployed image) runs `npx prisma migrate deploy` with `MIGRATION_DATABASE_URL` and the `expensetracker_migrate` role.
- **Runtime:** the production image uses `DATABASE_URL` and the `expensetracker_app` role; it never performs schema changes.
- **Sequencing:** migrations run before cutover; they must be backward-compatible with the previous application version (expand-and-contract where practical: add new schema first, backfill, then remove old schema in a later release).
- **Concurrency:** the migration step uses an environment-level lock so two deploys cannot migrate concurrently.
- **Failed migration:** the deployment is marked failed and the database left in a known, recorded state; the operator is notified.
- **Application rollback:** redeploys a previous immutable digest; it **does not** automatically reverse database schema, because down-migrations are unsafe. A failed application deployment must never leave an undocumented schema state.
- **Backups:** taken before production migrations; restore verification is a scheduled, tested procedure, not an assumption.

## 8. Health checks and observability (correction O)

`GET /api/v1/health` (`src/backend/src/routes/index.js`) is **liveness-only** — a static 200 with service identity and no database check. An HTTP 200 therefore does not prove database readiness. This is documented, not misrepresented.

| Check | Belongs to | Meaning |
| --- | --- | --- |
| Container startup smoke | CI `backend-image` | Process starts, `prisma.$connect()` succeeds, no early exit |
| HTTP health call | CI `backend-image` + deploy | Liveness endpoint returns 200 |
| Database connectivity | Deploy | Verified through successful startup + a DB-backed query or future readiness endpoint |
| Migration verification | Deploy | `migrate deploy` succeeded and recorded |
| Readiness | Deploy | Future requirement: add a readiness endpoint that verifies the database |
| Rollback verification | Deploy | Redeployed digest passes the same health checks |

Minimum observability before the first deployment: structured application logs, container log collection, error monitoring (Sentry, issue #32), deployment records, and basic alerting. Metrics, dashboards, tracing, and cost visibility follow with production usage; the first deployment is not over-instrumented.

## 9. Expo EAS mobile build workflow (correction G)

`mobile-build.yml` is independent of backend deployment.

### Profiles

- `development` — development client for iteration.
- `preview` — installable internal distribution.
- `production` — store-submission builds.

`src/mobile/app.config.js` already contains `owner: edwardpeter547` and `extra.eas.projectId`, but **no `eas.json` exists yet**; the workflow implementation must add `eas.json` profiles and EAS credentials as environment-scoped secrets.

### Build policy (both policies supported)

- **Policy A:** build `preview` after every successful merge to `develop`.
- **Policy B (provisional default):** build `preview` only when mobile or shared code changed.

The workflow implements the policy as a single parameter (an input or an environment-controlled path filter), so switching between A and B is configuration, not redesign. Change detection uses a path filter (for example `dorny/paths-filter`) over `src/mobile/**`, shared `docs/**` that affect mobile, and root manifests. Because a skipped workflow can otherwise break a required status check, a small always-run "route" job either runs the build or records an explicit skip status.

### Orchestration and cost

- Associate the build with the exact validated commit; never rebuild from a moving branch.
- `eas build --wait` keeps the GitHub check synchronous and reports completion; if non-blocking previews are desired, a separate status-polling job reports the EAS result.
- Duplicate-build prevention: skip if a build for the commit already exists.
- Superseded builds are canceled (`eas build:cancel`) when a newer commit lands.
- Manual and `production` release builds are `workflow_dispatch`-only and independent of preview builds.
- EAS **cloud** builds run on Expo's infrastructure, not the local self-hosted runner; **EAS local** builds (where supported) require the local toolchain and are an advanced alternative, not the default.
- Quota is consumed per build; Policy B, dedupe, and cancellation minimize it.

## 10. Branch protection

Once `ci.yml` is implemented and stable, require these status checks on `develop`: `backend-static`, `backend-integration`, `backend-image`, and `mobile`. Require up-to-date branches and disallow force pushes. Branch protection is a repository-settings change performed separately from this documentation.
