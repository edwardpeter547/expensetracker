# System Overview

## Purpose
ExpenseTracker is a personal finance application. The current implementation covers:

- User registration, email verification, login, logout, token refresh, password reset, and device-session management.
- Transaction recording (income and expense) with amount, category, description, receipt URL, location, and date.
- A dashboard summarizing monthly income, expenses, balance, and recent transactions.
- Budget creation per category with monthly/weekly/yearly periods and alert thresholds.
- User categories, with system categories and per-user categories.
- Localization scaffolding (`en`, `fr` locale files) and email notifications via templates.

Routes for `recurring` and `notifications` exist but are empty, and the mobile screens for transactions, budgets, and profile are not yet implemented.

## Package layout
The repository is a two-package monorepo coordinated by Go Task. It is **not** an npm workspace: each package has independent `package.json`, lockfile, and dependencies.

- `src/backend/` — Express API.
- `src/mobile/` — Expo mobile app.
- `.github/ISSUE_TEMPLATE/` — issue templates (no CI/CD workflows are present).
- `Taskfile.yml` — entry point for developer commands; orchestration lives under `build/`.

## Backend

### Entry points and middleware chain
- `src/backend/src/server.js` connects Prisma and starts the HTTP server; it also registers graceful shutdown handlers.
- `src/backend/src/app.js` builds the Express app. Middleware order:
  1. `helmet`, CORS (configured origin + credentials), `compression`.
  2. JSON and URL-encoded body parsing (10 MB limit), cookie parsing.
  3. Request correlation-id assignment, then `morgan` request logging.
  4. `i18n.init` and `langHandler` (language detection/validation).
  5. Rate limiting applied to `/api`.
  6. Static assets at `/static`.
  7. Versioned router at `/api/v1`.
  8. `notFoundHandler` and the centralized `errorHandler`.

### Layers
The backend uses a conventional layered structure:

- **Routes** (`src/backend/src/routes/v1/*.routes.js`) declare HTTP verbs and attach validation/authentication middleware.
- **Controllers** (`src/backend/src/controllers`) parse request data, call services, and build responses.
- **Services** (`src/backend/src/services`) contain business logic and Prisma calls.
- **Validation** (`src/backend/src/validations`) holds reusable Joi schemas.
- **Middleware** (`src/backend/src/middleware`) holds auth, validation factories, language handling, and error handling.
- **Utilities** (`src/backend/src/utils`) provides `AppError`, `catchAsync`, and shared helpers.
- **Configurations** (`src/backend/src/configurations`) initializes env, logger, i18n, email, and Prisma.

This layering is preserved as-is; no repository or DI layer is introduced.

### API contract
- Base path: `/api/v1`.
- Success envelope: `{ success: true, message, data, errors: null }`.
- Error envelope (from `error.middleware.js`): `{ success: false, status, message, errors, stack? }`.
- Prisma `P2025` maps to `404`, `P2002` maps to `409`; JWT errors map to `401`.
- Authentication uses `Authorization: Bearer <accessToken>`. Access tokens are HS256 JWTs carrying `iss`, `aud`, `jti`, and `tokenVersion`; verification pins the algorithm and validates issuer/audience/version. Refresh tokens are random hex strings whose SHA-256 digests are stored server-side with expiry, revocation, and device metadata.
- Status codes come from `http-status-codes`.

### Auth flow
1. `POST /api/v1/auth/register` creates an inactive user, issues access + refresh tokens, records a login attempt, creates a verification token, and sends a welcome email (fire-and-forget).
2. `GET /api/v1/auth/verify-email?token=...` activates the user.
3. `POST /api/v1/auth/login` validates credentials, updates last login, and returns user + tokens.
4. `POST /api/v1/auth/refresh-token` rotates refresh tokens (old token is revoked).
5. `POST /api/v1/auth/logout` (protected) revokes the presented refresh token.
6. `POST /api/v1/auth/forgot-password` creates an unbiased six-digit reset code, stores its SHA-256 digest, and emails the raw code; `POST /api/v1/auth/verify-otp` verifies an unexpired, unused code; `POST /api/v1/auth/reset-password` atomically consumes the code, updates the password, records password history, revokes all refresh sessions, and increments `tokenVersion`.
7. `GET /api/v1/auth/sessions` (protected) lists the caller's active refresh-token sessions with IP, user agent, creation, and expiry metadata.
8. `DELETE /api/v1/auth/sessions/{id}` (protected) revokes one of the caller's sessions.
9. `DELETE /api/v1/auth/sessions` (protected) atomically revokes all of the caller's refresh-token sessions and increments `tokenVersion`, immediately invalidating previously issued access tokens.
10. `GET /api/v1/user/profile` returns a safe profile DTO (derived `displayName`, stable `avatar` object, read-only security metadata); `PUT /api/v1/user/profile` updates writable fields with ISO 4217 currency, IANA timezone, and normalized-username validation.
11. `POST /api/v1/user/change-password` verifies the current password, rejects history reuse, records password history, revokes all refresh-token sessions, and increments `tokenVersion`.
12. `POST /api/v1/user/avatar` (multipart) validates and normalizes the image, stores it through the active storage adapter, and atomically references it; `GET /api/v1/user/avatar` returns the caller's effective image; `DELETE /api/v1/user/avatar` clears the reference and removes the object. When `STORAGE_DRIVER` is unset/`disabled`, upload and removal return 503 while the deterministic default avatar (`/static/images/default-avatar.svg`) still works.

