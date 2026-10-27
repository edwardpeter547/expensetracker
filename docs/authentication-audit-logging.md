# Authentication Audit Logging

This document describes the persistent, structured, secret-safe authentication
audit trail implemented for the backend. It complements the conceptual audit
requirements in `docs/architecture/product-domain-design.md` and the account
deletion policy in `docs/decisions/DECISION-DELETION-POLICY.md`.

## Scope

The audit trail covers authentication and account-security events. Financial,
subscription, household, and data-export auditing are separate concerns and are
not implemented here.

## Storage

Events are persisted in PostgreSQL through the `AuthAuditEvent` Prisma model
(table `auth_audit_event`) defined in
`src/backend/src/prisma/models/auth-audit.prisma`. The service boundary is
`src/backend/src/services/auth-audit.service.js`.

| Column | Type | Purpose |
| --- | --- | --- |
| `id` | text (cuid) | Primary key. |
| `eventType` | text | One of the supported event types below. |
| `outcome` | text | One of the supported outcomes below. |
| `userId` | integer, nullable | The resolved user id; null for unknown accounts. |
| `ipAddress` | text, nullable | Client IP address. |
| `correlationId` | text, nullable | Request correlation id. |
| `metadata` | jsonb, nullable | Strictly allowlisted metadata. |
| `createdAt` | timestamp | Event time. |

Indexes exist on `(userId, createdAt)`, `(eventType, createdAt)`, and
`(createdAt)` for operational investigation.

The `userId` foreign key uses `ON DELETE SET NULL`, so account deletion never
cascades into or is blocked by the audit store. Audit rows survive user deletion
with a nulled `userId`.

## Event types and outcomes

| Event type | Outcomes |
| --- | --- |
| `REGISTRATION` | `SUCCESS`, `FAILURE` |
| `LOGIN` | `SUCCESS`, `FAILURE` |
| `LOGOUT` | `SUCCESS` |
| `PASSWORD_RESET_REQUEST` | `REQUESTED` |
| `PASSWORD_RESET_COMPLETE` | `SUCCESS`, `FAILURE` |
| `PASSWORD_CHANGE` | `SUCCESS`, `FAILURE` |
| `TOKEN_REFRESH` | `SUCCESS`, `FAILURE` |
| `AUTHORIZATION_DENIED` | `DENIED` |
| `REPEATED_AUTH_FAILURES` | `SUSPICIOUS_ACTIVITY` |

Logout has no separate failure event: a rejected logout is represented by the
`AUTHORIZATION_DENIED` event produced at the authentication boundary, avoiding
double-counting. The `authorize(...roles)` middleware records its own
`AUTHORIZATION_DENIED` only when it is the layer that rejects the request (an
unauthenticated call used without `authenticate`, or an authenticated caller
whose established roles do not satisfy the guard); when `authenticate` has
already denied the request, `authorize` is never reached, so exactly one event
is recorded per denied request. Similarly, ordinary login failures,
unknown-account logins, and password-reset request/verify steps that return
generic responses do not get one event per middleware layer.

## Metadata

Metadata is limited to an explicit allowlist:

- `reason` — one of the fixed reason values in
  `src/backend/src/constants/auth-audit.constants.js` (for example
  `INVALID_CREDENTIALS`, `ACCOUNT_LOCKED`, `PASSWORD_REUSE`,
  `INVALID_RESET_CODE`, `TOKEN_EXPIRED`, `INSUFFICIENT_PERMISSION`,
  `REPEATED_FAILURES`).
- `attemptCount` — a non-negative integer used by suspicious-activity events.

The audit service discards any other key or value before persistence. It never
accepts raw request bodies or error objects, and never stores passwords,
JWTs, refresh tokens, OTPs, reset codes, cookies, authorization headers, or
financial payloads. Unknown-account login attempts are recorded with a null
`userId` and no email address, so the submitted identifier is not persisted.

## Correlation ids

Every request receives a correlation id from
`src/backend/src/middleware/request-id.middleware.js` using Node's
`crypto.randomUUID()`. A client-supplied `X-Request-Id` is preserved only when
it matches a strict pattern and the deployment has explicitly enabled
`TRUST_PROXY`; otherwise a fresh id is generated. The id is returned in the
`X-Request-Id` response header, included in structured application logs, and
stored on every audit event.

## IP address handling

Audit events record `request.ip`, which already honors Express's configured
`trust proxy` setting (`TRUST_PROXY`). The default is to trust no proxy hops, so
`X-Forwarded-For` headers from arbitrary clients cannot spoof the recorded IP.
No other client-controlled headers are logged.

## Suspicious repeated-failure detection

Repeated login failures reuse the existing lockout configuration rather than
introducing a second counter. When a known account crosses
`AUTH_LOCKOUT_FAILURE_LIMIT` failures within `AUTH_LOCKOUT_BASE_WINDOW_MS`, one
`REPEATED_AUTH_FAILURES` / `SUSPICIOUS_ACTIVITY` event is recorded with the
observed `attemptCount`. A durable deduplication query (not unbounded in-memory
state) prevents one event per request during a brute-force burst. Unknown
accounts are not eligible because recording their identifier would violate the
no-email rule above.

## Persistence failure behavior

The audit write is independent of ordinary application logging. For ordinary
events the service catches persistence errors, logs them at `error` level with
the correlation id, and continues, so a degraded audit store never changes an
authentication response or leaks account existence through timing.

Security-critical operations fail closed: `PASSWORD_CHANGE` and
`PASSWORD_RESET_COMPLETE` success events are written inside the same database
transaction as the credential mutation. If that write fails, the whole
transaction rolls back and the request returns a 500, so required audit evidence
cannot be silently lost.

## Privacy and retention

Audit records contain only pseudonymous user ids, IP addresses, correlation
ids, and allowlisted metadata. They are not exposed through any public API
endpoint. Automatic retention purging is intentionally not implemented in this
ticket; retention policy remains a separate privacy/legal production
release-readiness gate (see `docs/decisions/DECISION-DELETION-POLICY.md`, which
notes a provisional 12-month audit retention target that still requires legal
review). Any future purge must operate on `createdAt` with a configurable window
and must not invent a legally mandated period in code.

## Operational querying and monitoring

Investigation examples (run against the `auth_audit_event` table):

```sql
-- All events for one user, newest first
SELECT * FROM auth_audit_event
WHERE "userId" = $1
ORDER BY "createdAt" DESC;

-- Failed logins for a user within a window
SELECT * FROM auth_audit_event
WHERE "eventType" = 'LOGIN' AND outcome = 'FAILURE' AND "userId" = $1
  AND "createdAt" >= now() - interval '1 hour';

-- Reconstruct one request via its correlation id
SELECT * FROM auth_audit_event WHERE "correlationId" = $1;
```

Operationally, alert on the `Authentication audit persistence failed` error log
entries (they include the correlation id and event type) and monitor the rate
of `REPEATED_AUTH_FAILURES` events as a brute-force signal.
