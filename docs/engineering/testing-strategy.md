# Testing Strategy

## Current infrastructure

### Backend
- Framework: **Jest 30** with `@jest/globals`, `supertest`, and `NODE_OPTIONS=--experimental-vm-modules` for ESM.
- Config: `backend/jest.config.js` — one `UNIT` project matching `src/**/__tests__/*.test.js`.
- Coverage: enabled with HTML/LCov/JSON reporters and a global threshold of 80% (branches, functions, lines, statements). Coverage output is written to `backend/coverage/` (gitignored).
- Test env: `NODE_ENV=testing` is set by the npm scripts so config loads `test.env`.

### Existing coverage areas
- `backend/src/middleware/__tests__` — error middleware, language middleware, validation middleware.
- `backend/src/utils/__tests__` — `AppError`, `catchAsync`, helpers.
- `backend/src/validations/__tests__` — auth, general, and transaction validation schemas.

There are no controller, service, or route integration tests yet, and no mobile tests.

## Commands

```bash
cd backend && npm test          # Jest with coverage, verbose
cd backend && npm run test:watch # watch mode
make test-backend               # same as backend npm test
```

`make test-all` and `make test-mobile` currently reference `cd mobile && npm run test`, but `mobile/package.json` has no `test` script — those targets are expected to fail until mobile testing is added.

## Conventions for new tests

- Colocate tests in `__tests__` next to the module they test.
- Import from `@jest/globals` (`describe`, `test`, `expect`, `jest`) to match existing files.
- Use descriptive test names and cover the failure paths, not only happy paths.
- Keep unit tests pure (no live database); for anything requiring the DB, use a setup hook like `backend/scripts/setup.js` and the reset helpers in `backend/scripts/prepare.db.js`.

## Critical financial workflow tests (recommended, not yet present)

Add these before shipping paid features. None of these currently exist; do not install or configure a new framework.

- Cross-user transaction access denial (a user cannot read/update/delete another user's transaction).
- Transaction CRUD ownership and correct scoping for list/get/update/delete.
- Budget and category aggregation using the normalized transaction/category model.
- Money precision and rounding across sums, budgets, transfers, and currency conversions.
- Date and timezone boundary tests for monthly periods and budget rollover.
- Duplicate submission handling and idempotency for transaction create/sync.
- Authentication, token refresh, and refresh-token rotation/revocation.
- Subscription entitlement boundaries and usage allowances.
- Household authorization: shared vs personal data access and role changes.
- Downgrade and data retention: paid actions become read-only; history stays readable.
- Mobile/web parity for shared business rules (once a web client exists).

## Incremental recommendations

- **Adopt now:** add tests alongside any new backend behavior; keep the 80% coverage threshold in mind for touched modules.
- **Adopt when touching relevant code:** add controller/service tests for auth, transactions, and budgets, using mocked Prisma or a test database; add `supertest` integration tests for the API contract.
- **Evaluate later:** introduce a minimal mobile test setup (the Expo docs recommend Jest + `jest-expo`), and add a real `test` script before relying on `make test-all`.

No new test framework or runner is being introduced in this phase.