### Authentication, authorization, and ownership

Authentication, authorization, and ownership are deliberately separate
concerns:

- **Authentication** proves who is calling. `authenticate`
  (`src/backend/src/middleware/auth.middleware.js`) verifies the HS256 JWT's
  signature, algorithm pinning, issuer, audience, expiry, and token version,
  then attaches the safe `request.user` projection from `userProfile`. It never
  exposes password hashes, refresh tokens, reset credentials, or personal
  identifiers such as date of birth or phone number.
- **Role authorization** answers "is this caller allowed to take this kind of
  action?" `authorize(...roles)`
  (`src/backend/src/middleware/auth.middleware.js`) composes after
  `authenticate`, requires an authenticated principal, and allows access only
  when the principal's server-established roles include at least one required
  role. With no roles it acts as an authentication-only guard.
- **Ownership** answers "does this resource belong to this caller?" and remains
  the primary control. Every single-record read, update, and delete is
  constrained by the caller's `userId` (or future membership) and returns 404
  on mismatch. Possessing a role never grants access to another user's
  financial records.

`authorize(...roles)` is currently an extension point, not an active role
system: no production route consumes it because the product has no household
or platform-administration surface yet. It fails closed whenever a role is
required but cannot be established from a trustworthy source. Role claims are
read only from `request.user.roles`, never from client-supplied headers, query
parameters, or request bodies. A future role consumer must attach a
server-derived `roles` array to the authenticated principal through a trusted
loader (for example, a membership lookup during authentication), not by
echoing client input.

Household-scoped `MEMBER`/`VIEWER` roles and platform `ADMIN` remain deferred:
household roles require the future household membership model, and platform
administration requires an actual operational interface. This preserves
Decision A in
`docs/decisions/0001-authentication-and-authorization-architecture.md`.

### File storage layer

Uploads go through a provider-independent abstraction in
`src/backend/src/storage` (`StorageAdapter` plus `local` and `s3` adapters and
the startup factory). `STORAGE_DRIVER` selects the provider: `local` writes
under `src/backend/uploads` by default, and `s3` uses the AWS SDK with its
standard credential chain. See the storage section of
`docs/backend-documentation.md` for configuration and migration guidance.

### Account deletion

`src/backend/src/account-deletion` implements voluntary account closure,
cancellation, statutory erasure, data export, and a durable PostgreSQL-backed
erasure worker. Voluntary closure (`POST /api/v1/user/deletion-request`) is a
reauthenticated, deliberately confirmed action that disables the account,
revokes sessions, and schedules erasure 14 calendar days later; cancellation
(`DELETE /api/v1/user/deletion-request`) reauthenticates with email + password.
`GET /api/v1/user/deletion-request` reports status, and
`POST /api/v1/user/data-export` returns a versioned, secret-free JSON export.
See `docs/decisions/DECISION-DELETION-POLICY.md` and
`docs/account-deletion-technical-design.md`.

### Login-lockout availability trade-off

Account lockout intentionally trades a small amount of availability for
brute-force resistance. An attacker who knows a victim's email can deliberately
submit enough wrong passwords to trigger the temporary restriction, causing
denial of service for that account for up to the configured cap (default 30
minutes). This is bounded, not indefinite: the window is capped, successful
login resets the counter, and the IP-based rate limiter raises the cost of
repeat attacks. The trade-off is accepted for the current single-user MVP and
is reviewed again if household tenancy or role-based sharing is introduced.

### Data model
The Prisma schema is split across `src/backend/src/prisma/schema.prisma` (generator + datasource) and fragments in `src/backend/src/prisma/models`. The generated client is emitted to `src/backend/src/generated` (gitignored; regenerated via `prisma generate`).

Core models:

- `User` — credentials, profile fields, verification flags, preferences (`currency`, `timezone`, `language`, `theme`), and `tokenVersion` for access-token invalidation.
- `Transaction` — `amount` (`Float`), `transType` (`INCOME`/`EXPENSE`), `category` (string), `description`, `receiptUrl`, `location`, `transactionDate`, `userId`.
- `Category` — `name`, `icon`, `isSystem`, optional `userId`.
- `Budget` — `amount` (`Float`), `period`, `startDate`/`endDate`, `alertThreshold`, `isActive`, `userId`, `categoryId`.
- `RefreshToken` (including `createdByIp`, `userAgent`, `lastUsedAt`), `VerificationToken`, `PasswordResetToken`, `LoginAttempt`, `PasswordHistory` — auth/audit support.
- `AuthAuditEvent` — persistent, secret-safe authentication audit trail (see `docs/authentication-audit-logging.md`).
- `Notification` — defined but not yet used.

