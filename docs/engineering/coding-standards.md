# Coding Standards

These standards describe how code is written in this repository today and how it should evolve. Sections marked **Existing** reflect observed conventions; sections marked **Proposed** are forward-looking guidance that is compatible with the current code.

## JavaScript / TypeScript baseline

- The backend is **plain JavaScript (ES modules)** with JSDoc for public functions. Do not convert it to TypeScript in this phase.
- The mobile app is **TypeScript** with `strict: true`. Use explicit types for component props and context values.
- Use `import`/`export` (ESM) in the backend; TypeScript/ESM in mobile.
- No new module system, package manager, or formatter is introduced.

### Mandatory JavaScript documentation

- Every newly introduced or modified function or methods must have meaningful JSDoc, including private helpers, test fixtures, setup/teardown helpers, and test callbacks.
- Document parameters using `@param`, return values using `@returns`, and important exceptions using `@throws`, where applicable.
- Each Jest `test()` or `it()` callback must have a preceding documentation comment explaining the scenario, behavior under test, and expected result.
- For security-sensitive tests, document relevant invariants, such as atomicity, ownership, replay detection, and rollback behavior.
- Avoid comments that merely repeat function or test names.
- Keep documentation synchronized with the implementation.
- Review documentation compliance before declaring a task complete.

### Object-oriented design and SOLID

The backend uses plain named-function modules, not classes, except where
stateful behavior genuinely benefits (for example, `EmailService` and
`EmailTemplateService`). SOLID is guidance, not a mandate to create classes.

- **Single responsibility:** routes declare intent, controllers translate HTTP
  to service calls, services own business rules and persistence, and Prisma is
  confined to services.
- **Open/closed:** extend behavior through small composable units instead of
  editing unrelated modules.
- **Liskov substitution:** apply only where polymorphism or interchangeable
  implementations actually exist; do not add inheritance to demonstrate LSP.
- **Interface segregation:** keep module contracts focused and avoid exposing
  unrelated responsibilities.
- **Dependency inversion:** depend on stable boundaries where it aids
  testability (for example, accepting a Prisma transaction client). Do not
  introduce a dependency-injection container.
- **Composition over inheritance:** prefer composed functions and plain
  objects; use a class only when mutable state and identity are central to the
  behavior.

### DRY, KISS, and YAGNI

- Inspect existing utilities, validators, middleware, and test helpers before
  writing a new one. Reuse is required for genuine shared behavior; do not
  abstract coincidental similarity.
- Prefer straightforward code over wrappers, indirection, and overly generic
  utilities.
- Do not build speculative functionality or abstractions for hypothetical
  integrations, and never document proposed capabilities as implemented.

### API documentation

- Every implemented Express route must be represented in
  `backend/openapi/openapi.yaml` (OpenAPI 3.1) with a unique `operationId`.
- Validate the specification with `npm run docs:validate`; the route-coverage
  test (`backend/src/docs/__tests__/apiDocs.test.js`) fails when implemented
  routes and documented operations drift.
- Document actual behavior, including known defects and contract
  inconsistencies, rather than an idealized contract.
- Serve the specification and Swagger UI only through the gated
  `/api/openapi.json` and `/api/docs` endpoints (see `ENABLE_API_DOCS`).

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

## Python tooling

This is an adopted engineering standard and applies to repository automation and any other Python code.

- Every module has a purpose docstring describing the module's responsibility.
- Every class has a docstring explaining its responsibility and, for data classes, the meaning of its attributes and important invariants.
- Every function and method, including private helpers, has a meaningful docstring.
- Functions with parameters document each parameter, its meaning, and any important constraints.
- Functions that return a value document what is returned and its meaning.
- Functions that raise exceptions document the relevant exceptions and circumstances.
- Functions with important side effects document those effects.
- Use a consistent Google-style docstring format with ``Args:``, ``Returns:``, and ``Raises:`` sections where applicable.
- Use meaningful type annotations compatible with Python 3.9.
- Add explanatory comments for complex algorithms, security-sensitive checks, and non-obvious implementation decisions.
- Avoid redundant comments that simply restate the code.
- Keep documentation synchronized with implementation behavior.
- Colocate tests with the module or feature they test (e.g. `scripts/github_tickets/tests/`) instead of a generic root-level tests directory.

A concise one-line docstring is acceptable only for trivial functions with no parameters, no meaningful return value, no exceptions, and no important side effects. A one-line docstring must not replace documenting a non-trivial function's contract.

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
