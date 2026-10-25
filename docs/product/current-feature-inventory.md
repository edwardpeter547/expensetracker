# Current Feature Inventory

**Status:** Source-backed snapshot of the repository (2026-10-25). No application behavior was changed in this pass.

## Verification evidence
- Source code was inspected directly.
- Backend unit tests were executed 2026-10-25: **192 tests passed** (42 database-gated suites skipped in unit mode).
- Database-gated integration tests were executed 2026-10-25: **9 suites, 41 tests passed** (one single-use-reset test intentionally skipped pending #21).
- Mobile runtime verification was not performed in this pass.

## Classification legend
- **Source only** — source exists and was inspected; no automated or runtime verification.
- **Unit-tested** — covered by the passing Jest unit suite.
- **Integration-tested** — covered by API/database integration tests (none currently exist).
- **Runtime-verified** — exercised in a running environment (not performed here).
- **Partial** — some layers exist but the end-to-end capability is incomplete or known-defective.
- **Placeholder** — empty file, empty router, or commented-out body.
- **Not implemented** — absent from the repository.
- **Proposed** — product direction only; no code.
- **Unknown** — cannot be confirmed from the repository.

## Auth and account

| Feature | Status | Evidence |
| --- | --- | --- |
| Register | Integration-tested | `src/backend/src/routes/__tests__/auth.register.verify.route.integration.test.js` |
| Login | Integration-tested | `src/backend/src/routes/__tests__/auth.login.route.integration.test.js` |
| Refresh token rotation | Integration-tested | `src/backend/src/services/__tests__/auth.service.refresh.integration.test.js` |
| Logout (revoke refresh token) | Integration-tested | `src/backend/src/routes/__tests__/auth.logout.route.integration.test.js`, `auth.service.logout.integration.test.js` |
| Email verification (send + confirm) | Integration-tested | `src/backend/src/routes/__tests__/auth.register.verify.route.integration.test.js` |
| Forgot password / OTP / change password | Integration-tested | `src/backend/src/routes/__tests__/auth.password.reset.route.integration.test.js`; reset codes are hashed, single-use, and expire |
| Resend verification | Integration-tested | `src/backend/src/routes/__tests__/auth.register.verify.route.integration.test.js` |
| Device session list/revoke | Integration-tested | `src/backend/src/routes/__tests__/auth.session.route.integration.test.js`; revoke-all also bumps `tokenVersion` to invalidate access tokens |
| Password history | Source only | `src/backend/src/prisma/models/user.prisma` (PasswordHistory) |
| JWT auth middleware | Unit-tested | `src/backend/src/middleware/__tests__/auth.middleware.test.js`; HS256/issuer/audience/tokenVersion tests pass |
| Auth validation schemas | Unit-tested | `src/backend/src/validations/__tests__/auth.validation.test.js` |
| Mobile login screen | Source only | `src/mobile/app/(auth)/login.tsx` |
| Mobile register screen | Source only | `src/mobile/app/(auth)/register.tsx` |
| Mobile forgot-password / reset-password / verify-email | Placeholder | empty files in `src/mobile/app/(auth)/` |
| Mobile token storage + refresh interceptor | Source only | `src/mobile/src/contexts/AuthContext.tsx`, `src/mobile/src/api/client.ts` |

## Transactions

| Feature | Status | Evidence |
| --- | --- | --- |
| Create transaction (backend) | Source only | `src/backend/src/controllers/transaction.controller.js`, `src/backend/src/services/transaction.service.js` |
| List own transactions (backend) | Source only | `getTransactionsbyUser` |
| Get single transaction | Source only | `getTransactionById` does **not** scope by user (object-level authorization defect) |
| Update transaction | Source only | `updateTransactionRecord` uses a compound `where` that Prisma `update` does not accept |
| Delete transaction | Source only | `deleteTransactionById` uses a compound `where` that Prisma `delete` does not accept |
| Transaction validation (Joi) | Unit-tested | `src/backend/src/validations/transaction.validation.js`; validation tests pass |
| Mobile quick-add income/expense | Source only | `src/mobile/src/components/forms/QuickAddForm.tsx` |
| Mobile transactions list screen | Placeholder | empty `src/mobile/app/(tabs)/transactions.tsx` |
| Search / filter / tags / splits / attachments / bulk ops | Not implemented | — |
| Recurring transactions | Placeholder | empty `src/backend/src/routes/v1/recurring.routes.js` |

## Categories and budgets

| Feature | Status | Evidence |
| --- | --- | --- |
| Category list/create/delete (backend) | Source only | `src/backend/src/controllers/category.controller.js`, `src/backend/src/services/category.service.js` |
| Category get/update (backend) | Partial | update route `PUT /` lacks `:id`; see `src/backend/src/routes/v1/category.routes.js` |
| Budget CRUD (backend) | Partial | `src/backend/src/controllers/budget.controller.js`, `src/backend/src/services/budget.service.js` |
| Budget spending calculation | Partial | `getBudgetWithSpending` filters by `categoryId`, which does not exist on `Transaction` |
| Mobile categories / budgets UI | Placeholder | empty `src/mobile/app/(tabs)/budgets.tsx`; no category screen |
| Budget alerts | Partial | `alertThreshold` field and `BUDGET_ACTIONS` constants exist; no delivery logic |
| Subcategories / rollover / templates | Not implemented | — |

## Dashboard, profile, and reporting

| Feature | Status | Evidence |
| --- | --- | --- |
| Dashboard summary (income, expenses, balance, recent) | Source only | `src/backend/src/controllers/user.controller.js` `getDashboard`; `src/mobile/app/(tabs)/index.tsx` |
| Mobile dashboard screen | Source only | `src/mobile/app/(tabs)/index.tsx` |
| Get profile | Integration-tested | `src/backend/src/routes/__tests__/user.profile.route.integration.test.js` |
| Update profile | Integration-tested | `src/backend/src/routes/__tests__/user.profile.route.integration.test.js` |
| Mobile profile screen | Placeholder | empty `src/mobile/app/(tabs)/profile.tsx` |
| Reports, trends, export | Not implemented | — |
| Notifications | Placeholder | empty `src/backend/src/routes/v1/notification.routes.js`; model + constants only |

## Platform and engineering

| Feature | Status | Evidence |
| --- | --- | --- |
| Mobile navigation shell (tabs + auth stack) | Source only | `src/mobile/app/_layout.tsx`, `src/mobile/app/(tabs)/_layout.tsx`, `src/mobile/app/(auth)/_layout.tsx` |
| API client + token refresh | Source only | `src/mobile/src/api/client.ts` |
| Theming (color sets) | Source only | `src/mobile/src/contexts/ThemeContext.tsx`, `src/mobile/src/types/Colors.ts` |
| Backend middleware/util/validation unit tests | Unit-tested | `src/backend/src/**/__tests__`; 192 tests pass |
| Backend controller/service integration tests | Partial | auth flows are integration-tested; most non-auth business flows are not yet covered |
| Mobile tests | Not implemented | no `test` script in `src/mobile/package.json` |
| Database migrations in repo | Unknown | scripts reference migrations; migration directory is gitignored/not present |
| CI/CD workflows | Not implemented | `.github/` contains issue templates only |
| Web application | Proposed | vision only; no web app in repo |
| Subscription/billing | Proposed | strategy only; not in code |

## Summary
- **Unit-verified:** middleware, utils, validation schemas, controllers, and services (192 tests passing).
- **Integration-verified:** auth registration/verification/resend, login, refresh, logout, password reset, profile, ownership denial, and device-session routes.
- **Source-only or partial:** most non-auth business flows (transactions, categories, budgets, dashboard) have code but lack integration tests and contain known defects.
- **Placeholders:** several mobile screens, profile update, notifications, recurring routes.
- **Proposed only:** web app, SaaS tiers, bank connectivity, collaboration, AI, goals, reporting, export.
