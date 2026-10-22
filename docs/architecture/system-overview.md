# System Overview

## Purpose
ExpenseTracker is a personal finance application. The current implementation covers:

- User registration, email verification, login, logout, token refresh, and password reset.
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
  3. `morgan` request logging.
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
- Authentication uses `Authorization: Bearer <accessToken>`. Refresh tokens are random hex strings stored server-side with expiry and revocation flags.
- Status codes come from `http-status-codes`.

### Auth flow
1. `POST /api/v1/auth/register` creates an inactive user, issues access + refresh tokens, records a login attempt, creates a verification token, and sends a welcome email (fire-and-forget).
2. `GET /api/v1/auth/verify-email?token=...` activates the user.
3. `POST /api/v1/auth/login` validates credentials, updates last login, and returns user + tokens.
4. `POST /api/v1/auth/refresh-token` rotates refresh tokens (old token is revoked).
5. `POST /api/v1/auth/logout` (protected) revokes the presented refresh token.
6. `POST /api/v1/auth/forgot-password` creates a 6-digit reset code and emails it; `POST /api/v1/auth/verify-otp` verifies it; `POST /api/v1/auth/change-password` resets the password and writes a password-history record.

### Data model
The Prisma schema is split across `src/backend/src/prisma/schema.prisma` (generator + datasource) and fragments in `src/backend/src/prisma/models`. The generated client is emitted to `src/backend/src/prisma/generated`.

Core models:

- `User` — credentials, profile fields, verification flags, and preferences (`currency`, `timezone`, `language`, `theme`).
- `Transaction` — `amount` (`Float`), `transType` (`INCOME`/`EXPENSE`), `category` (string), `description`, `receiptUrl`, `location`, `transactionDate`, `userId`.
- `Category` — `name`, `icon`, `isSystem`, optional `userId`.
- `Budget` — `amount` (`Float`), `period`, `startDate`/`endDate`, `alertThreshold`, `isActive`, `userId`, `categoryId`.
- `RefreshToken`, `VerificationToken`, `PasswordResetToken`, `LoginAttempt`, `PasswordHistory` — auth/audit support.
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
- `src/backend/src/prisma/generated` is the generated client and is gitignored.
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
- Mobile uses `.env` (gitignored) with `.env.example` documenting `LOCAL_SERVER_IP`, `LOCAL_SERVER_PORT`, and `API_URL`.
- `src/mobile/.npmrc` is gitignored with `.npmrc.example` provided.

> Mobile baseline (verified 2026-10-13): `expo@57.0.27`, `expo-router@57.0.25`, `react-native@0.86.3`, `react@19.2.3`. The SDK 57 upgrade is committed on the current branch (`9ce1a1c`).

## Related product documentation
- Product domain model: `docs/architecture/product-domain-design.md`
- Product strategy: `docs/product/` (vision, inventory, roadmap, subscription strategy).

## Known risks and gaps
These are observations only; no behavior has been changed.

- **Monetary precision:** `Transaction.amount` and `Budget.amount` are Prisma `Float`. Floating-point arithmetic on financial values can drift; an integer/cents or `Decimal` representation should be evaluated.
- **Category linkage:** `Budget` references `Category`, but `Transaction.category` is a free-form string, and `budget.service.js` filters spending by a `categoryId` field that does not exist on `Transaction`. Budget spending aggregation is likely broken until this is aligned.
- **Ownership scoping:** `getTransactionById` reads by id only without checking `userId`, and update/delete use compound `where` clauses that Prisma's `update`/`delete` do not accept for non-unique fields. Transaction ownership checks need review.
- **API naming drift:** validation uses `recieptUrl` while the database field is `receiptUrl`; `category.routes.js` `PUT /` lacks an `:id` parameter.
- **Unused tooling:** `src/backend/tsconfig.json` and `ts-jest` exist but backend source is JavaScript; `src/mobile/eslint.config.js` is empty, so `expo lint` is not meaningfully configured.
- **Test targets:** the mobile package has no `test` script, so only `task lint` (via `expo lint`) is available; backend tests run with `task test`.
- **Secrets in logs:** some dev-only `console.log` calls print tokens/codes or full objects; these should be removed before production.
