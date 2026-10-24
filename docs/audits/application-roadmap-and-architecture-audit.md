# Application Roadmap and Architecture Audit

**Repository:** `edwardpeter547/expensetracker`
**Audit date:** 2026-10-24
**Audit basis:** checked-out branch `py/issue-89-application-improvement-foundation` (HEAD `6c3ed0b`), clean working tree
**Nature:** Read-only assessment. No application code, GitHub issues, pull requests, branches, or database records were modified.

---

## 1. Executive Summary

The product has a sound, layered foundation (Express 5 + Prisma 7/PostgreSQL backend; Expo SDK 57 / React Native mobile client) and unusually good written strategy for its stage: a phased product roadmap, product requirements, subscription strategy, an accepted ADR for authentication architecture, and a ticket-automation workflow that enforces plan-hash approvals.

The most important structural fact about the current codebase is that **the recently completed "application foundation" work (PR #93, issues #89-#92) closed the largest correctness and security gaps that earlier documentation still describes as open.** Verified against source: refresh tokens are now SHA-256 hashed with atomic rotation and reuse/family revocation; transaction/budget/category single-record reads and mutations are owner-scoped and return 404 on mismatch; monetary columns are `DECIMAL(19,4)` with a nullable `currency` field and per-currency budget aggregation; `Transaction.categoryId` now links transactions to categories with a backfill migration; profile update and the category/budget single-record routes are implemented. The stale `docs/product/current-feature-inventory.md` (2026-10-13) and `docs/engineering/testing-strategy.md` no longer reflect this state and actively misstate several facts.

Despite that progress, the product is **not yet usable end-to-end for its core purpose**. Three of the four mobile tab screens (`transactions.tsx`, `budgets.tsx`, `profile.tsx`) and three auth screens (`forgot-password.tsx`, `reset-password.tsx`, `verify-email.tsx`) are empty files. The backend APIs those screens would consume exist and are owner-scoped, but there is **no GitHub Epic, Story, or Task tracking the Phase 1 MVP mobile feature work at all** — this is the largest roadmap-to-GitHub gap.

Epic #7 (Authentication and Authorization) is partially implemented: the critical defects (sensitive-data exposure, IDOR on transaction read, plaintext refresh tokens, non-atomic rotation, broken budget/category routes) are fixed, but several MVP acceptance criteria remain open in both code and GitHub: login still distinguishes unknown email (`401`) from wrong password (`403`), there is no account lockout or per-endpoint rate limiting, the password-reset code is not consumed on use, change-password-with-current-password is missing, and the promised authentication integration test suite exists only for refresh/logout.

There is **no CI/CD pipeline and no application Dockerfiles** — `.github/` contains issue templates only, and stories #3/#30 (Dockerize backend, GitHub Actions CI) are open with no implementation. Local PostgreSQL is Docker-managed and well documented.

**Primary recommendation:** complete the remaining Epic #7 MVP acceptance criteria — fix login enumeration, add per-endpoint rate limiting and lockout, consume the password-reset token, add change-password-with-current-password, and backfill the authentication integration test suite (#76) — before investing in new features. This is the documented Phase 0 gate ("make what exists correct, safe, and testable before adding features") and it is already tracked by existing issues (#15, #20, #21, #24, #25, #27, #75, #76, #77). The mobile MVP screens should follow immediately in the next cycle.

---

## 2. Audit Scope, Methodology, and Evidence Limitations

### Scope

The audit covered: repository layout and instructions (`AGENTS.md`, root `README.md`); the full GitHub issue graph (79 issues); product and engineering documentation under `docs/`; the backend (routes, controllers, services, validation, middleware, Prisma schema and migrations, configuration); the mobile client (routing, screens, API client, auth/locale/theme contexts, localization); infrastructure and developer tooling (Taskfile, Docker scripts, environment files); and the test suites.

### Method

1. Repository discovery: `git status`, branch/log inspection, file inventory via `rg --files`.
2. GitHub inventory: read-only `gh issue list` and `gh pr list` with `--json` including `parent` and `subIssues` (native hierarchy, not labels).
3. Local ticket manifests (`tickets/packages/*/manifest.json`) cross-checked against live GitHub state.
4. Documentation review, then targeted source inspection to verify or refute documented claims.
5. Non-destructive test execution: backend Jest suite, mobile Node test runner, mobile type-check, OpenAPI validation, Prisma schema validation, and ticket-package validation.

### Evidence classification

- **Verified:** confirmed directly against source, test output, GitHub data, or committed files.
- **Inferred:** a reasonable conclusion from available evidence, not directly exercised.
- **Unverified:** cannot be confirmed without a running database, credentials, or external services.

### Limitations

- **Database-backed behavior was not executed.** Integration tests are gated behind `RUN_DB_INTEGRATION=1` and a local disposable PostgreSQL; the local container was not started and no migration was applied. Budget/aggregation correctness and owner-scoped mutation semantics are therefore **source-verified but not database-verified**.
- **Runtime mobile behavior was not exercised.** Expo screens were inspected statically only; no simulator/device run was performed.
- **Live GitHub state** was read at audit time via CLI; issue states may change after this report.
- **Local branch skew:** the audit ran on `py/issue-89-application-improvement-foundation`, which is two commits ahead of the locally known `develop`/`origin/develop` refs (`#90`, `#91/#92`). PR #93 shows those commits merged into the remote `develop`; the local remote-tracking ref is stale.

---

## 3. Current Repository and Architecture Overview

### Component inventory

| Component | Location | Responsibility | Communication | Data dependency |
| --- | --- | --- | --- | --- |
| Express API | `src/backend/` | Auth, transactions, categories, budgets, profile, dashboard, health, docs | HTTP `/api/v1` (JSON envelope `{success,message,data,errors}`) | PostgreSQL via Prisma 7 + `@prisma/adapter-pg` |
| Prisma schema | `src/backend/src/prisma/` | `User`, `Transaction`, `Category`, `Budget`, `RefreshToken`, tokens, `LoginAttempt`, `PasswordHistory`, `Notification` | Generated client in `src/backend/src/generated/` | PostgreSQL |
| Expo mobile app | `src/mobile/` | File-based routes (`app/(auth)`, `app/(tabs)`), typed contexts | Axios via `src/mobile/src/api/client.ts` | Backend API |
| Go Task orchestration | `Taskfile.yml`, `build/` | Dev, DB, Prisma, test, docs, quality, network commands | Shell subprocess | Docker (Postgres), npm |
| Ticket automation | `scripts/github_tickets.py`, `scripts/github_tickets/` | Validate/plan/approve/apply manifest-driven GitHub tickets | GitHub REST/GraphQL (read-only unless authorized) | GitHub |
| Local PostgreSQL | `build/scripts/database/postgres.sh` | Docker-managed Postgres 16 (`expensetracker-postgres`) | TCP `127.0.0.1:5432` | Named volume `expensetracker-postgres-data` |

### Backend layering (verified)

`route -> Joi validation -> controller -> service -> Prisma`, with centralized `error.middleware.js` and `catchAsync`. Confirmed in `src/backend/src/routes/v1/*.routes.js`, controllers, and services.

### Mobile structure (verified)

`expo-router` file-based routing under `src/mobile/app`; root layout wraps `ThemeProvider` → `LocaleProvider` → `AuthProvider`. An Axios response interceptor performs single-flight 401 token refresh. Token storage uses `expo-secure-store`.

### Runtime and deployment assumptions

- Backend `PORT` defaults to 3000 (mobile default API port is 7001, resolved per-platform in `config.resolver.ts`).
- `NODE_ENV` selects environment files under `src/backend/src/environment/` (gitignored).
- Local DB is Docker-only; no Dockerfile or compose file exists for the application itself.
- No CI, no deployment pipeline, no monitoring/error-reporting integration is present in-repo.

### Known integration points

- Mobile ↔ backend base-URL resolution (`EXPO_PUBLIC_API_URL` / LAN host inference).
- Email delivery via Nodemailer (Ethereal in dev/test; production SMTP config is incomplete — see §11).
- OpenAPI contract at `src/backend/openapi/openapi.yaml`, enforced by `src/backend/src/docs/__tests__/apiDocs.test.js`.

### Architectural uncertainties

- Whether `{id, userId}` owner-scoped mutations return the expected 404 at the database level was **not executed** (Prisma extended `WhereUniqueInput` acceptance is inferred from generated types; the prior audit documented the same caveat).
- The generated client is emitted to `src/backend/src/generated` (per `schema.prisma` `output = "../generated"`), not `src/backend/src/prisma/generated` as one documentation passage claims.

---

## 4. GitHub Epic, Story, and Task Inventory

Retrieved read-only with `gh issue list --state all --json number,title,state,parent,subIssues`. PRs (which share the issue numbering) are excluded. **79 issues total: 4 Epics, 27 Stories, 48 Tasks.**

### Epics

| Epic | Title | State |
| --- | --- | --- |
| #7 | Authentication and Authorization | OPEN |
| #29 | Project Infrastructure Development | OPEN |
| #46 | Establish Comprehensive ExpenseTracker Project Documentation | OPEN |
| #64 | GitHub Issue Management Automation | OPEN (REOPENED) |

### Story and task counts by epic

| Epic | Stories (open/closed) | Tasks (open/closed) |
| --- | --- | --- |
| #7 | 6 / 0 | 12 / 9 |
| #29 | 11 / 1 | 3 / 4 |
| #46 | 9 / 0 | 1 / 7 |
| #64 | 0 / 1 | 0 / 7 |
| Unparented tasks | — | 0 / 5 |
| **Total** | **27 (25 open / 2 closed)** | **48 (20 open / 28 closed)** |

### Full inventory

The complete listing is reproduced in §21 Appendix. Closed tasks include #6, #16, #17, #23, #39, #40, #44, #56-#62, #66-#71, #73, #80, #81, #87, #90-#92. Open tasks under Epic #7 include #14, #15, #18-#22, #24-#28, and #75-#79.

---

## 5. Epic-by-Epic Assessment

| Epic | Objective | Status | Stories | Tasks | Implementation | Dependencies | Risks | Priority | Recommendation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| #7 Authentication & Authorization | Correct, secure, extensible email/password auth; ownership authorization; Google/Apple on a shared identity model | OPEN | 6 open | 9 closed / 12 open | **Partial** — critical defects fixed; hardening + social auth + deletion remain | ADR `0001`; deletion policy for #28 | Enumeration, reset-code replay, missing lockout/audit, social-auth scope | Critical | **Complete MVP acceptance criteria; restructure #22; defer Google/Apple until identity model lands** |
| #29 Project Infrastructure Development | Containerization, CI/CD, monitoring, IaC, local DX | OPEN | 10 open / 1 closed | 4 closed / 3 open | **Partial** — local Postgres + Go Task + Phase 0 stabilization done; Dockerfiles/CI/Sentry/K8s/Terraform/Redis/Celery absent | Docker/CI prerequisites | Over-scoped infra backlog vs actual stage | High | **Complete only #3/#30/#43; defer #31-#38** |
| #46 Documentation | Phase 0-1 documentation foundation | OPEN | 9 open | 7 closed / 1 open | **Mostly complete** — product/engineering docs exist; two stories (#54, #55) have no tasks | — | Stale docs drift from code | Medium | **Close out #54/#55 or restructure; refresh stale docs** |
| #64 GitHub Automation | Ticket manifest tooling | OPEN (REOPENED) | 1 closed | 7 closed | **Implemented** — tooling + tests exist | — | Reopened epic with all children closed | Low | **Close epic or define remaining intent** |

### Notes on estimation method

Implementation status above is **not** derived from closure percentages. It combines live GitHub state with direct source inspection (§8-§13) and test execution (§13). For example, issues #14, #15, #20, #21, #26 are open in GitHub yet their endpoints exist in code; conversely, closed issues #16/#17/#23/#80 are verified implemented.

### Structural observations

- **No-meaningful-progress stories:** Epic #29 stories #30-#38 have zero tasks and no implementation evidence (some predate the Go Task migration).
- **Missing implementation tasks:** no tasks exist for the Phase 1 mobile screens (see §15).
- **Completed-in-code-but-open issues:** #14 (register), #15 (login), #20 (forgot-password), #21 (reset-password), #26 (profile update) are implemented at source level but remain open because their hardening/tests are incomplete.
- **Closed-but-not-fully-satisfied:** #23 (ownership) is closed and verified; #16/#17 are closed and verified. No closed issue was found whose acceptance criteria are contradicted by source.
- **Duplicate work:** none found; the AFI story #89 intentionally sits under existing Epic #29 rather than duplicating it.
- **Stale scope:** story #11/#22 (RBAC) conflicts with the accepted ADR decision to defer the permission matrix; #22 should be restructured to the minimal `authorize` seam.

---

## 6. Product Roadmap Alignment

The roadmap (`docs/product/product-roadmap.md`) defines Phase 0 (stabilize foundation) → Phase 1 (manual MVP) → Phase 2 (web + SaaS) → Phases 3-6. All phases are **Proposed**.

### Roadmap-to-implementation traceability

| Roadmap capability | Documentation reference | GitHub issue | Code evidence | Status | Gap |
| --- | --- | --- | --- | --- | --- |
| Fix transaction ownership + update/delete semantics | Phase 0 | #23 (closed) | `transaction.service.js` owner-scoped reads/mutations | **Implemented** | None |
| Fix Budget↔Transaction category alignment | Phase 0 | #92 (closed) | `categoryId` + `20261023000000_decimal_and_currency` migration | **Implemented** | None |
| Approve monetary representation before financial math | Phase 0 | #92 (closed) | `DECIMAL(19,4)`, `money.js`, per-currency aggregation | **Implemented** | Documentation not updated everywhere (coding-standards still says "amounts are currently Float") |
| Complete profile update + category update route | Phase 0 | #26 (open, code done), category routes | `user.controller.js updateProfile`, `PUT /categories/:id` | **Implemented** | #26 still open in GitHub |
| Backfill controller/service integration tests | Phase 0 | #76 (open) | refresh/logout integration only | **Partial** | Register/login/reset/ownership integration tests missing |
| Reliable online transaction capture + mobile screens | Phase 1 | **none** | Dashboard + QuickAdd only; transactions/budgets/profile screens empty | **Partial** | No tracking issue; core screens missing |
| Transactions list + search/date/category filters | Phase 1 | **none** | Backend list exists; no filtering params | **Partial** | No UI; no filter support |
| Category management + basic budgets UI | Phase 1 | **none** | Backend CRUD exists; budgets screen empty | **Partial** | No UI |
| CSV export + account deletion | Phase 1 / Phase 2 | #28 (gated) | Not implemented | **Missing** | Deletion gated on retention policy; export absent |
| Web experience + SaaS entitlements | Phase 2 | **none** | Not implemented | **Not implemented** | New epics required when approved |
| Recurring transactions / advanced budgets | Phase 3 | **none** | `recurring.routes.js` empty; `Notification` model unused | **Not implemented** | New epics required |
| Household / goals / forecast / bank / AI | Phases 4-6 | **none** | Conceptual only (`product-domain-design.md`) | **Not implemented** | New epics required |

### Most significant inconsistencies

1. **Phase 1 has no GitHub representation.** The roadmap's Phase 1 feature set is entirely untracked, while Phases 3-6 infrastructure (#31-#38) has stories already created.
2. **Stale inventory vs code.** `docs/product/current-feature-inventory.md` reports defects ("IDOR transaction read", "compound-where rejects update", "budget spending filters by nonexistent `categoryId`", "profile update commented out", "migrations not present") that are **no longer true**. Using this document as a planning input would produce incorrect tickets.
3. **Coding standards drift.** `docs/engineering/coding-standards.md` still says amounts are Prisma `Float` and that a representation decision is pending, though `Decimal` was adopted and migrated.
4. **Testing strategy drift.** `docs/engineering/testing-strategy.md` says there are "no controller, service, route, or integration tests, and no mobile tests"; current source has 168 passing backend tests (including controller/service/route suites) and 32 passing mobile tests.

---

## 7. Feature Implementation and MVP Readiness

### End-to-end journeys

| Journey | Implemented | Connected end-to-end | Tested | Concerns | MVP-ready |
| --- | --- | --- | --- | --- | --- |
| Register + login + maintain session | Yes (backend + mobile) | Yes | Unit (validation/middleware); no integration | Enumeration via register 409 / login 403 | Partial |
| Email verification | Backend only | No mobile screen | No | Resend enumeration persists; tokens issued pre-verification | No |
| Password reset (forgot/verify/change) | Backend only | No mobile screens | No | Reset code not consumed; no rate limit | No |
| Logout | Yes | Yes | Unit + integration + route | — | Yes |
| Token refresh | Yes | Yes (interceptor) | Unit + integration | — | Yes |
| Record transaction (QuickAdd) | Yes | Yes (dashboard) | Unit (validation) | Create response omits amount/date; no idempotency | Partial |
| View transaction list | No (empty screen) | No | — | — | No |
| Manage categories | Backend only | No mobile UI | Unit (validation) | System categories not editable (intended) | Partial |
| Create/view budgets | Backend only | No mobile UI | Unit (spending) | Server-local timezone for period boundaries | Partial |
| Edit profile | Backend only | No mobile UI | — | #26 open; username/email duplication handling untested | Partial |
| Different languages/currencies | Partial | Partial | Mobile detect/format tests | Dashboard mixes currencies in recent list | Partial |
| Network/API failure recovery | Partial | Partial | Mobile error-normalization tests | Empty screens lack error states | Partial |

### Readiness conclusion

The backend is substantially ready for a Phase 1 MVP; the mobile client is **not**. The gap is concentrated in empty screens rather than missing backend capability. A screen existing as a file (e.g., `transactions.tsx`) is not a working feature; only Dashboard, QuickAdd, login, register, and the connection checker are functional end-to-end today.

---

## 8. Backend Architecture Findings

### Strengths (verified)

- Clean `route → Joi → controller → service → Prisma` separation; controllers do not import Prisma directly; `catchAsync` and centralized error handling are used consistently.
- All resource routes are authenticated; single-record reads and mutations are owner-scoped (`findFirst` + `updateMany`/`deleteMany` with `{id, userId}`) and return 404 on mismatch.
- Response projections use allowlists (`USER_PUBLIC_SELECT`, `USER_OWNER_SELECT`, `USER_PROFILE_SELECT`) so no password hash leaks through auth/profile/transaction endpoints.
- Refresh-token rotation is atomic (`prisma.$transaction`) with reuse detection and family revocation.
- OpenAPI 3.1 contract is validated (`redocly` passes) and a route-coverage test enforces exact parity between implemented routes and documented operations.

### Findings

| Severity | Finding | Evidence |
| --- | --- | --- |
| Medium | Transaction create response omits `amount` and `transactionDate` (documented projection gap) | `src/backend/src/services/transaction.service.js:18-31` |
| Medium | Dashboard `recentTransactions` is not filtered by the dashboard currency, so totals and the recent list can disagree across currencies | `src/backend/src/services/profile.service.js:86-101` |
| Medium | Financial periods are computed with server-local time, not the user's timezone | `budget.service.js:37-55`, `profile.service.js:46`, `user.controller.js:45-46` |
| Low | `getUser`/`getSafeUser` split is duplicated across `auth.service.js` and `profile.service.js`; `sanitizeUser` is dead code returning null | `auth.service.js:53-71` |
| Low | Error handler logs the full stack on every error and has an unused `let error = {...appError}` | `error.middleware.js:67-75` |
| Low | Console transport condition is always true, so console logging is enabled even in production | `logger.config.js:67` |

No unnecessary framework/layer was introduced; complexity is proportional. No DB transaction is used for create-transaction-with-category resolution, but the two-step read-then-create is acceptable at current scale.

---

## 9. Mobile Architecture Findings

### Strengths (verified)

- TypeScript strict mode; typed contexts (`AuthContext`, `ThemeContext`, `LocaleContext`); `@/*` path alias.
- Pure API URL resolution (`config.resolver.ts`) is unit-tested; explicit-URL validation requires HTTPS for non-dev builds and requires the `/api/v1` prefix.
- Single-flight 401 refresh prevents overlapping refresh calls; tokens in `expo-secure-store`.
- Error normalization (`errors.ts`) gives screens stable categories without leaking server details; dashboard deliberately avoids echoing auth headers.
- Currency/language detection and money parsing are unit-tested and locale-aware.

### Findings

| Severity | Finding | Evidence |
| --- | --- | --- |
| Critical | Transactions, budgets, and profile tab screens are empty files | `src/mobile/app/(tabs)/transactions.tsx`, `budgets.tsx`, `profile.tsx` |
| High | Forgot-password, reset-password, and verify-email screens are empty; these flows are unreachable in the app | `src/mobile/app/(auth)/forgot-password.tsx`, `reset-password.tsx`, `verify-email.tsx` |
| Medium | No form/loading/error/empty state implementation for the missing screens | same files |
| Medium | Dashboard fetch swallows errors silently (empty catch), so a failed fetch shows stale/empty data without a retry message | `src/mobile/app/(tabs)/index.tsx:31-41` |
| Low | `AuthContext` declares a `User` interface that omits `theme`/`timezone`, and login/register navigate before applying any profile normalization | `AuthContext.tsx:7-15,72-92` |

The current structure **can** absorb the missing screens without rework: navigation groups, contexts, primitives, and the API client are all in place. The blocker is simply that the screens have not been written.

---

## 10. Database and Financial Integrity Findings

### Verified

- `Transaction.amount` and `Budget.amount` are `Decimal @db.Decimal(19,4)`; both gained a nullable `currency` column in migration `20261023000000_decimal_and_currency`.
- `Transaction.categoryId` references `Category` (`ON DELETE RESTRICT`); historical rows are backfilled only when exactly one system/user category matches the old name; ambiguous rows stay `NULL`.
- Budget deletion is soft (`isActive=false`); category deletion is blocked while in use; system categories are seeded with stable ids.
- Money is parsed and summed with Prisma `Decimal` (`money.js`), not binary floating point.
- Budget spending aggregates `EXPENSE` transactions by `categoryId` **and** `currency`, avoiding cross-currency sums.

### Findings

| Severity | Finding | Evidence |
| --- | --- | --- |
| Medium | Period boundaries use server-local date math rather than the user's `timezone` preference, which can mis-bucket transactions around month/week boundaries | `budget.service.js:37-55`; `user.controller.js:45-46` |
| Medium | Historical rows with `NULL` `currency` or `NULL` `categoryId` contribute zero to budget spending until reconciled; no tooling surfaces these rows | `budget.service.js:61-76`; migration comment |
| Medium | No idempotency mechanism or duplicate detection exists for transaction creation, which the Phase 1 roadmap lists as a technical prerequisite | `transaction.controller.js:68-108` |
| Low | `NUMERIC(19,4)` fixes precision at four decimal places; JPY and other zero-decimal currencies are not specially treated, and conversion (if added) has no rate/timestamp model yet | schema + `product-requirements.md` |
| Low | `SubscriptionType` enum (`FREE/PREMIUM/PRO/ENTERPRISE`) is unused and contradicts the Free/Plus/Pro + Family strategy | `user.prisma`; `subscription-strategy.md` |

No evidence was found of floating-point arithmetic in the current money paths. The financial risks are now mostly **period/timezone correctness and idempotency**, not representation.

---

## 11. Authentication and Security Findings

### Fixed since the prior audit (verified)

- Password hashes no longer leak from auth/profile/transaction responses (allowlist projections).
- `getTransactionById` is owner-scoped (IDOR fixed).
- Refresh tokens are SHA-256 hashed at rest, rotated atomically, with reuse detection and family revocation.
- Forgot-password returns a generic response; reset code generation is unbiased (`crypto.randomInt`) and no longer `console.log`ged.
- Category/budget single-record routes (`GET /budgets/:id`, `GET /categories/:id`, `PUT /categories/:id`) are implemented and owner-scoped.
- Logger startup blocker is resolved (API can boot).

### Remaining findings (severity, evidence)

| Severity | Finding | Evidence |
| --- | --- | --- |
| High | Login enumeration: unknown email → 401, wrong password → 403, deactivated → 403 | `auth.controller.js:168-185` |
| High | No account lockout and no per-endpoint rate limiting; only a global 100 req/15 min/IP limiter exists; `trust proxy` not set | `app.js:47-53`; `auth.service.js:259-278` |
| High | Password-reset code is not consumed on use, so it remains replayable until expiry | `auth.service.js:474-488`, `510-536` |
| High | Change-password-with-current-password is missing; password history is recorded but reuse is not enforced | `auth.routes.js`; `auth.service.js:510-536` |
| Medium | JWT is verified without a pinned algorithm and without `iss`/`aud`/`jti`; no token versioning | `auth.middleware.js:31`; `helpers.js:20-25` |
| Medium | CORS defaults to `origin: '*'` with `credentials: true` (browsers reject this; production needs an explicit allow-list) | `app.js:35`; `env.config.js:35` |
| Medium | No persistent `AuditEvent` store; only `LoginAttempt` rows are written | `audit.actions.js`; `user.prisma` |
| Medium | Production SMTP config is incomplete: `email.config.js` reads `Config.smtpHost/Port/User/Pass`, none of which exist in `env.config.js` | `email.config.js:34-43`; `env.config.js:57-58` |
| Low | Registration still issues tokens before email verification (mitigated: inactive users cannot refresh or authenticate) | `auth.controller.js:47-50`; `auth.service.js:204-207` |
| Low | `resendVerification` distinguishes unknown (404) from already-verified (400) accounts | `auth.controller.js:125-133` |

**Remediation direction:** uniform 401 for all login failures with generic messages; per-endpoint rate limits and incremental lockout on `LoginAttempt`; consume reset tokens transactionally; implement current-password change with history reuse check and revoke-all; pin `HS256` and add `iss`/`aud`/token version; explicit CORS allow-list + `trust proxy` + HSTS; introduce a minimal `AuditEvent` model.

No exploitation, penetration testing, or external-system actions were performed.

---

## 12. Infrastructure and DevOps Findings

| Severity | Finding | Evidence |
| --- | --- | --- |
| High | No CI/CD workflows exist (`.github/` holds issue templates only); no automated test, lint, type-check, or coverage gate runs on PRs | `find .github -type f`; `gh pr list` shows merges with no checks |
| High | No application Dockerfile or compose file; Docker is used only for local PostgreSQL | no `Dockerfile*`/`compose*` files; `build/scripts/database/postgres.sh` |
| Medium | No deployment target, secret management story, backup automation, or observability/error reporting is defined | README "no backup automation is configured yet" |
| Medium | No coverage enforcement in practice: `jest.config.js` declares an 80% threshold, but `npm test` exits 0 at 26.97% statements | `jest.config.js` coverageThreshold; observed test run |
| Low | Several stories (#31 Kubernetes, #35 Terraform/Ansible, #36 Redis, #37 Celery, #38 caching, #32 Sentry) are premature for the current stage | Epic #29 children |

**Recommended now (essential before further feature scale):** GitHub Actions CI running `task check` (backend tests + prisma validate + docs validate/test + mobile lint/tests/typecheck) and optionally the DB-gated integration suite. **Defer:** Kubernetes, Terraform/Ansible, Redis, Celery, Sentry until Phase 1/2 deployment needs justify them. This matches the audit instruction not to recommend premature infrastructure.

---

## 13. Testing and Quality Findings

### Executed checks and results

| Command | Outcome |
| --- | --- |
| `cd src/backend && npm test` | 22 suites passed, 3 integration suites skipped; 168 passed / 16 skipped. Exit 0. |
| `cd src/mobile && npm test` | 32 tests passed across 7 suites (api errors, single-flight, localization detect/format). |
| `cd src/mobile && npm run test:typecheck` | Clean. |
| `cd src/backend && npm run docs:validate` | OpenAPI valid. |
| `cd src/backend && npx prisma validate` | Schema valid. |
| `python3 scripts/github_tickets.py validate --manifest ...` | Auth 28 tickets OK; AFI 5 tickets OK. |

### Coverage observation

`npm test` reports **26.97% statements / 10.89% branches / 16.97% functions / 68.8% lines**. The configured 80% threshold did not fail the run, so the documented gate is **not actually enforced**.

### Gaps

- No integration tests for register, login, password reset, or ownership denial against a real DB (only refresh/logout are covered).
- No mobile component/screen tests (current mobile tests cover pure modules only).
- No end-to-end test across mobile and backend.
- Empty screens have zero coverage by definition.

### Important untested journeys

- Cross-user denial for transactions, budgets, and categories at the API layer.
- Registration → verification → login → reset lifecycle.
- Budget period-boundary correctness across timezones and month/year/week boundaries.
- Duplicate/idempotent transaction submission.

---

## 14. Technical Debt and Architectural Risks

1. **Stale documentation that misleads planning** (`current-feature-inventory.md`, `testing-strategy.md`, portions of `coding-standards.md`) is the highest-risk debt because it would generate incorrect tickets.
2. **Duplicate user-projection helpers** (`auth.service.js` vs `profile.service.js`) and dead code (`sanitizeUser`, `refreshRecord`/`_meta`) add drift.
3. **Single global rate limiter + no lockout** is a latent abuse vector for auth endpoints.
4. **Server-local timezone** for financial periods will produce subtle, user-visible miscalculations.
5. **Unused enums/models** (`SubscriptionType`, `Notification`) signal speculative schema that should be reconciled or removed.
6. **No CI** means regressions (e.g., the previous logger startup blocker) can only be caught locally.

---

## 15. Roadmap and GitHub Tracking Gaps

1. **No GitHub Epic/Story/Task for Phase 1 MVP mobile screens** (transactions, budgets, profile), search/filter, or CSV export — the highest-priority product work is untracked.
2. **Epic #29 scope drift:** stories #31-#38 were created ahead of need and now dominate the epic while the actual Phase 0 work (#89) was appended later.
3. **Epic #46 closure debt:** stories #54 (infra docs) and #55 (deployment/security docs) have no tasks and no content, yet their subjects are the most needed docs.
4. **Epic #64 is REOPENED with all children closed** — the epic's remaining intent is undefined.
5. **Closed-ticket docs drift:** several documentation files describe pre-#89 state as current.
6. **Missing prerequisites for tracked work:** #28 (deletion) needs the `DECISION-DELETION-POLICY` approval; #18/#19 need the provider-neutral identity model (#79) first.
7. **No issue for:** idempotent transaction create, CSV export, dashboard mixed-currency reconciliation, CI/CD workflow (though #30 covers CI at story level), or the timezone/period-boundary fix.

Do not create duplicate tickets: extend existing #15/#20/#21/#24/#25/#27/#75/#76/#77 for the security work, and create only the genuinely missing Phase 1 feature story.

---

## 16. Prioritized Development Opportunities

Scoring model (1-5, 5 = best): **Impact** (user/product value), **Risk** (security/correctness exposure), **MVP** (relevance to the documented MVP), **Dependency** (unblocks other work), **Effort** (inverse — 5 = low effort), **Confidence** (strength of evidence). Weighted score = `Impact×2 + Risk×2 + MVP×2 + Dependency + Effort + Confidence` (max 40).

| # | Opportunity | Class | Impact | Risk | MVP | Dep | Effort | Conf | Score |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Finish Epic #7 MVP security hardening (enumeration, lockout/rate limits, reset-token consumption, change-password, JWT pinning, CORS) | Security/correctness | 5 | 5 | 5 | 4 | 3 | 5 | 37 |
| 2 | Implement mobile transactions/budgets/profile screens + search/filter (Phase 1 core) | Feature | 5 | 2 | 5 | 4 | 2 | 5 | 33 |
| 3 | Authentication + ownership integration test suite; enforce coverage/CI gate | Testing | 4 | 4 | 4 | 4 | 3 | 5 | 32 |
| 4 | CI/CD workflows + application Dockerfiles (#30, #3/#4/#43) | Infrastructure | 3 | 3 | 3 | 5 | 4 | 5 | 29 |
| 5 | Account deletion + export with approved retention policy (#28) | Feature/compliance | 4 | 4 | 3 | 2 | 2 | 4 | 28 |

Lower-effort items do not automatically rank higher; the scoring emphasizes risk and MVP relevance. Candidate 1 is the highest-value, highest-risk, fully-tracked, and lowest-dependency investment.

---

## 17. Top Five Recommended Next Tasks

### Rank 1 — Complete Epic #7 MVP security and account-management hardening

- **Existing issues:** #15, #20, #21, #24, #25, #27, #75, #76, #77.
- **Class:** security/correctness.
- **Status:** partially implemented; critical defects fixed, hardening remains.
- **Problem:** login enumeration (401 vs 403), no lockout/per-endpoint rate limits, replayable reset code, missing change-password endpoint, unpinned JWT, wildcard CORS, no audit store.
- **Why now:** a personal-finance product must not ship with enumeration, brute-forceable recovery, or replayable reset codes; this is the roadmap Phase 0 gate.
- **Dependencies:** none external; `#28` retention policy not required for this slice.
- **Effort:** Medium.
- **Risks:** migration for token-hashing transition is already done; lockout thresholds need product input (see §20).
- **Outcome:** Epic #7 MVP acceptance criteria met and covered by tests.

### Rank 2 — Implement mobile Phase 1 screens (transactions, budgets, profile) and search/filter

- **Existing issues:** none (a new Story/Epic is genuinely required under the ticket workflow).
- **Class:** feature.
- **Status:** backend ready; three tab screens and three auth screens empty.
- **Problem:** users cannot list transactions, manage budgets, edit profile, or complete reset/verification flows in the app.
- **Why now:** Phase 1 is the documented next milestone and the backend is ready.
- **Dependencies:** Rank 1 (or proceed in parallel once login/reset behavior is stable).
- **Effort:** Large.
- **Risks:** UX for filters/empty states; timezone/currency display correctness.
- **Outcome:** end-to-end manual tracking/budgeting on mobile.

### Rank 3 — Authentication and ownership integration tests + enforce coverage gate

- **Existing issues:** #76; supports Rank 1.
- **Class:** testing.
- **Status:** refresh/logout integration only.
- **Problem:** the highest-risk flows (registration, login, reset, cross-user denial, budget aggregation) have no DB-backed tests, and the 80% coverage gate is not enforced.
- **Dependencies:** Rank 1 behavior finalized.
- **Effort:** Medium.
- **Risks:** integration harness requires a disposable local Postgres (already scaffolded).
- **Outcome:** CI-enforceable regression safety for financial/security paths.

### Rank 4 — CI/CD workflows and application Dockerfiles

- **Existing issues:** #30; #3/#4/#43.
- **Class:** infrastructure.
- **Status:** no CI, no app images.
- **Problem:** no automated quality gate; no deployable artifact.
- **Dependencies:** Rank 3 for the CI matrix.
- **Effort:** Small-Medium.
- **Risks:** secrets for CI; keep to GitHub Actions + Task rather than adding infra.
- **Outcome:** every PR runs `task check`; backend is containerizable.

### Rank 5 — Account deletion and data export under an approved retention policy

- **Existing issues:** #28 (gated); export untracked.
- **Class:** feature/compliance.
- **Status:** not implemented; gated on `DECISION-DELETION-POLICY`.
- **Problem:** GDPR/trust requirements make export + deletion foundational, never premium-gated.
- **Dependencies:** product + legal approval of retention/anonymization values.
- **Effort:** Medium-Large.
- **Risks:** retention policy unresolved.
- **Outcome:** self-service export and compliant deletion.

---

## 18. Primary Recommendation — What We Should Build Next

**Complete the remaining Epic #7 MVP acceptance criteria: eliminate login enumeration, add per-endpoint rate limiting and account lockout, consume password-reset tokens, implement change-password-with-current-password with history checks and session revocation, pin the JWT algorithm, fix CORS/`trust proxy`, and add the missing authentication integration tests.**

### Why this is the best next investment

1. It is the explicit Phase 0 gate in `docs/product/product-roadmap.md` — "make what exists correct, safe, and testable **before** adding features."
2. It closes the only remaining **security** defects in a product that handles financial data: account enumeration, brute-forceable recovery, replayable reset codes, and absent lockout.
3. It is **already fully tracked** by existing issues (#15, #20, #21, #24, #25, #27, #75, #76, #77), so no new tickets are needed.
4. It is a low-dependency, medium-effort slice that unblocks the mobile MVP (Rank 2) and CI (Rank 4).

### Why over the other candidates

The mobile screens (Rank 2) are higher product visibility but lower security exposure, and they inherit any auth/UX contract from this work. Infrastructure (Rank 4) automates a suite that is not yet complete. Export/deletion (Rank 5) is blocked on an unapproved policy. The security work is the only candidate that is both critical and immediately unblocked.

### What to implement first

1. Uniform `401` login responses (unknown email, wrong password, deactivated) with a single generic message; keep failure attempts in `LoginAttempt`.
2. Per-endpoint rate limiters and incremental lockout for `register`, `login`, `forgot-password`, `verify-otp`, `refresh-token`, `resend-verification`.
3. Consume the `PasswordResetToken` transactionally on successful reset and add `usedAt`/single-use semantics.
4. Add `POST /auth/change-password` (current-password variant) with history reuse check and revoke-all sessions.
5. Pin `HS256` and add `iss`/`aud`; configure explicit CORS allow-list and `trust proxy`.
6. Backfill integration tests (#76) for each changed flow.

### Definition of done

- No login/register/resend response distinguishes account existence or verification state.
- Failed-login throttling and per-endpoint limits are enforced and tested.
- Reset codes are single-use; reset and password change revoke all refresh tokens.
- Change-password-with-current-password exists and rejects history reuse.
- JWT algorithm is pinned; CORS has an explicit allow-list; `trust proxy` is configured.
- Integration tests cover registration, login, refresh rotation/reuse, logout, reset, ownership denial, and password change, and CI runs them (where DB is available).
- OpenAPI and the route-coverage test reflect any route changes.

### Existing issue to use

Work through Epic #7, primarily **#15 (login), #20/#21 (reset), #24 (API security/rate limiting), #27 (change password), #75 (verification hardening), #76 (integration tests), and #77 (JWT validation).**

### Refinement needed

- **#22** should be restructured from "RBAC middleware" to a minimal `authorize` seam per the accepted ADR; the permission matrix is deferred.
- **#24** should be split or clarified into the concrete items above (rate limiting/lockout vs CORS/`trust proxy`/HSTS).
- **#27** should state the current-password semantics and history check explicitly.

### New ticket required?

No new ticket is required for this security work — all of it maps to existing issues. A **new Story (and parent Epic) is genuinely required for the Phase 1 mobile screens**, but only when that work is scheduled (Cycle 2).

### What follows immediately

The Phase 1 mobile screens (Rank 2), then CI/CD (Rank 4) once the integration tests exist.

---

## 19. Proposed Three-Cycle Development Plan

> No sprint duration is documented; cycles are logical stages, not commitments.

### Cycle 1 — Immediate priority: Epic #7 MVP security completion

- **Objective:** close all remaining Epic #7 MVP acceptance criteria.
- **Existing issues:** #15, #20, #21, #24, #27, #75, #76, #77 (and #22 restructure).
- **Scope:** uniform login errors + lockout/rate limits; single-use reset tokens; change-password endpoint; JWT pinning + CORS/`trust proxy`; integration tests.
- **Prerequisites:** none external; lockout thresholds decided (§20).
- **Acceptance criteria:** as in §18 Definition of done.
- **Testing:** unit + supertest integration (gated DB) for each flow; coverage reflected in OpenAPI/route-coverage.

### Cycle 2 — Next logical stage: Phase 1 mobile MVP

- **Objective:** end-to-end manual tracking, budgeting, and profile management.
- **Existing issues:** new Phase 1 Story under a new epic (to be created via the ticket workflow); backend prerequisites already merged.
- **Scope:** transactions list + search/filter, budgets, categories, profile screens; forgot/reset/verify-email screens; dashboard mixed-currency reconciliation; loading/error/empty states.
- **Dependencies:** Cycle 1 (login/reset contract); no new backend schema expected.
- **Outcome:** a usable mobile MVP aligned with Phase 1.

### Cycle 3 — Subsequent stage: CI/CD and quality gate

- **Objective:** automated, repeatable quality and a containerizable backend.
- **Existing issues:** #30; #3/#4/#43.
- **Scope:** GitHub Actions running `task check` (+ DB-gated integration tests); backend Dockerfile/multi-stage build; enforce coverage threshold.
- **Dependencies:** Cycle 2 test suite; secret management decision.
- **Outcome:** PRs are automatically verified; backend is deployable.

Avoid overplanning Phases 3-6 until their prerequisites (entitlements, household model, AISP compliance) are approved.

---

## 20. Open Questions and Decisions Requiring Approval

1. **`DECISION-DELETION-POLICY`** — retention/anonymization, soft vs hard delete, backup retention, audit retention, UK GDPR posture. Gates #28.
2. **Lockout/throttle thresholds** — failure counts and windows for login, register, forgot-password, verify-otp, refresh (ADR 0001 leaves these open).
3. **Password strength policy** — whether to add complexity rules or a breach-list check.
4. **bcrypt (cost 12) vs Argon2id** — not required for MVP, but should be decided before scaling.
5. **Google/Apple verification path** — server-side authorization-code exchange (recommended) vs mobile-only ID-token verification (#18/#19/#79).
6. **`SubscriptionType` enum** — reconcile with Free/Plus/Pro + Family or remove.
7. **Phase 1 tracking** — approve creation of a Phase 1 feature epic/story for the mobile screens, search/filter, and CSV export (currently untracked).
8. **Time zone semantics** — confirm UTC storage with user-timezone period derivation, and whether to fix server-local month math now or with Phase 1.
9. **Epic #64 reopened state** — define remaining intent or close.
10. **Epic #29 stories #31-#38** — explicitly defer (recommended) or close to reflect the actual stage.

---

## 21. Appendix — Evidence, Commands, and References

### Commands executed (read-only)

```text
git status --short
git branch --show-current
git log -5 --oneline
git branch -a
git log --oneline develop..HEAD
git log --oneline origin/develop..HEAD
gh repo view --json nameWithOwner,defaultBranchRef,description,visibility,pushedAt   # required escalation (network)
gh issue list --repo edwardpeter547/expensetracker --state all --limit 1000 --json number,title,state,stateReason,parent,subIssues,labels   # required escalation
gh pr list --repo edwardpeter547/expensetracker --state all --limit 500 --json number,title,state,baseRefName,headRefName,url,createdAt,updatedAt,mergedAt,isDraft   # required escalation
cd src/backend && npm test
cd src/backend && npm run docs:validate
cd src/backend && npx prisma validate
cd src/mobile && npm test
cd src/mobile && npm run test:typecheck
python3 scripts/github_tickets.py validate --manifest tickets/packages/expense-tracker-auth/manifest.json
python3 scripts/github_tickets.py validate --manifest tickets/packages/application-foundation-improvements/manifest.json
```

### Full issue inventory (number | state | parent | children | title)

```text
1    CLOSED  -        Add GitHub Issue Templates
3    OPEN    29       4,5,6,43   [STORY] Dockerize Backend Application
4    OPEN    3        Setup Development Dockerfiles
5    OPEN    3        Setup Docker-compose to run services
6    CLOSED  3        Setup DockerHub Repository for images
7    OPEN    -        8,9,10,11,12,13   [FEATURE] Authentication and Authorization
8    OPEN    7        14,15,16,17,75,76,77,78   [STORY] Core Authentication Infrastructure
9    OPEN    7        18,19,79   [STORY] Social Authentication (Google & Apple)
10   OPEN    7        20,21      [STORY] Password Management
11   OPEN    7        22,23      [STORY] Authorization & Role Management
12   OPEN    7        24,25,80   [STORY] Security & Compliance
13   OPEN    7        26,27,28   [STORY] User Account Management
14   OPEN    8        [TASK] Implement User Registration Endpoint
15   OPEN    8        [TASK] Implement User Login Endpoint
16   CLOSED  8        [TASK] Implement Token Refresh Endpoint
17   CLOSED  8        [TASK] Implement User Logout Endpoint
18   OPEN    9        [TASK] Implement Google OAuth Integration
19   OPEN    9        [TASK] Implement Apple Sign-In Integration
20   OPEN    10       [TASK] Implement Forgot Password Endpoint
21   OPEN    10       [TASK] Implement Reset Password Endpoint
22   OPEN    11       [TASK] Implement Role-Based Authorization Middleware
23   CLOSED  11       [TASK] Implement Resource Ownership Enforcement
24   OPEN    12       [TASK] Implement API Security Configuration
25   OPEN    12       [TASK] Implement Authentication Event Logging
26   OPEN    13       [TASK] Implement User Profile Update Endpoint
27   OPEN    13       [TASK] Implement Change Password Endpoint
28   OPEN    13       [TASK] Implement Account Deletion Endpoint
29   OPEN    -        3,30,31,32,33,34,35,36,37,38,89   [FEATURE] Project Infrastructure Development
30   OPEN    29       [STORY] GitHub Actions CI/CD Workflows
31   OPEN    29       [STORY] Implement Kubernetes Orchestration
32   OPEN    29       [STORY] Sentry for Monitoring & Logging
33   OPEN    29       [STORY] Dockerize PostgreSQL Database
34   OPEN    29       [STORY] PostgreSQL Setup & Implementation
35   OPEN    29       [STORY] Infrastructure as Code with Terraform & Ansible
36   OPEN    29       [STORY] Setup Redis for Caching & Session Management
37   OPEN    29       [STORY] Celery for Background Task Processing
38   OPEN    29       [STORY] Implement Caching Strategy
39   CLOSED  -        Create additional issue templates for task and story
40   CLOSED  -        Refactor and optimise monorepo configuration
43   OPEN    3        [TASK] Create Dockerfile with Multi-Stage Build
44   CLOSED  -        [TASK] Upgrade Expo SDK from 55 to 57
46   OPEN    -        47,48,49,50,51,52,53,54,55   [FEATURE] Establish Comprehensive ExpenseTracker Project Documentation
47   OPEN    46       56   [STORY] DOC-01 Establish Repository Foundation and Contributor Guidance
48   OPEN    46       57,87   [STORY] DOC-02 Establish Engineering Standards and Testing Strategy
49   OPEN    46       58   [STORY] DOC-03 Document System Architecture and Product Domain Design
50   OPEN    46       59   [STORY] DOC-04 Establish Architecture Decision Records and Decision Governance
51   OPEN    46       60   [STORY] DOC-05 Establish Product Discovery and Market Research Documentation
52   OPEN    46       61   [STORY] DOC-06 Define SaaS Product Strategy, Requirements, and Success Metrics
53   OPEN    46       62   [STORY] DOC-07 Establish the Phased ExpenseTracker Product Development Roadmap
54   OPEN    46       [STORY] DOC-08 Establish Infrastructure and DevOps Architecture Documentation
55   OPEN    46       [STORY] DOC-09 Establish Deployment, Operations, Reliability, and Security Documentation
56   CLOSED  47       [TASK] Integrate Repository Foundation and Contributor Documentation
57   CLOSED  48       [TASK] Integrate Engineering Standards and Testing Documentation
58   CLOSED  49       [TASK] Integrate System Architecture and Product Domain Documentation
59   CLOSED  50       [TASK] Implement ADR Conventions and Initial Decision Backlog
60   CLOSED  51       [TASK] Implement Product Discovery and Market Research Documentation
61   CLOSED  52       [TASK] Implement SaaS Strategy, Requirements, and Success Metrics Documentation
62   CLOSED  53       [TASK] Implement Phased Product Development Roadmap Documentation
64   OPEN    -        65,73   [FEATURE] GitHub Issue Management Automation
65   CLOSED  64       66,67,68,69,70,71   [STORY] Implement Automated GitHub Ticket Management
66   CLOSED  65       [TASK] Implement Ticket Manifest Schema and Local Validation
67   CLOSED  65       [TASK] Implement GitHub REST Client and Existing-Issue Discovery
68   CLOSED  65       [TASK] Implement Read-Only Planning and Plan-Bound Approval
69   CLOSED  65       [TASK] Implement Safe Issue Creation and Native Sub-Issue Linking
70   CLOSED  65       [TASK] Implement Execution Reporting and Automated Test Coverage
71   CLOSED  65       [TASK] Document and Integrate GitHub Ticket Automation Workflow
73   CLOSED  64       [TASK] Enable Manual GitHub Issue Creation via CLI
75   OPEN    8        [TASK] Harden Email Verification and Resend Lifecycle
76   OPEN    8        [TASK] Add Authentication Integration Tests
77   OPEN    8        [TASK] Harden JWT Validation and Token Versioning
78   OPEN    8        [TASK] Add Device and Session Management
79   OPEN    9        [TASK] Implement Provider-Neutral Identity and Account-Linking Foundation
80   CLOSED  12       [TASK] Eliminate Sensitive-Data Exposure from API Responses
81   CLOSED  -        [TASK] Authentication Architecture Decisions and Clean Up Ticket Review Artifacts
87   CLOSED  48       [TASK] Audit and Document Backend APIs, JSDoc, and OO Design Standards
89   CLOSED  29       90,91,92   [STORY] Application Foundation Improvement
90   CLOSED  89       [TASK] Migrate Developer Workflows from Makefile to Go Task
91   CLOSED  89       [TASK] Improve Expo Mobile-to-Backend Connectivity and Session Handling
92   CLOSED  89       [TASK] Implement Multilingual and Multi-Currency Financial Foundations
```

### Merged pull requests relevant to this audit

#93 (foundation/connectivity/multi-currency), #88 (docs), #86 (logout), #85 (refresh security), #84 (ownership), #83 (sensitive-data), #82 (auth epic review), #74/#72 (ticket automation), #63 (initial docs), #45 (Expo SDK 57), #41/#42/#2 (templates/monorepo).

### Key source references

- Owner-scoped transactions: `src/backend/src/services/transaction.service.js`
- Budget aggregation: `src/backend/src/services/budget.service.js`
- Money utilities: `src/backend/src/utils/money.js`
- Auth service: `src/backend/src/services/auth.service.js`
- Auth controller: `src/backend/src/controllers/auth.controller.js`
- App middleware/CORS/rate limit: `src/backend/src/app.js`
- Environment defaults: `src/backend/src/configurations/env.config.js`
- Prisma models: `src/backend/src/prisma/models/*.prisma`
- Migrations: `src/backend/src/prisma/migrations/`
- Mobile API client: `src/mobile/src/api/client.ts`
- Mobile config resolution: `src/mobile/src/api/config.resolver.ts`
- Mobile screens: `src/mobile/app/(tabs)/*.tsx`, `src/mobile/app/(auth)/*.tsx`
- Test config: `src/backend/jest.config.js`

---

## Report integrity

No application source code, GitHub issues, pull requests, branches, or database records were modified. The only write performed was the creation of this report under `docs/audits/`.
