# Decision: Account Deletion and Data Erasure Policy

**Status:** Product decisions confirmed by the project owner; **not** yet
approved by privacy/legal review.
**Applies to:** Story #13, Subtask #28 (Account Deletion).
**Related:** ADR 0001 (authentication and authorization architecture).

## 1. Scope and definitions

- **Account deletion / voluntary closure:** a signed-in user requests that
  their account and personal data be erased.
- **Statutory erasure:** a request made under a legal right such as UK/EU GDPR
  erasure, which may not require the whole account to be closed.
- **Personal data:** information that directly or indirectly identifies a
  natural person, including profile fields, financial records, device-session
  metadata, and login-attempt records linked to the account.

## 2. Voluntary closure

1. A signed-in user requests closure and reauthenticates with their current
   password plus the literal confirmation `DELETE`.
2. On acceptance the account is immediately disabled and all active sessions
   are revoked; previously issued access tokens are invalidated.
3. A 14-calendar-day recovery period begins at acceptance. During this window
   the user may cancel the closure by reauthenticating with email + password.
4. When the recovery deadline expires, a durable worker erases the account data.
5. Cancellation is atomic with the worker's claim; once erasure has started the
   closure cannot be cancelled.

## 3. Statutory erasure

1. Statutory requests are accepted through a documented privacy channel (see
   the operational runbook). They are never inferred from IP, currency,
   timezone, or language.
2. A statutory request is processed promptly and does **not** inherit the
   14-day recovery period.
3. Identity and scope are assessed by an authorized human. A request whose
   scope is not the whole account requires review before execution.
4. Response deadline tracking is an operational responsibility (one calendar
   month for UK/EU GDPR, with extensions justified explicitly). This is a
   compliance process, not a software guarantee.

## 4. Data categories and default treatment

Default treatment is erasure for every user-owned category: profile, financial
transactions, budgets, user categories, notifications, login attempts,
authentication artifacts (refresh, verification, reset tokens, password
history), and stored avatar objects.

Retention is only allowed for a specific category with a documented, authorized
human decision recording: category, purpose, legal justification, reviewer,
decision and review dates, access restrictions, and policy version. Indefinite
retention is never automatic. An unresolved exception routes that category to
human review and does not block erasure of other categories.

## 5. Architecture

- Erasure follows the pluggable storage pattern: an abstract
  `ErasureHandler` contract, concrete handlers in one module, a registry that
  derives a dependency-safe execution plan, a policy layer, a coordinator, and
  a PostgreSQL-backed durable worker.
- Object storage deletion reuses the existing `StorageAdapter` abstraction.
- Deletion request records survive deletion of the user row for auditability.

## 6. Backups

Operational backup retention is a provisional target of no more than 90 days
for review; it is not claimed to be a legal requirement and is not implemented
here. Restored data must reapply outstanding deletion records before it becomes
accessible. See the technical design document.

## 7. Audit evidence

Minimal, purpose-limited evidence is retained: request type, scope, timestamps,
status, per-category outcome, retention decisions, and reviewer identity. Full
financial profiles and complete identifiers are not retained as audit evidence.
A provisional 12-month audit retention target requires a documented legal
basis and review.

## 8. Security controls

- Voluntary closure requires reauthentication and deliberate confirmation.
- Cancellation requires email + password reauthentication (not a revoked token).
- Access is revoked immediately and pending-deletion accounts cannot use the
  API.
- Erasure is idempotent, owner-scoped, and durable against worker crashes.
- No passwords, tokens, or full financial payloads are logged.

## 9. Approval status

The product decisions above are confirmed for implementation. **Production
compliance additionally requires privacy/legal review** of retention values,
backup retention, the statutory intake channel, jurisdiction-specific rules,
and the audit-evidence retention basis. Software implementation alone does not
establish legal compliance.

## 10. Acceptance criteria

- Voluntary closure, recovery, and cancellation work end to end.
- Sessions are revoked immediately and pending accounts cannot access the API.
- Statutory requests are not delayed by the recovery window.
- The worker resumes and retries safely.
- Every implemented user-owned category is inventoried and handled.
- Legal retention exceptions require human review.
- OpenAPI reflects the endpoints; unit and integration tests pass.
