# Full-Stack Functional Gap Analysis and Contract Alignment Audit

**Repository:** `edwardpeter547/expensetracker`
**Baseline branch:** `develop` (HEAD `3d2d459`, 2026-11-12)
**Nature:** Read-only audit. Only this report was created. No application code, schema, migration, GitHub issue, branch, or commit was modified.

## A. Executive summary

The repository has three layers in very different states of completion:

1. **The backend is the most complete layer for the personal-finance MVP.** Authentication, email verification, password reset, session management, profile/avatar, account deletion/export, transactions, categories, and budgets are implemented, owner-scoped, validated, documented in OpenAPI, and covered by a substantial unit + integration suite. Several earlier defects (cross-user transaction access, compound-where mutations, budget category linkage, monetary precision) are already fixed on this branch.

2. **The mobile UI is a complete visual milestone (Epic #125), but a large part of it is demo-backed or frontend-only.** The single `DEMO_MODE = true` switch in `src/mobile/src/offline/dashboardDemo.ts` makes the app render in-memory demo data for dashboard, transactions, categories, budgets, membership, teams, recurring, and planning by default. The API-backed data-source adapters in `src/mobile/src/contracts/apiDataSources.ts` return empty data or throw "not available yet" for Teams, Recurring, non-budget Planning, Membership, and transaction edit/delete.

3. **Documentation is generally good but has stale spots.** `docs/product/current-feature-inventory.md` and `docs/audits/account-management-gap-assessment.md` describe pre-UI / pre-deletion states that no longer match the code. The two newer docs most relied on (`docs/architecture/system-overview.md`, `docs/engineering/teams-ui-integration.md`) are accurate.

### Most significant gaps

- **Password reset and email verification are UI-only on mobile even though the backend is complete.** The forgot-password, reset-code, reset-password, and verify-email screens never call the API, and the email-verification screen expects a six-digit code while the backend sends a 32-byte hex token in an emailed link. Registration issues access/refresh tokens to an inactive, unverified account and stores them, so the verification gate can be bypassed by the session created at registration.
- **Teams is the largest entirely-missing backend domain.** The mobile client has ~18 team screens and a rich demo store, but there are no team, membership, invitation, ledger, expense, chat, or activity models/routes.
- **Recurring transactions and notifications are empty backend routers.** The mobile recurring screens are demo-only; notification preferences are local UI state.
- **Receipt capture, merchant details, and purchased items are UI-only.** The transaction model stores only `receiptUrl` (a URL string), not a file, and has no merchant/item fields, yet the mobile type and edit payload expect them.
- **Membership/billing, premium entitlements, and AI chat are frontend-only.** The premium gate is a development mock; membership resolves to `null` in live mode; AI chat is local state.
- **Transaction edit/delete are wired in the backend but not in the mobile adapter.** `apiTransactionDataSource.update/remove` throw, so live-mode editing and deletion fail even though `PUT/DELETE /transactions/:id` exist.

### Key risk

The default runtime is demo data. Flipping `DEMO_MODE` to `false` does not make the product "live" end-to-end: it activates API mode, where authentication/profile/session/deletion and read-only transaction/category/budget flows work, but Teams, Recurring, non-budget Planning, Membership, transaction edit/delete, receipts, premium entitlements, and AI remain unavailable. End-to-end integration therefore cannot be verified in the current default configuration and must be treated as **source-inferred, not runtime-verified**.

---

## B. Frontend feature inventory

Legend:

- **UI Status:** Implemented / Implemented (partial) / Placeholder.
- **Backend Support:** Full / Partial / None / Backend-only.
- **Integration Status:** End-to-end / Partial / UI-only (demo) / Backend-only / Not integrated / Defective.
- **Documentation Status:** Documented / Stale / Not documented.

| Feature / Screen | UI Status | Backend Support | Integration Status | Documentation Status | Evidence |
|---|---|---|---|---|---|
| Welcome / unauthenticated entry | Implemented | n/a | End-to-end | Documented | `src/mobile/app/welcome.tsx` |
| Login (email/password) | Implemented | Full | End-to-end | Documented | `src/mobile/app/(auth)/login.tsx`, `POST /auth/login` |
| Register | Implemented | Full | Partial (hides username; issues tokens to inactive account) | Documented | `src/mobile/app/(auth)/register.tsx`, `POST /auth/register` |
| Email verification | Implemented | Full | Defective (UI-only, 6-digit vs hex-link contract) | Stale | `src/mobile/app/(auth)/verify-email.tsx`, `GET /auth/verify-email` |
| Forgot password | Implemented | Full (email only) | UI-only (no API call; mobile/WhatsApp channels unsupported) | Documented | `src/mobile/app/(auth)/forgot-password.tsx`, `POST /auth/forgot-password` |
| Reset code entry | Implemented | Full | UI-only (no `/auth/verify-otp` call) | Documented | `src/mobile/app/(auth)/reset-code.tsx` |
| Set new password | Implemented | Full | UI-only (no `/auth/reset-password` call) | Documented | `src/mobile/app/(auth)/reset-password.tsx` |
| Social sign-in (Google/Apple) | Implemented | None | UI-only ("isn't available yet") | Documented | `src/mobile/app/(auth)/login.tsx`; open #9/#18/#19/#79 |
| Biometric login / app lock | Implemented | n/a (device + refresh-token flow) | End-to-end (login via refresh) | Documented | `src/mobile/src/security/*`, `AuthContext` |
| Connection checker | Implemented | Full | End-to-end | Not documented (diagnostic route) | `src/mobile/app/connection.tsx`, `GET /health` |
| Dashboard (Home tab) | Implemented | Partial (`/user/dashboard` exists but unused) | Partial (uses `/transactions` + `/user/profile`; demo by default) | Documented | `src/mobile/app/(tabs)/index.tsx`, `src/mobile/src/api/dashboard.ts` |
| Transactions list + client-side filters | Implemented | Full (list only; no server filter/pagination) | Partial (fetch-all then filter; demo by default) | Documented | `src/mobile/app/(tabs)/transactions.tsx`, `GET /transactions` |
| Add transaction | Implemented | Full (create) | End-to-end for core fields; receipt/merchant/items not persisted | Documented | `src/mobile/app/add-transaction.tsx`, `POST /transactions` |
| Edit transaction | Implemented | Full (update) | Not integrated (mobile adapter throws) | Stale | `apiTransactionDataSource.update` throws; `PUT /transactions/:id` exists |
| Transaction detail | Implemented | Full (get) | Partial (mobile reads full list instead of `GET /:id`) | Documented | `src/mobile/app/transaction/[id].tsx` |
| Delete transaction | Implemented | Full (delete) | Not integrated (mobile adapter throws) | Stale | `apiTransactionDataSource.remove` throws; `DELETE /transactions/:id` exists |
| Receipt scan / upload / review | Implemented | None | UI-only (fixture/preview; not persisted) | Documented | `src/mobile/app/receipt-preview.tsx`, `add-transaction.tsx` |
| Merchant details / purchased items | Implemented | None (no schema fields) | UI-only | Partially documented (types exist; no backend) | `src/mobile/src/types/transaction.ts` |
| Recurring transactions list | Implemented | None (empty router) | UI-only (demo) | Documented | `src/mobile/app/recurring-transactions.tsx`, empty `recurring.routes.js` |
| Add / edit recurring | Implemented | None | UI-only ("preview only") | Documented | `src/mobile/app/add-recurring-transaction.tsx` |
| Recurring detail actions (pause/resume/cancel) | Implemented | None | UI-only (local state) | Documented | `src/mobile/app/recurring-transaction/[id].tsx` |
| Planning dashboard | Implemented | Partial (tools catalog demo) | UI-only for non-budget tools | Documented | `src/mobile/app/(tabs)/budgets.tsx` |
| Budgets list / detail | Implemented | Full (read + mapped) | End-to-end read in API mode; demo by default | Documented | `src/mobile/app/planning/budgets.tsx`, `GET /budgets` |
| Budget create | Implemented | Full (create) | Not integrated (mobile adapter throws) | Stale | `apiPlanningBudgetDataSource.create` throws; `POST /budgets` exists |
| Savings goals | Implemented | None | UI-only (demo) | Documented | `src/mobile/app/planning/goals.tsx` |
| Insights | Implemented | None | UI-only (demo) | Documented | `src/mobile/app/planning/insights.tsx` |
| Monthly plan | Implemented | None | UI-only (demo) | Documented | `src/mobile/app/planning/monthly-plan.tsx` |
| Cash flow | Implemented | None | UI-only (demo) | Documented | `src/mobile/app/planning/cash-flow.tsx` |
| Planned expenses | Implemented | None | UI-only (demo) | Documented | `src/mobile/app/planning/planned-expenses.tsx` |
| Teams list | Implemented | None | UI-only (demo) | Documented | `src/mobile/app/(tabs)/goals.tsx` |
| Create team | Implemented | None | UI-only (demo; premium gate mock) | Documented | `src/mobile/app/teams/create.tsx` |
| Team workspace / finance tools | Implemented | None | UI-only (demo) | Documented | `src/mobile/app/teams/[teamId]/index.tsx` |
| Members / invite / invitation accept | Implemented | None | UI-only (demo; invitation hardcoded) | Documented | `src/mobile/app/teams/[teamId]/invite.tsx`, `invitations/[token].tsx` |
| Team chat / activity / contributions / member spending | Implemented | None | UI-only (demo) | Documented | `src/mobile/app/teams/[teamId]/*` |
| Team expenses / planned-expense lifecycle | Implemented | None | UI-only (demo) | Documented | `src/mobile/app/teams/[teamId]/expenses/*`, `planned-expenses/*` |
| Team settings / archive / restore | Implemented | None | UI-only (demo) | Documented | `src/mobile/app/teams/[teamId]/settings.tsx` |
| Profile home | Implemented | Full | End-to-end (demo identity fallback) | Documented | `src/mobile/app/(tabs)/profile.tsx` |
| Personal info edit | Implemented | Full | End-to-end in live mode; demo-gated preview | Documented | `ProfileSettings.tsx`, `PUT /user/profile` |
| Change password | Implemented | Full | End-to-end in live mode; demo-gated preview | Documented | `POST /user/change-password` |
| Device sessions | Implemented | Full | End-to-end in live mode | Documented | `GET/DELETE /auth/sessions` |
| Notification preferences | Implemented | None (empty router; model unused) | UI-only (local toggles) | Documented | `ProfileSettings.tsx`, empty `notification.routes.js` |
| Appearance / currency / language | Implemented | Partial (profile has fields) | Partial (language syncs; theme/currency local-only) | Documented | `ProfileSettings.tsx`, `AuthContext.syncLanguageToProfile` |
| Manage categories | Implemented | Full | End-to-end in live mode | Documented | `ManageCategories.tsx`, `CRUD /categories` |
| Data export | Implemented | Full (JSON endpoint) | Not integrated (UI CSV/PDF preview; backend returns JSON) | Stale | `ProfileSettings.tsx`, `POST /user/data-export` |
| Account deletion | Implemented | Full | End-to-end in live mode | Documented (decision policy still unapproved) | `POST /user/deletion-request` |
| Membership & billing | Implemented | None | UI-only (demo gold tier / null in live) | Documented | `src/mobile/app/membership.tsx`, `useMembership` |
| Premium feature gate | Implemented | None | UI-only (development mock) | Documented | `FeatureAccessContext.tsx`, `featureCatalog.ts` |
| AI chat | Implemented | None | UI-only (local conversation) | Documented | `src/mobile/app/ai-chat.tsx`, `AiChatScreen.tsx` |

---

## C. API contract mismatch matrix

| ID | Feature | Frontend Expectation | Current Backend Contract | Gap | Recommended Change | Severity |
|---|---|---|---|---|---|---|
| CM-01 | Registration | No username collected | `register` requires alphanumeric username (3-30) | UI derives a username from email to satisfy the API | Add a username step or make it server-derived/optional | Medium |
| CM-02 | Email verification | 6-digit numeric code entered in-app | `GET /auth/verify-email?token=<32-byte hex>` from an emailed link | Verification never reaches the API; unverified session persists | Wire deep-link verification, or change backend to a numeric code consumed via POST | High |
| CM-03 | Password reset | Email + 6-digit code + new password, with mobile/WhatsApp channels | Email-only 6-digit OTP via `forgot-password` → `verify-otp` → `reset-password` | All three mobile screens are UI-only; channels exceed backend capability | Wire the three endpoints; drop or defer unsupported channels | High |
| CM-04 | Create transaction | Expects full created record | `createTransactionRecord` projection omits `amount` and `transactionDate` | Mobile refetches list to display created values | Add `amount` + `transactionDate` to the create projection | Medium |
| CM-05 | Edit / delete transaction | `PUT` / `DELETE /transactions/:id` | Endpoints exist and are owner-scoped | `apiTransactionDataSource.update/remove` throw "not available yet" | Wire the mobile adapter to the existing endpoints | High |
| CM-06 | Dashboard | Period-flexible summary computed client-side | `/user/dashboard` returns current-month summary only | Mobile ignores `/user/dashboard`; it fetches all transactions + profile | Either adopt the endpoint (add period params) or document it as legacy | Medium |
| CM-07 | Planning budget create | `{ name, limit }` (category name + amount) | `createBudget` requires `categoryId`, `amount`, optional period/currency | Contract mismatch blocks live budget creation | Resolve category from name in UI, or add a category-id selector | High |
| CM-08 | Merchant / items on transaction | `TransactionRecord.merchant` and `.items` expected | No such fields in schema or Joi schema | Edit payload sends fields the backend will reject/ignore | Add `merchant`/`items` JSON fields, or remove from mobile type | High |
| CM-09 | Receipts | Scan/upload returns a stored file | `Transaction.receiptUrl` is a URL string; no upload endpoint | Receipt flow is local-only and never persisted | Add receipt storage endpoint and file reference on transaction | High |
| CM-10 | Recurring transactions | CRUD list/detail | `recurring.routes.js` is empty; no model | Entire domain absent | Implement recurring model + CRUD + scheduler | High |
| CM-11 | Notifications | Preference toggles + alerts | `notification.routes.js` empty; `Notification` model unused | Preferences are local-only | Implement preference + list endpoints and delivery | Medium |
| CM-12 | Data export | CSV/PDF file | `POST /user/data-export` returns versioned JSON attachment | UI preview never calls the endpoint | Wire JSON export or add CSV format server-side | Medium |
| CM-13 | Category direction | System categories map to income/expense; custom are direction-agnostic | Category has no `type` field | Documented workaround; custom categories offered for both directions | Optional: add `type` to Category | Low |
| CM-14 | Social sign-in | Google/Apple buttons | No social routes | Buttons show "isn't available yet" | Implement via #18/#19/#79 or hide buttons | Medium (tracked) |
| CM-15 | Membership / premium entitlements | Tier, benefits, billing, gate decisions | No subscription/entitlement API | API adapter returns null; gate is a mock | Implement subscription + entitlement model and server enforcement | High |
| CM-16 | AI chat | Assistant replies | No AI endpoint | Local conversation only | Define AI boundary; implement endpoint (#208 is translation-only) | Medium |
| CM-17 | Teams | Full collaborative finance domain | No teams routes/models | API adapter returns empty / throws | Implement Teams Epic (data model first) | High |
| CM-18 | Transaction/budget/category list | Search, filter, pagination, sort | List endpoints accept no query parameters | UI filters a full client-side fetch; unbounded data | Add pagination/filter/sort contract | Medium |

---

## D. Database / model gap matrix

Priority: **Required** = needed for existing UI; **Optional** = improvement; **Out of scope** = new product feature.

| ID | Model / Entity | Required Functionality | Current Schema | Proposed Change | Migration Impact | Priority |
|---|---|---|---|---|---|---|
| DM-01 | `RecurringTransaction` | Recurring list/detail/create with schedule, status, confirmation | Missing | New model: amount, type, categoryId, frequency, repeat rule, start/end conditions, recording preference, status | Additive table + enum(s) | Required |
| DM-02 | `Team`, `TeamMembership`, `TeamInvitation` | Team CRUD, roles, invites, membership | Missing | New models + role/status/mode enums + ownership constraints | Additive tables | Required |
| DM-03 | `TeamLedger` / contribution / `TeamExpense` / `TeamChatMessage` / `TeamActivity` | Pooled ledger, shared expenses, chat, activity | Missing | New models with double-entry invariants and payer attribution | Additive tables | Required |
| DM-04 | `Receipt` + `Transaction` receipt fields | Stored scan/upload + line-item metadata | `Transaction.receiptUrl` only | Add `receiptId`/receipt table or JSON `receipt`, plus `merchant` and `items` JSON columns | Additive table/columns | Required |
| DM-05 | `Subscription` / `Entitlement` / membership | Tier, benefits, renewal, gate decisions | `SubscriptionType` enum unused; no table | Add subscription/entitlement models; reconcile enum with strategy | Additive tables | Required |
| DM-06 | `Notification` preferences + delivery | Toggle prefs and read/list alerts | `Notification` model exists; no route or user-pref fields | Add user notification-preferences and list/read endpoints | Additive columns/tables | Medium |
| DM-07 | `SavingsGoal`, `PlannedExpense`, `Allocation` | Goals, planned expenses, monthly allocations | Missing | New models | Additive tables | Required for Planning UI |
| DM-08 | `Category.type` | Income/expense direction for custom categories | Missing (`isSystem` only) | Optional nullable `type` | Additive column + backfill | Optional |
| DM-09 | `Category` uniqueness | Case-insensitive `(userId, name)` uniqueness | Enforced only in application code | Add unique index (or normalize) to prevent races | Index migration | Optional |
| DM-10 | `Budget.name`/`description` | Display name beyond category | Budget has no name; UI labels by category | Optional name/description | Additive columns | Optional |
| DM-11 | `Transaction.category` vs `categoryId` | Single source of truth | Denormalized string + optional FK; delete check counts by name | Keep `categoryId` authoritative; migrate name-based checks to id | Data cleanup migration | Optional |
| DM-12 | `AiChatConversation` / messages | Persisted AI chat | Missing | New model | Additive table | Out of scope (defer with #208) |

No destructive or precision-degrading change is proposed. Existing `Decimal(19,4)` money columns, owner-scoped FK relationships, and token/audit models are preserved.

---

## E. Missing functionality inventory

Classification: Fully implemented / Partially implemented / UI-only or mock / Backend-only / Documented only / Missing.

| ID | Feature | Existing Implementation | Missing Functionality | Backend / Frontend / Both | Priority |
|---|---|---|---|---|---|
| MF-01 | Email verification | Backend token flow + mobile UI-only screen | Mobile deep-link verification and correct code/link contract | Both | High |
| MF-02 | Password reset | Backend OTP flow + mobile UI-only screens | Mobile API wiring for forgot/verify/reset | Frontend | High |
| MF-03 | Transaction edit/delete | Backend CRUD + mobile UI | Mobile adapter wiring to `PUT/DELETE` | Frontend | High |
| MF-04 | Receipt capture | UI components + fixtures | Upload/OCR backend + persisted receipt reference | Both | High |
| MF-05 | Merchant / purchased items | UI editor + type fields | Schema fields and persistence | Both | High |
| MF-06 | Recurring transactions | UI + demo store | Backend model, routes, scheduler | Backend | High |
| MF-07 | Teams (all screens) | UI + demo store | Full backend domain + authorization | Backend | High |
| MF-08 | Budget create | Backend + UI form | Planning create adapter wiring | Frontend | High |
| MF-09 | Savings goals / planned expenses / allocations | UI + demo store | Backend models/routes | Backend | High |
| MF-10 | Membership & billing | UI + demo tier | Subscription/billing backend + entitlements | Backend | High |
| MF-11 | Premium feature gate | Mock entitlement map | Server-side entitlements + enforcement | Backend | High |
| MF-12 | Notifications | Model + UI toggles | Routes, preferences, delivery | Backend | Medium |
| MF-13 | Data export | Backend JSON + UI preview | Wiring + format alignment | Both | Medium |
| MF-14 | Social sign-in | UI buttons | OAuth endpoints + identity linking | Backend | Medium (tracked #9) |
| MF-15 | AI chat | UI + local state | AI endpoint + response boundary | Backend | Medium |
| MF-16 | Transaction list search/filter/pagination | Client-side filter only | Server query contract | Backend | Medium |
| MF-17 | Theme/currency preference sync | Local context | Persist to profile like language | Frontend | Low |
| MF-18 | Category direction | System-category mapping | Optional custom-category direction | Both | Low |

---

## F. Documentation discrepancies

| ID | Document | Documented Behaviour | Actual Implementation | Required Correction |
|---|---|---|---|---|
| DC-01 | `docs/product/current-feature-inventory.md` | Mobile transactions/budgets/profile and reset/verify screens are "Placeholder / empty"; transaction read unscoped; update/delete use unsupported compound `where`; budget spending uses a nonexistent `categoryId` | Screens are implemented; transaction mutations are owner-scoped via `updateMany`/`deleteMany`; `Transaction.categoryId` exists and is used | Refresh snapshot or mark superseded |
| DC-02 | `docs/audits/account-management-gap-assessment.md` | Account deletion "not implemented"; avatar upload blocked on object storage | Deletion endpoints and durable erasure worker exist; avatar upload/remove implemented via storage adapters | Update the note or mark historical |
| DC-03 | `docs/audits/application-roadmap-and-architecture-audit.md` | Mobile screens empty; account deletion blocked; several Epic #7 items open | Screens implemented (UI milestone #125); deletion implemented (#28 closed); Epic #7 closed except social auth | Mark as a historical snapshot; do not treat as current planning input |
| DC-04 | `docs/architecture/system-overview.md` | "Dashboard, transactions, categories, budgets ... are wired to real backend endpoints" | True for reads/create; transaction edit/delete and budget create are **not** wired in the mobile adapter | Clarify edit/delete/create exceptions |
| DC-05 | `docs/decisions/DECISION-DELETION-POLICY.md` | Status "not yet approved by privacy/legal review" | Voluntary closure + statutory erasure are implemented and #28 is closed | Obtain privacy/legal sign-off or update status before production |
| DC-06 | `docs/product/subscription-strategy.md` | Tiers Free/Plus/Pro/Family | Unused `SubscriptionType` enum is FREE/PREMIUM/PRO/ENTERPRISE | Reconcile the enum with the strategy or remove the enum |
| DC-07 | `docs/product/product-roadmap.md` | Recurring, goals, collaboration, AI as later phases | Recurring/teams/goals/AI UI already shipped (demo-only) as Epic #125 | Keep, but note the UI now precedes backend phases |

Accurate and current: `docs/engineering/teams-ui-integration.md`, `docs/engineering/mobile-data-layer.md`, `docs/engineering/premium-feature-gate.md`, `docs/engineering/api-connectivity.md`, `docs/engineering/testing-strategy.md`, `docs/engineering/coding-standards.md`.

---

## G. Existing GitHub issue coverage

Mapping of the gaps above to the live issue graph (retrieved read-only 2026-11-12):

| Gap | Covered by | State | Notes |
|---|---|---|---|
| Social sign-in | Epic #7 → Story #9 → #18, #19, #79 | OPEN | Only remaining open Epic #7 branch |
| Translation release readiness | Epic #177 → Story #184 → #197, #198, #199 | OPEN | **Deferred per product instruction** |
| AI chat translation | Epic #177 → #208 | OPEN | **Deferred per product instruction** |
| Mobile UI milestone | Epic #125 → Stories #126-#132 | Closed (UI) | UI delivered; backend integration intentionally out of scope of those tasks |
| Recurring transactions backend | none | — | UI tracked under #128/#149 only |
| Teams backend domain | none | — | UI tracked under #130/#158-#166 only |
| Membership/billing backend | none | — | UI tracked under #131/#170 only |
| Premium entitlements backend | none | — | UI tracked under #131/#171 only |
| AI chat backend | none | — | UI tracked under #132/#173-#175; #208 is translation-only |
| Receipt/OCR backend | none | — | UI tracked under #128/#148 only |
| Transaction edit/delete wiring | none | — | Backend CRUD exists; mobile adapter throws |
| Budget create wiring | none | — | Backend `POST /budgets` exists; adapter throws |
| Password reset UI wiring | none | — | UI #135 closed; backend #20/#21 closed; no integration task |
| Email verification wiring / contract | none | — | Backend #75 closed; UI #134; no integration task |
| Create-transaction projection defect | none | — | Not tracked as a BUG |
| Data export CSV/JSON alignment | none | — | Backend #28 closed; UI preview not tracked |
| Notification preferences / delivery | none | — | Model exists; route empty |
| Deletion policy privacy/legal sign-off | #121 under Epic #120 | OPEN | Umbrella for legal review |

**Untracked gaps (require new tickets):** Teams backend, Recurring backend, membership/entitlements backend, receipt/OCR backend, AI backend, transaction edit/delete + budget-create wiring, password-reset/verification integration, create-transaction projection fix, notification delivery, and the database-model additions in section D.

---

## H. Recommended implementation roadmap

Ordered by dependency. The priority is **completing and correctly integrating functionality already represented in the product**, not adding new features.

### Phase 0 — Fix correctness and unblock the live path

1. Flip the demo/API wiring decision to production intent (`DEMO_MODE=false` plus a build-time exclusion path), or make demo mode explicit and testable rather than the default.
2. Wire mobile transaction `update`/`remove` to the existing owner-scoped endpoints.
3. Wire Planning budget `create` to `POST /budgets` (resolve category).
4. Fix the create-transaction projection gap (CM-04).
5. Wire password reset (`forgot-password` → `verify-otp` → `reset-password`) and reconcile email verification with the backend token/link flow (or change the backend to a numeric in-app code).
6. Wire data export to the existing JSON endpoint (or add CSV server-side).

### Phase 1 — Backend foundations for the demo-backed domains

1. Add the Prisma models from section D (recurring, teams, receipt/merchant/items, subscription/entitlements, savings goals/planned expenses).
2. Implement recurring CRUD + scheduler contract.
3. Implement the Teams domain (models → owner/member authorization → CRUD → invitations → ledger/expenses/chat/activity).
4. Implement notification preference/list endpoints.

### Phase 2 — Frontend/backend integration

1. Replace each demo-only API adapter with real calls: recurring, teams, planning (goals/insights/cash-flow/planned-expenses), membership/entitlements, receipts.
2. Replace the premium-gate mock with a server entitlement adapter.
3. Add server-side filter/search/pagination to list endpoints and adopt it in the mobile list screens.
4. Persist merchant/item data end-to-end.

### Phase 3 — Remaining business functionality and quality

1. Social sign-in (already tracked under #9).
2. AI chat backend behind the deferred translation task.
3. Theme/currency preference persistence parity.
4. Documentation corrections (section F).
5. End-to-end and contract tests for each integrated workflow; enforce the coverage gate.

### Phase 4 — Release-readiness gates (not immediate)

Privacy/legal sign-off on the deletion policy, then the deferred translation release-readiness Story #184. Do not resume #184 unless it is a prerequisite for unrelated work; it is not.

---

## I. Proposed GitHub ticket breakdown

Following the existing Epic → Story → Task hierarchy, without unnecessary fragmentation. None of these are created by this audit.

- **EPIC (new): "Teams collaborative finance backend"** — Story: data model + ownership; Story: team/member/invitation CRUD; Story: pooled ledger and shared expenses; Story: chat/activity/planned-expense lifecycle; Story: mobile API integration + removal of demo adapter.
- **EPIC (new): "Recurring transactions backend"** — Story: model + CRUD; Story: schedule engine/status transitions; Story: mobile integration.
- **EPIC (new): "Membership, subscriptions, and entitlements"** — Story: subscription/entitlement model; Story: billing integration points; Story: server-side enforcement; Story: replace frontend mock gate.
- **EPIC (new): "Receipts and transaction enrichment"** — Story: receipt storage; Story: merchant/item persistence; Story: OCR boundary (optional/exploratory); Story: mobile integration.
- **STORY (new): "Complete Phase 1 mobile integration gaps"** — Tasks: wire transaction edit/delete; wire budget create; wire password reset; wire email verification; align data export; fix create-transaction projection.
- **STORY (new): "Planning data persistence"** — Tasks: savings goals; planned expenses; monthly allocations/cash-flow mapping (could be folded into a wider planning backend Epic).
- **TASK (new): "Add server-side filtering/search/pagination to list endpoints."**
- **BUG (new): "Transaction create response omits amount and transactionDate."**
- **BUG (new): "Email verification screen is not wired and expects a six-digit code while the backend sends a hex link."**
- **TASK (new): "Refresh stale docs (current-feature-inventory, account-management gap assessment, deletion policy status, system-overview edit/delete wording)."**

Do not create tickets for: social auth (already #9/#18/#19/#79), translation release readiness (#184/#197-#199), or AI chat translation (#208), which are deferred.

---

## J. Open questions and architectural decisions

1. **Deletion policy approval** — The 14-day voluntary-closure window and hard-erasure behavior are implemented, but `DECISION-DELETION-POLICY.md` is still marked "not yet approved by privacy/legal review." Does the owner want to proceed with the implemented values or gate production on legal sign-off?
2. **Email verification UX/contract** — Keep the emailed deep-link hex token and wire `expo-linking`, or change the backend to a six-digit in-app code like password reset? This changes both the mobile screen and the backend response contract.
3. **Registration session semantics** — Should registration issue an access/refresh pair to an inactive, unverified account, or should it return only an unauthenticated "verify your email" state? The current behavior lets an unverified session persist via token refresh.
4. **Team ownership/ledger model** — Pooled double-entry, contributions, and historical retention need product decisions before schema work (the `teams-ui-integration.md` doc lists these as open backend requirements).
5. **Subscription tiers** — Reconcile `FREE/PREMIUM/PRO/ENTERPRISE` with the strategy's `Free/Plus/Pro/Family`; decide whether the unused enum is kept or removed.
6. **AI chat scope** — No backend contract exists. Confirm whether AI is a real next phase or stays a UI placeholder; if real, define the data boundary and language behavior with #208.
7. **Receipt storage provider** — Reuse the existing pluggable storage layer (`STORAGE_DRIVER=local|s3`) for receipts, or defer receipts entirely?
8. **Demo-mode default** — Confirm the intended shipping configuration. `DEMO_MODE=true` is the current default and contradicts "wired to real backend" claims until flipped.

No business requirements were invented to fill these gaps; they are left for product-owner approval.

---

## Evidence notes and confidence

- **Confirmed by source:** all file paths and symbols cited above were inspected directly on `develop`.
- **Inferred, not runtime-verified:** any end-to-end claim that requires a running Expo app, live PostgreSQL, email delivery, or biometric hardware. These are marked "Partial/End-to-end in live mode" on the strength of matching source contracts, not device execution.
- **Requires runtime validation:** token/refresh race behavior across real devices, deep-link handling for verification, notification delivery, scheduler execution, and the exact 404 semantics of owner-scoped mutations at the database level.
