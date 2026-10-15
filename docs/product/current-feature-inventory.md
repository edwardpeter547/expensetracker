# Current Feature Inventory

**Status:** Source-backed snapshot of the repository (2026-10-13). No application behavior was changed.

## Verification evidence
- Source code was inspected directly.
- Backend unit tests were executed 2026-10-13: **9 suites, 95 tests passed**; coverage 89.26% statements / 76.78% branches.
- The passing tests cover `middleware`, `utils`, and `validations` only. There are **no** controller, service, route, or integration tests.
- No runtime verification of the mobile app or of database-backed flows was performed in this phase.

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
| Register | Source only | `backend/src/routes/v1/auth.routes.js`, `backend/src/controllers/auth.controller.js`, `backend/src/services/auth.service.js` |
| Login | Source only | `auth.controller.js`; JWT issuance in `backend/src/utils/helpers.js` |
| Refresh token rotation | Source only | `auth.controller.js` refreshToken; no integration test |
| Logout (revoke refresh token) | Source only | `auth.controller.js` logout |
| Email verification (send + confirm) | Source only | `auth.controller.js`, `backend/src/services/email.service.js`, `backend/src/messaging/templates` |
| Forgot password / OTP / change password | Source only | `auth.controller.js`, `backend/src/services/auth.service.js` |
| Resend verification | Source only | `auth.controller.js` |
| Password history | Source only | `backend/src/prisma/models/user.prisma` (PasswordHistory) |
| JWT auth middleware | Unit-tested | `backend/src/middleware/auth.middleware.js`; middleware test suite passes |
| Auth validation schemas | Unit-tested | `backend/src/validations/__tests__/auth.validation.test.js` |
| Mobile login screen | Source only | `mobile/app/(auth)/login.tsx` |
| Mobile register screen | Source only | `mobile/app/(auth)/register.tsx` |
| Mobile forgot-password / reset-password / verify-email | Placeholder | empty files in `mobile/app/(auth)/` |
| Mobile token storage + refresh interceptor | Source only | `mobile/src/contexts/AuthContext.tsx`, `mobile/src/api/client.ts` |

## Transactions

| Feature | Status | Evidence |
| --- | --- | --- |
| Create transaction (backend) | Source only | `backend/src/controllers/transaction.controller.js`, `backend/src/services/transaction.service.js` |
| List own transactions (backend) | Source only | `getTransactionsbyUser` |
| Get single transaction | Source only | `getTransactionById` does **not** scope by user (object-level authorization defect) |
| Update transaction | Source only | `updateTransactionRecord` uses a compound `where` that Prisma `update` does not accept |
| Delete transaction | Source only | `deleteTransactionById` uses a compound `where` that Prisma `delete` does not accept |
| Transaction validation (Joi) | Unit-tested | `backend/src/validations/transaction.validation.js`; validation tests pass |
| Mobile quick-add income/expense | Source only | `mobile/src/components/forms/QuickAddForm.tsx` |
| Mobile transactions list screen | Placeholder | empty `mobile/app/(tabs)/transactions.tsx` |
| Search / filter / tags / splits / attachments / bulk ops | Not implemented | — |
| Recurring transactions | Placeholder | empty `backend/src/routes/v1/recurring.routes.js` |

## Categories and budgets

| Feature | Status | Evidence |
| --- | --- | --- |
| Category list/create/delete (backend) | Source only | `backend/src/controllers/category.controller.js`, `backend/src/services/category.service.js` |
| Category get/update (backend) | Partial | update route `PUT /` lacks `:id`; see `backend/src/routes/v1/category.routes.js` |
| Budget CRUD (backend) | Partial | `backend/src/controllers/budget.controller.js`, `backend/src/services/budget.service.js` |
| Budget spending calculation | Partial | `getBudgetWithSpending` filters by `categoryId`, which does not exist on `Transaction` |
| Mobile categories / budgets UI | Placeholder | empty `mobile/app/(tabs)/budgets.tsx`; no category screen |
| Budget alerts | Partial | `alertThreshold` field and `BUDGET_ACTIONS` constants exist; no delivery logic |
| Subcategories / rollover / templates | Not implemented | — |

## Dashboard, profile, and reporting

| Feature | Status | Evidence |
| --- | --- | --- |
| Dashboard summary (income, expenses, balance, recent) | Source only | `backend/src/controllers/user.controller.js` `getDashboard`; `mobile/app/(tabs)/index.tsx` |
| Mobile dashboard screen | Source only | `mobile/app/(tabs)/index.tsx` |
| Get profile | Source only | `user.controller.js` `getProfile` |
| Update profile | Placeholder | `updateProfile` body is commented out in `user.controller.js` |
| Mobile profile screen | Placeholder | empty `mobile/app/(tabs)/profile.tsx` |
| Reports, trends, export | Not implemented | — |
| Notifications | Placeholder | empty `backend/src/routes/v1/notification.routes.js`; model + constants only |

## Platform and engineering

| Feature | Status | Evidence |
| --- | --- | --- |
| Mobile navigation shell (tabs + auth stack) | Source only | `mobile/app/_layout.tsx`, `mobile/app/(tabs)/_layout.tsx`, `mobile/app/(auth)/_layout.tsx` |
| API client + token refresh | Source only | `mobile/src/api/client.ts` |
| Theming (color sets) | Source only | `mobile/src/contexts/ThemeContext.tsx`, `mobile/src/types/Colors.ts` |
| Backend middleware/util/validation unit tests | Unit-tested | `backend/src/**/__tests__`; 95 tests pass |
| Backend controller/service integration tests | Not implemented | — |
| Mobile tests | Not implemented | no `test` script in `mobile/package.json` |
| Database migrations in repo | Unknown | scripts reference migrations; migration directory is gitignored/not present |
| CI/CD workflows | Not implemented | `.github/` contains issue templates only |
| Web application | Proposed | vision only; no web app in repo |
| Subscription/billing | Proposed | strategy only; not in code |

## Summary
- **Unit-verified:** middleware, utils, and validation schemas (95 tests passing).
- **Source-only or partial:** most business flows (auth, transactions, categories, budgets, dashboard) have code but lack integration tests and contain known defects.
- **Placeholders:** several mobile screens, profile update, notifications, recurring routes.
- **Proposed only:** web app, SaaS tiers, bank connectivity, collaboration, AI, goals, reporting, export.