### Persistence
- PostgreSQL via Prisma 7 and `@prisma/adapter-pg`; the connection string comes from `DATABASE_URL`.
- Local development uses a persistent Docker-hosted PostgreSQL 16 instance
  (container `expensetracker-postgres`, named volume
  `expensetracker-postgres-data`) instead of a Neon-hosted database. The
  runtime role is `expensetracker_app` and schema management uses
  `expensetracker_migrate`; integration tests create their own disposable
  databases and never touch `expensetracker_dev`.
- Committed Prisma migrations (`src/backend/src/prisma/migrations`) are the
  authoritative schema mechanism; a fresh database is reconstructed with
  `task prisma:deploy`.
- `src/backend/src/generated` is the generated client and is gitignored.
- Database reset/cleanup utilities exist in `src/backend/scripts/prepare.db.js` and `src/backend/scripts/resetdb.sh` for the test database.

## Mobile

### Entry point and routing
- Entry point is `expo-router/entry` (`src/mobile/package.json`).
- File-based routes live in `src/mobile/app`:
  - `app/_layout.tsx` — root layout; wraps the app in `ThemeProvider` and `AuthProvider`.
  - `app/index.tsx` — splash/redirect based on auth state.
  - `app/(auth)/` — login and registration (other auth screens are stubs).
  - `app/(tabs)/_layout.tsx` — bottom tab navigator (Dashboard, Transactions, Budgets, Profile).
  - `app/connection.tsx` — API connectivity checker.

### State and data flow
- `AuthContext` (`src/mobile/src/contexts/AuthContext.tsx`) manages the user, login/register/logout, and token storage in `expo-secure-store`.
- `ThemeContext` (`src/mobile/src/contexts/ThemeContext.tsx`) manages a named theme persisted in AsyncStorage.
- `src/mobile/src/api/client.ts` is an Axios instance; a response interceptor retries `401` responses once by refreshing the token.
- `src/mobile/src/api/config.ts` derives the API base URL from `expo-constants` extra config (environment-driven).
- Reusable UI primitives live in `src/mobile/src/components/ui`; forms use `src/mobile/src/components/forms`.
- Styles are generated by the `useStyles` hook from `src/mobile/src/constants/*.styles.ts` and `src/mobile/src/types/StyleScheme.ts`.

### Primary data flow
1. `app/(tabs)/index.tsx` (Dashboard) reads `useAuth()` and fetches `/user/dashboard`.
2. `QuickAddForm` posts a new transaction to `/transactions` and refreshes the dashboard.
3. Auth screens call `login`/`register` in `AuthContext`, which stores tokens and sets the Axios authorization header.

## Environment and configuration
- Backend loads env files by `NODE_ENV`: `development` -> `dev.env`, `testing` -> `test.env`, otherwise `.env`, all under `src/backend/src/environment/` (gitignored).
- Backend config is centralized in `src/backend/src/configurations/env.config.js`.
- Backend startup fails fast when `JWT_SECRET` is missing or empty. `JWT_ISSUER` and `JWT_AUDIENCE` default to `expensetracker-api` and `expensetracker` respectively.
- Mobile uses `.env` (gitignored) with `.env.example` documenting `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_API_PORT`, and `EXPO_PUBLIC_APP_ENV`.
- `src/mobile/.npmrc` is gitignored with `.npmrc.example` provided.
- API base-URL resolution and network troubleshooting are documented in `docs/engineering/api-connectivity.md`.

> Mobile baseline (verified 2026-10-13): `expo@57.0.27`, `expo-router@57.0.25`, `react-native@0.86.3`, `react@19.2.3`. The SDK 57 upgrade is committed on the current branch (`9ce1a1c`).

## Related product documentation
- Product domain model: `docs/architecture/product-domain-design.md`
- Product strategy: `docs/product/` (vision, inventory, roadmap, subscription strategy).

## Known risks and gaps
These are the remaining observations after the Phase 0 stabilization pass.

- **Monetary precision:** `Transaction.amount` and `Budget.amount` are now Prisma `Decimal` / PostgreSQL `NUMERIC(19, 4)` in the schema. Apply the `20261023000000_decimal_and_currency` migration before running against an existing database; API responses serialize money as canonical decimal strings.
- **Category linkage:** `Transaction.categoryId` now references `Category.id` with `ON DELETE RESTRICT`. New transactions validate category ownership; historical rows are backfilled only when exactly one system or user-owned category matches the old name. The legacy `Transaction.category` string remains for display and backward compatibility.
- **Ownership scoping:** Transaction, budget, and category single-record mutations now use `findFirst` reads plus `updateMany`/`deleteMany` conditional on `{id, userId}`, so cross-user reads and mutations are denied and missing records return 404.
- **Profile update:** `PUT /api/v1/user/profile` is now implemented and validated.
- **Unused tooling:** `src/backend/tsconfig.json` and `ts-jest` exist but backend source is JavaScript. Mobile lint and Node-based unit tests are now configured.
- **Test targets:** backend tests run with `task test`, but the documented 80% coverage threshold is not currently enforced by Jest (the suite exits 0 well below 80%).
- **Enumeration surfaces:** `resendVerification` still distinguishes unknown versus already-verified accounts; `forgotPassword` now returns a generic response.
