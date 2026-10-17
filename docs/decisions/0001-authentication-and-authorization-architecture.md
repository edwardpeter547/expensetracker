# 0001. Authentication and Authorization Architecture (Epic #7)

**Status:** Accepted
**Date:** 2026-10-17

## Context

GitHub Epic #7 ("Authentication and Authorization") originally bundled
authentication, authorization, tenant membership, and subscription entitlements
into one undifferentiated scope, and it specified roles (`USER`, `ADMIN`,
`MEMBER`, `VIEWER`) without a tenant or household model to scope them to. An
independent architecture audit (`tickets/reviews/epic-7-auth-audit.md`) verified
the current implementation and found a working-but-uneven email/password
foundation alongside critical security defects: sensitive-data exposure,
a non-owner-scoped transaction read, non-atomic category mutations, plaintext
refresh tokens, weak password-reset handling, account enumeration, and missing
account-management endpoints.

The repository owner reviewed the audit and approved a set of six architectural
decisions that are authoritative for the Epic #7 refinement. They are recorded
together here because they were approved as one coherent direction for a single
epic; later granular decisions (for example, the specific account-deletion
retention periods) are expected to become their own ADRs.

## Decision

### A. Authorization and roles: individual ownership now, tenant roles later

Epic #7 implements and enforces ownership-based authorization for the existing
single-user system. Every financial resource is accessible only to its
authorized owner. The architecture keeps a clean authorization boundary that can
later support household membership and tenant-scoped roles without a rewrite,
but it does **not** introduce a comprehensive RBAC permission matrix or a
platform-administration system now. `MEMBER`/`VIEWER` intent moves to a future
household tenancy epic; `ADMIN` has no in-scope consumer today.

**Consequences**

- Existing Story #11 and Tasks #22–#23 are refined, not abandoned: Task #23
  (resource ownership enforcement) is expanded across transactions, budgets, and
  categories; Task #22 (role-based middleware) is reduced to a minimal role seam
  plus ownership checks, with the role matrix deferred.
- Ownership enforcement is independent of subscription status; security is never
  premium-gated.

### B. Refresh-token security is mandatory for the MVP

The MVP includes secure opaque refresh tokens generated with a
cryptographically secure random source, hashed at rest, atomically rotated, and
protected by reuse detection with token-family revocation. Logout and session
invalidation, revocation after password reset, and revocation after password
change are all required. Automated tests must cover rotation, concurrent
refresh requests, reuse/replay attempts, expiry, and revocation.

**Consequences**

- The design must handle concurrent refresh requests, replay attempts, database
  failures, and migration from the existing plaintext refresh-token records. It
  must not assume a single database transaction alone resolves every
  concurrency/replay problem; the chosen strategy and its trade-offs are
  documented in the epic and roadmap.
- Existing Task #16 is extended rather than duplicated by the new
  hash/rotate/reuse-detection work.

### C. Multi-factor authentication is planned for later

MFA is not an MVP blocker and is not implemented in this task. The architecture
keeps a visible, deferred path for TOTP, recovery codes, step-up verification
for sensitive account operations, and passkeys/WebAuthn in a later phase, with
secure enrollment, recovery, and factor removal. Future activation requires a
separate approval gate.

**Consequences**

- MFA stays in the long-term authentication roadmap with an explicit `Deferred`
  status; no MFA work is scheduled inside Epic #7.

### D. Shared identity foundation precedes provider integrations

Google and Apple authentication are built in this order: (1) define a
provider-neutral external identity model, (2) establish provider-identity
uniqueness and account-linking rules, (3) define secure sign-in and
account-recovery behavior, (4) implement Google OpenID Connect, (5) implement
Sign in with Apple, (6) validate both against the shared authentication,
session, and authorization contracts.

**Consequences**

- The identity model covers stable provider `sub` identifiers, unique
  `provider`+`subject` constraints, multiple authentication methods per user,
  existing password accounts, verified and unverified provider emails, Apple
  private-relay addresses, linking consent and reauthentication, prevention of
  accidental/malicious merging, provider identity changes and revocation, and
  recovery when a user loses access to a provider.
