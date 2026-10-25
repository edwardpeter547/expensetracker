# Testing Strategy

## Current infrastructure

### Backend
- Framework: **Jest 30** with `@jest/globals`, `supertest`, and `NODE_OPTIONS=--experimental-vm-modules` for ESM.
- Config: `src/backend/jest.config.js` — one `UNIT` project matching `src/**/__tests__/*.test.js`.
- Coverage: enabled with HTML/LCov/JSON reporters and a global threshold of 80% (branches, functions, lines, statements). Coverage output is written to `src/backend/coverage/` (gitignored).
- Test env: `NODE_ENV=testing` is set by the npm scripts so config loads `test.env`.

### Existing coverage areas
- `src/backend/src/middleware/__tests__` — error middleware, language middleware, validation middleware, and JWT authentication middleware (algorithm/issuer/audience/version enforcement).
- `src/backend/src/utils/__tests__` — `AppError`, `catchAsync`, helpers.
- `src/backend/src/validations/__tests__` — auth, general, and transaction validation schemas.

The backend has controller, service, and route test suites. Database-gated
integration suites use the `*.integration.test.js` suffix and cover refresh-token
rotation, logout, registration/verification, password reset, profile update,
cross-user ownership denial, login lockout, and the device-session HTTP routes.
Mobile tests cover the API client and localization modules.

## Commands

```bash
cd src/backend && npm test           # Jest with coverage, verbose
cd src/backend && npm run test:watch # watch mode
task test                            # same as backend npm test
task test:unit                       # alias for the standard suite
task test:auth                       # auth-related tests
task test:refresh                    # refresh-token tests
task test:logout                     # logout tests
task test:integration                # real-PostgreSQL integration tests
```

The mobile package has no `test` script yet, so there is no `task test:mobile`
target; mobile quality checks currently mean `task lint` (`expo lint`).

## Conventions for new tests

- Colocate tests in `__tests__` next to the module they test.
- Import from `@jest/globals` (`describe`, `test`, `expect`, `jest`) to match existing files.
- Use descriptive test names and cover the failure paths, not only happy paths.
- Keep unit tests pure (no live database); for anything requiring the DB, use a setup hook like `src/backend/scripts/setup.js` and the reset helpers in `src/backend/scripts/prepare.db.js`.
- End every database-gated suite with `.integration.test.js` so `task test:integration` discovers it automatically. A unit suite must never use that suffix, because it would be skipped outside the integration harness.

## Shared test fixtures

Reuse the following factory conventions instead of duplicating per-suite
helpers. These are the target contract for a future consolidation PR; they are
not yet implemented as shared modules.

- `createTestUser(client, overrides)` — unique `crypto.randomUUID()` email and
  username, a random password hashed with bcrypt cost 12, safe defaults, and
  optional Prisma client/transaction injection.
- `createAuthToken(user, options)` — sign a short-lived bearer JWT.
- `withTestDatabase(adminUrl, callback)` — guard `RUN_DB_INTEGRATION`, reject
  non-local `TEST_DATABASE_URL`, create a uniquely named database, run
  `prisma db push`, and drop only what it created on teardown.
- `makeAuthServiceMock()` / `makeResponse()` — shared Jest mock factories for
  controller tests.

Do not add new seeding helpers without first checking for an existing factory.

## Database integration safety

Database integration tests are gated behind `RUN_DB_INTEGRATION=1` and require
`TEST_DATABASE_URL` to resolve to localhost. The suite treats that URL as an
administrative connection, creates its own uniquely named databases, and drops
only those it created. It must never run against development, staging, or
production databases. The development database (`expensetracker_dev`) and its
application role (`expensetracker_app`) are never used for integration tests;
the harness keeps its administrative credentials separate from application
credentials.

## Regression expectations

Add or update tests alongside behavior changes for authentication, token
refresh, logout, resource ownership, validation failures, financial
calculations, error responses, and API contract changes. Route-contract
changes must be reflected in `src/backend/openapi/openapi.yaml` in the same change.

## Critical financial workflow tests (recommended, not yet present)

Add these before shipping paid features. None of these currently exist; do not install or configure a new framework.

- Cross-user transaction access denial (a user cannot read/update/delete another user's transaction).
- Transaction CRUD ownership and correct scoping for list/get/update/delete.
- Budget and category aggregation using the normalized transaction/category model.
- Money precision and rounding across sums, budgets, transfers, and currency conversions.
- Date and timezone boundary tests for monthly periods and budget rollover.
- Duplicate submission handling and idempotency for transaction create/sync.
- Authentication, token refresh, refresh-token rotation/revocation, JWT claims/versioning, per-device session revocation, and revoke-all access-token invalidation.
- Subscription entitlement boundaries and usage allowances.
- Household authorization: shared vs personal data access and role changes.
- Downgrade and data retention: paid actions become read-only; history stays readable.
- Mobile/web parity for shared business rules (once a web client exists).

## Incremental recommendations

- **Adopt now:** add tests alongside any new backend behavior; keep the 80% coverage threshold in mind for touched modules.
- **Adopt when touching relevant code:** add controller/service tests for auth, transactions, and budgets, using mocked Prisma or a test database; add `supertest` integration tests for the API contract.
- **Evaluate later:** introduce a minimal mobile test setup (the Expo docs recommend Jest + `jest-expo`), and add a real `test` script before relying on a combined `task check`.

No new test framework or runner is being introduced in this phase.
