# Account Deletion and Data Erasure — Technical Design

**Status:** Implementation note. The authoritative behavioral specification is
`docs/decisions/DECISION-DELETION-POLICY.md`; this document describes the data
inventory, lifecycle, and operations.

## 1. Architecture

Components live under `src/backend/src/account-deletion`:

- `erasure/handler.js` — abstract handler contract.
- `erasure/handlers.js` — all concrete handlers.
- `erasure/registry.js` — duplicate/missing/cycle validation and a
  deterministic topological execution plan.
- `policies/policy.js` — decision layer (erase / retain / review).
- `deletion/coordinator.js` — orchestrates handlers via the registry.
- `deletion/service.js` — business lifecycle, progress repository, and export.
- `deletion/worker.js` — PostgreSQL-backed durable worker with leases and
  bounded retries.

The worker's polling interval is only a trigger; job state, leases, retry
counts, and progress live in the `account_deletion_request` and
`deletion_step` tables, so a process crash resumes safely.

## 2. Data inventory

| Category | Prisma model / table | Handler | External storage | Dependencies | Notes |
| --- | --- | --- | --- | --- | --- |
| Transactions | `transaction` | `transactions` | — | — | deleted before categories (RESTRICT FK) |
| Budgets | `budget` | `budgets` | — | — | deleted before categories (RESTRICT FK) |
| User categories | `categories` (userId) | `categories` | — | transactions, budgets | system categories are untouched |
| Notifications | `notification` | `notifications` | — | — | |
| Login attempts | `login_attempt` | `login-attempts` | — | — | user-linked rows only |
| Authentication artifacts | `refresh_token`, `VerificationToken`, `PasswordResetToken`, `PasswordHistory` | `authentication` | — | — | |
| Avatar | `user.avatar` key | `avatar` | `StorageAdapter` | — | provider migration limitation below |
| Profile | `user` | `profile` | — | all of the above | deleted last |

Erasure is explicit rather than cascade-driven; the known Prisma cascades and
the `SET NULL` on `categories.userId` are understood but the handlers delete
each category directly for predictable, reviewable progress.

## 3. Voluntary lifecycle

1. `POST /api/v1/user/deletion-request` reauthenticates (current password +
   `DELETE` confirmation), disables the account, revokes refresh sessions, and
   increments `tokenVersion`.
2. A `PENDING_DELETION` request is created with `scheduledFor` =
   `recoveryDeadline` = acceptance + 14 calendar days.
3. `DELETE /api/v1/user/deletion-request` (email + password) cancels while the
   request is still `PENDING_DELETION`; the update is atomic with the worker's
   claim, so a started deletion cannot be cancelled.
4. At the deadline the worker claims the request, runs each handler in plan
   order, records per-step progress, and finalizes as `COMPLETED` (or
   `REVIEW_REQUIRED` when a category needs human review).

## 4. Statutory lifecycle

A statutory request (`createStatutoryErasureRequest`) is scheduled immediately
with no recovery window. Scope `ALL` proceeds through the worker; scope
`PARTIAL` is set `REVIEW_REQUIRED` because scope assessment is a legal
decision. Statutory intake is a documented privacy-channel workflow, not a
public endpoint, to avoid account enumeration and an unmonitored inbox.

## 5. Retention schedule

- Default: erase every user-owned category.
- Per-category retention: only with an authorized decision recording reason,
  reviewer, decision/review dates, access restrictions, and policy version.
- Backup retention: provisional 90-day operational target for review.
- Audit evidence: minimal, purpose-limited; provisional 12-month target for
  review.

None of these values are claimed to be legally required or currently
implemented as automated lifecycle jobs; see the policy's approval status.

## 6. Operational runbook

- **Voluntary support:** a user who cannot cancel via email + password contacts
  support; an operator may run `recordRetentionDecision` or inspect the request
  state, but never reactivates an account without reauthentication.
- **Statutory intake:** requests arrive through the privacy channel, are
  identity/scope assessed by a human, then recorded via
  `createStatutoryErasureRequest`. Ambiguous scope is `REVIEW_REQUIRED`.
- **Retention review:** `recordRetentionDecision(requestId, category,
  action='RETAIN'|'REVIEW', reason, reviewer, reviewDue)`.
- **Retry/reconciliation:** `FAILED` requests are retried by re-enabling or
  re-queueing; orphaned storage objects (avatar) are reconciled by a periodic
  sweep comparing stored keys against live references.
- **Backup restore:** before restored data is exposed, reapply outstanding
  deletion records; a restored user with a `COMPLETED` deletion must be
  re-erased, never reactivated.

## 7. Storage provider migration

The active `StorageAdapter` deletes objects it can locate. Avatar keys are
provider-independent, but provider identity is not recorded per object, so a
provider change can orphan objects stored by the previous provider. Documented
corrective options: a one-off migration that copies/removes legacy objects, or
a reconciliation record of historical provider + key pairs. This limitation is
tracked rather than silently ignored.