- Email equality never proves account ownership on its own.
- Existing Tasks #18 and #19 depend on the new shared-identity foundation task,
  not the other way around.

### E. Data-retention and deletion policy before account deletion

Account deletion is not implemented until the product establishes deletion
eligibility and confirmation, reauthentication requirements, immediate access
revocation, soft-delete versus hard-delete behavior, financial-record retention,
anonymization/pseudonymization rules, backup retention, audit-event retention,
handling of future shared records, UK GDPR considerations, and data
export/deletion request workflows. This record and the epic establish the
decision gate; it does **not** invent a final legal retention period.

**Consequences**

- Existing Task #28 depends on approval of this policy.
- No legal-compliance guarantee is made; a separate legal review is required
  before final retention values are chosen.

### F. SaaS scope is separated into future epics

Epic #7 owns authentication, identity lifecycle, session security, and the
authorization foundations the current product needs. Household collaboration and
tenancy, and subscription plans and entitlements, are separate future epics.
Epic #7 documents how its identity and authorization architecture will support
those capabilities without implementing them.

**Consequences**

- Household (`Household`, memberships, invitations, tenant isolation, shared
  ownership, tenant-scoped roles, membership lifecycle) and entitlements
  (Free/Plus/Pro, Family add-on, billing ownership, quotas, upgrades,
  downgrades, feature access) are deferred and are not active Epic #7 work.
- The future epics are described in the roadmap only; no GitHub epics are
  created in this task.

## Alternatives considered

- **Comprehensive RBAC now** — rejected because the product has no tenant or
  admin surface yet; it adds complexity without a consumer. A minimal role seam
  plus ownership scoping preserves the future path at far lower cost.
- **Defer refresh-token hashing/rotation** — rejected; plaintext long-lived
  refresh tokens are a material credential-storage risk for a financial product.
- **Implement Google/Apple directly on the existing `User` model** — rejected;
  provider-specific columns on `User` do not support multiple linked identities
  per user or provider-neutral recovery, and would force a later migration.
- **Implement MFA in the initial release** — rejected; it expands scope before
  the core identity and session model is hardened.
- **Implement account deletion immediately with a chosen retention value** —
  rejected; a retention/anonymization decision requires product and legal
  inputs that are not yet available.
- **Build household tenancy and entitlements inside Epic #7** — rejected; they
  are independent product phases with distinct data models and commercial
  questions.

## Consequences

Positive:

- Epic #7 becomes implementable and testable in phases, with the
  highest-severity security defects first.
- The identity model is provider-neutral, so Google, Apple, and future OIDC
  providers share one linking/session/authorization contract.
- Refresh-token security is locked into the MVP rather than deferred.
- Authorization boundaries are ready for household tenancy without premature
  tenant machinery.

Negative / follow-up work:

- A data migration is required when refresh-token hashing is introduced; the
  existing plaintext records must be invalidated or re-hashed under a documented
  transition.
- Several decisions still require product/legal approval before their
  implementation tickets can be defined (see below).

## Remaining decisions requiring approval

These are explicitly **not** decided by this record:

1. Account-deletion retention and anonymization values (soft vs hard delete,
   financial-record retention window, backup/anonymization schedule, audit-event
   retention) — requires product decision plus legal review. Tracked as
   `DECISION-DELETION-POLICY`; Task #28 is gated on its approval.
2. Password strength policy and whether to adopt a breach-list check.
3. Whether to keep bcrypt (cost 12) or move to Argon2id; not required for MVP.
4. Google/Apple verification path detail: server-side authorization-code exchange
   (recommended) versus mobile-only ID-token verification.
5. Resolution of the unused `SubscriptionType` enum against the documented
   Free/Plus/Pro + Family strategy (separate entitlements epic).
6. Concrete lockout/per-endpoint rate-limit thresholds for
   register/login/forgot-password/verify-otp/refresh.
