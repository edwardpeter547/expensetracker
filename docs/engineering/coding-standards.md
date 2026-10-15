# Coding Standards

These standards describe how code is written in this repository today and how it should evolve. Sections marked **Existing** reflect observed conventions; sections marked **Proposed** are forward-looking guidance that is compatible with the current code.

## JavaScript / TypeScript baseline

- The backend is **plain JavaScript (ES modules)** with JSDoc for public functions. Do not convert it to TypeScript in this phase.
- The mobile app is **TypeScript** with `strict: true`. Use explicit types for component props and context values.
- Use `import`/`export` (ESM) in the backend; TypeScript/ESM in mobile.
- No new module system, package manager, or formatter is introduced.

### Naming

**Existing**
- Files: kebab-case (`.js`, `.ts`, `.tsx`, `.prisma`).
- Backend functions/variables: camelCase; exported service functions use verb-first names (`getTransactionsbyUser`, `createTransactionRecord`).
- Constants: `UPPER_SNAKE_CASE` in `backend/src/constants`.
- React components: PascalCase; hooks: `useX`; contexts end in `Context`; types/interfaces: PascalCase.

**Proposed**
- Keep names self-describing; avoid one-letter variables except trivial loop indices.
- Prefer consistent naming (`getTransactionsByUser` over `getTransactionsbyUser`) only when touching that code.

### Module organization

- One concern per file where practical; group by responsibility (route, controller, service, component).
- Use relative imports in the backend (`../services/...`) and the `@/*` alias in mobile for `src/` imports.
- Barrel files exist only for routes (`routes/index.js`); avoid introducing new barrel files speculatively.

### Functions

**Existing**
- Controllers and services export small named functions rather than classes.
- Reusable helpers are pure functions in `backend/src/utils`.

**Proposed**
- One responsibility per function; keep functions short and testable.
- Prefer named exports for new backend functions to match existing services.
- Use JSDoc where it explains non-obvious behavior (backend), and inline `interface`/type docs sparingly in mobile.

## Node.js and Express backend

### Routing and HTTP semantics

- Version routes under `/api/v1`; mount route modules from `backend/src/routes/index.js`.
- Use RESTful verbs and return appropriate status codes via `http-status-codes` (`201` for create, `204` for delete, `404` for missing records).
- Keep route files thin: middleware composition + controller reference.

### Validation

- Validate every public input with Joi at the route boundary using `validate`, `validateParams`, or `validateQuery`.
- Use `abortEarly: false` and `stripUnknown: true` (already the default in the middleware).
- Define reusable field builders in `backend/src/validations/common.validation.js`.

### Controllers

- Wrap async handlers in `catchAsync` so rejected promises reach the error middleware.
- Controllers should parse/request, call a service, and shape the response; business rules belong in services.
- Return the standard envelope `{ success, message, data, errors }`.

### Services and data access

- Keep Prisma calls in `backend/src/services`; controllers should not import Prisma directly.
- Scope user-owned data by `userId` in queries; do not trust a bare id from the URL.
- Use Prisma `select`/`include` to avoid returning password hashes or token fields.

### Errors and async

- Throw `AppError(message, statusCode, errors?)` for operational failures.
- Let the centralized `errorHandler` translate Prisma/JWT errors; do not scatter try/catch in every handler.
- `catchAsync` is the established pattern for async error propagation — reuse it.

### Logging

- Use `winston` via `backend/src/configurations/logger.config.js` with structured metadata.
- Log at the appropriate level and mask PII (e.g. `maskEmail`). Do not log tokens, passwords, or reset codes.

### Configuration

- Centralize environment access in `backend/src/configurations/env.config.js`; avoid reading `process.env` directly elsewhere.
- Keep new env values documented and provide sane defaults.

## Expo and React Native frontend

### Components

- Use functional components with typed props.
- Reuse primitives from `mobile/src/components/ui` (Button, Input, SafeScreen) before writing new ones.
- Keep screens in `mobile/app` thin; extract repeated UI into `mobile/src/components`.
- Separate UI from business logic: network calls belong in the API client or a hook, not inline in JSX.

### Props and interfaces

- Declare an `interface` for props (`interface AvatarProps { ... }`) and type function parameters.
- Use optional props with defaults for values that have sensible fallbacks.

### Hooks and state

- Use React hooks; no class components.
- Use Context for global state that already exists (`AuthContext`, `ThemeContext`) rather than adding a new state library.
- Custom hooks (`useAuth`, `useTheme`, `useStyles`) wrap context and throw a clear error when used outside the provider.
- `useEffect` should clean up subscriptions/timers; keep effects focused on one concern.

### Navigation

- Use `expo-router` file-based routes; do not add a second routing system.
- Use `router.replace` for auth redirects and `router.push` for forward navigation.
- Keep route groups (`(auth)`, `(tabs)`) aligned with their `_layout.tsx`.

### API integration

- Send all requests through `mobile/src/api/client.ts`; do not create ad-hoc Axios instances.
- The interceptor already handles `401` refresh; keep token storage in `expo-secure-store`.
- Handle `loading`, `error`, and `empty` states explicitly in screens; show user-facing error text from `error.response.data.message` where available.

### Forms and validation

- Validate required fields client-side before submit, then rely on backend Joi validation as the source of truth.
- Disable submit while in-flight and display inline error messages.

### Accessibility and platform

- Use semantic components and readable text; preserve `TextInput` accessibility props passed through `Input.tsx`.
- Use platform guards (`Platform.OS`) only for genuine differences (e.g. keyboard behavior); prefer cross-platform code.
- Avoid native modules not listed in the Expo SDK unless the change is explicitly discussed.

## Financial correctness conventions

- Treat monetary values as data, not display strings: keep parsing/formatting consistent and centralized.
- Use exact arithmetic for money. Amounts are currently Prisma `Float`; until a representation decision is approved, do **not** introduce new floating-point financial calculations. Prefer integer minor units or `Decimal` when the schema is revisited (see `docs/decisions/README.md`).
- Define currency precision and rounding explicitly; round once at a documented boundary, not repeatedly during sums.
- Use UTC storage for timestamps and derive financial periods from the user's timezone; never mix timezone semantics silently.
- Preserve the income/expense distinction (`transType`) rather than relying on sign alone.
- Keep budget aggregation consistent with the transaction category model; resolve the `Transaction.category` string vs `Budget.categoryId` mismatch before relying on budget totals.
- Model transfers as two equal, opposite legs that are excluded from net income/expense.
- Make financial writes idempotent and include duplicate detection to avoid double-counting.

## Security conventions

- Scope every user-owned query by `userId`; enforce object-level authorization for single-record reads, updates, and deletes.
- When household features are added, enforce household-scoped access separately from personal access; never grant implicit cross-user access.
- Store tokens in `expo-secure-store` on mobile and validate them server-side; use short-lived access tokens and rotating refresh tokens.
- Never log tokens, passwords, reset codes, or full financial payloads; mask PII (e.g., `maskEmail`).
- Treat export and deletion as authorized actions: verify the requesting user's ownership and record the action.
- Keep security and data isolation available on every tier; do not gate essential security behind a subscription.

## General

- Avoid code duplication; factor shared logic into `utils`, services, or hooks.
- Prefer simple, direct code over clever abstractions (KISS/YAGNI).
- Keep dependencies minimal; do not add a package for something the standard library or an existing dependency already covers.
