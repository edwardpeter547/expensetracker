# Account Management — Backend Gap Assessment and Implementation Note

**Status:** Implementation note (source-backed, 2026-10-25).
**Scope:** Backend only, aligned with Story #13 and subtasks #26, #27, #28.

## 1. Source-of-truth alignment

The product roadmap (`docs/product/product-roadmap.md`) is still a proposal; no
phase is Approved. Phase 0 calls for "complete profile update"; Phase 1 adds
"profile editing and account settings", "CSV export and account deletion".
ADR 0001 (`docs/decisions/0001-authentication-and-authorization-architecture.md`)
is Accepted and explicitly gates account deletion on the
`DECISION-DELETION-POLICY`, which has not been approved.

This work therefore:

- Hardens the existing profile read/update contract.
- Adds authenticated password change (subtask #27).
- Ships the storage-independent avatar contract and a deterministic default
  avatar, but does not implement upload persistence.
- Does **not** implement account deletion (subtask #28 remains blocked).

## 2. Initial gap assessment

| Capability | Assessment |
| --- | --- |
| Profile read (`GET /api/v1/user/profile`) | Existed but exposed `tokenVersion`, `dateOfBirth`, `mobileNumber`, and `isPhoneVerified`. Hardened into a safe DTO. |
| Profile update (`PUT /api/v1/user/profile`) | Existed but accepted arbitrary currency/timezone strings and did not normalize usernames. Hardened. |
| Authenticated password change | Missing. Implemented as `POST /api/v1/user/change-password`. |
| Avatar | No upload/removal existed. Added the default-avatar contract and storage-independent endpoints; upload persistence is blocked on object storage and image-processing dependencies. |
| Account deletion | Blocked by the unapproved `DECISION-DELETION-POLICY`. No functional endpoint added. |
| Email change with reverification | Not implemented; deferred (P1). |
| MFA/passkeys | Deferred by ADR 0001 (planned for later). |
| Notification/preference infrastructure | Model and constants only; empty route. Deferred. |
| CSV export | Deferred to Phase 1; not implemented here. |

## 3. Profile DTO

The public profile DTO is produced by `toProfileDto` in
`src/backend/src/services/profile.service.js` and is shared by the read and
update endpoints:

- `id`, `email` (read-only), `username` (normalized lowercase), `firstname`,
  `lastname`, and a derived `displayName`.
- `avatar` — a stable object `{ url, initials, isDefault }`.
- `language`, `currency`, `timezone`, `theme`.
- Read-only security metadata: `isEmailVerified`, `lastLoginAt`, `createdAt`,
  `updatedAt`.

The DTO never includes `tokenVersion`, `lastPasswordReset`, the password hash,
`dateOfBirth`, or `mobileNumber`. The authentication context
(`src/backend/src/middleware/auth.middleware.js`) uses a separate, minimal
projection that still carries `isActive` and `tokenVersion` for enforcement;
those fields are not serialized to clients.

## 4. Avatar and pluggable file storage

Every user receives an effective avatar: the bundled neutral asset at
`/static/images/default-avatar.svg` when no custom image exists, plus
`avatar.initials` (derived from the safe display name) for client-side
rendering. Custom avatars are stored through a provider-independent storage
abstraction (`src/backend/src/storage`) with two adapters:

- `local` — Node filesystem storage for development, testing, and single-
  instance self-hosted deployments. Keys are validated against a strict
  allowlist and resolved under the configured root; writes use exclusive
  create flags and reads never follow symlinks.
- `s3` — Amazon S3 and S3-compatible object storage via `@aws-sdk/client-s3`.
  Objects are private by default; no public-read ACL is applied. Credentials
  come from the AWS SDK's standard provider chain.

The active provider is selected by `STORAGE_DRIVER` and is opt-in: when unset
or `disabled`, upload/removal return 503 and the default avatar still works.
Selecting `s3` without a bucket and region fails startup.

Upload lifecycle: `POST /api/v1/user/avatar` accepts one multipart `avatar`
field (JPEG, PNG, WebP), validates decoded content with `sharp`, re-encodes to
a 512px WebP (stripping metadata), stores the new object, then atomically swaps
the database reference under a user-row lock. The previous object is deleted
only after the reference changes; a database failure cleans up the new object
best-effort. `DELETE /api/v1/user/avatar` clears the reference before deleting
the object. `GET /api/v1/user/avatar` returns the caller's effective image
owner-scoped, with a private cache policy and a key-derived ETag.

Object keys are opaque and server-generated (`avatars/<userId>/<uuid>.webp`);
uploaded filenames are never used. The existing `User.avatar` column stores the
key, so no migration is required.

**Remaining dependency:** production S3 requires the operator to provide bucket,
region, and AWS credentials through the normal SDK chain. Switching providers
does not migrate existing objects automatically; orphaned objects from a failed
cleanup are reconciled by a documented sweep (see the storage documentation in
`docs/backend-documentation.md`).

## 5. Localization and financial preferences

- `language` is validated against `SUPPORTED_LANGUAGES` (`en`, `fr`).
- `currency` is validated against ISO 4217 via `Intl.supportedValuesOf`.
- `timezone` is validated against IANA identifiers via `Intl.supportedValuesOf`.
- `theme` accepts `system`, `light`, `dark`.

The existing `User.currency` remains the preferred currency. The profile
currency preference never converts, rewrites, or relabels historical
transaction values; cross-currency reporting and exchange rates stay in a later
roadmap phase. Default-currency-for-new-transactions, week-start, and
budget-cycle preferences are not yet required by the MVP and were not added.

## 6. Password change (subtask #27)

`POST /api/v1/user/change-password` verifies the current password with bcrypt,
rejects reuse of the current or any previous password (409), follows the
existing 8-100 character policy, records password history, increments
`User.tokenVersion`, and revokes all refresh-token sessions atomically under a
user-row-first `SELECT ... FOR UPDATE` lock. Incorrect current passwords return
401. No plaintext password is logged.

## 7. Account deletion (subtask #28)

Not implemented. ADR 0001 decision E and the remaining-decisions list gate Task
#28 on the `DECISION-DELETION-POLICY`. This note does not invent retention
periods or perform destructive deletion.

**Policy checklist for product/legal review:**

- Deletion eligibility, confirmation, and reauthentication requirements.
- Immediate access revocation mechanics.
- Soft-delete versus hard-delete and financial-record retention window.
- Anonymization/pseudonymization rules and backup retention.
- Audit-event retention and auditability without leaking sensitive data.
- Export/deletion request workflow and UK GDPR considerations.
- Handling of future shared (household) records.

## 8. Capability recommendations

**P0 — implemented now:** safe profile DTO; validated localization and
currency; username normalization and 409 conflicts; authenticated password
change with history and session revocation; default avatar contract.

**P1 — recommended next:** email change with reverification; session
visibility is already provided by `/api/v1/auth/sessions`; notification-
preference model.

**P2 — future roadmap:** multi-currency reporting and exchange rates; MFA and
passkeys; CSV export; household profile separation; subscription/billing
profile separation.

**Blocked:** account deletion (`DECISION-DELETION-POLICY`) and marketing
consent/notification delivery.

## 9. Proposed tickets (not created)

- Backend: `POST /api/v1/user/email-change` with reverification flow.
- Backend: notification preference model and delivery.
- Backend: account deletion once the deletion policy is approved.
- Frontend: profile editing screen, avatar upload UI, password-change UI, and
  account-settings screen (all out of scope for this story).
