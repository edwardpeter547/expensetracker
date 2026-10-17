[FEATURE] Authentication and Authorization

_This is the proposed replacement body for GitHub issue #7. It preserves the
original epic's valuable requirements, separates authentication / authorization
/ tenancy / entitlement concerns, corrects the implementation baseline, and
organizes work into MVP, production-hardening, and future SaaS phases. It is a
planning reference only; nothing here authorizes implementation, live GitHub
edits, or ticket creation._

### Feature Description

#### Background and product vision

ExpenseTracker is evolving from a single-user mobile expense tracker into a
privacy-first personal finance platform for individuals and households.
Authentication and authorization are the security foundation for that
evolution. The codebase already contains a substantial but uneven
authentication implementation — email/password registration, email
verification, login, refresh-token rotation, logout, and password reset —
alongside a lightweight single-user ownership model.

This epic makes authentication and authorization correct, safe, testable, and
extensible: production-grade email/password authentication now, Google and
Apple sign-in next on a shared identity foundation, and a clearly separated
authorization model that can later support household sharing and commercial
entitlements without a rewrite.

#### Objectives

1. Make the existing email/password, verification, reset, and token flows
   correct and secure.
2. Eliminate cross-user data access and credential-exposure defects.
3. Deliver complete account-management endpoints (profile, change password,
   deletion — deletion only after its retention policy is approved).
4. Establish a provider-neutral identity model, then add Google (OpenID
   Connect) and Sign in with Apple with secure, explicit account linking.
5. Enforce ownership-based authorization on every resource, with a minimal role
   seam for future household/tenant roles.
6. Put authentication and authorization behavior under unit and integration
   test coverage.

### Problem Statement

The current system has JWT email/password authentication with refresh-token
rotation, but it contains security and correctness defects: several endpoints
return the password hash, one single-record read is not owner-scoped, category
mutations are non-atomic, refresh tokens are stored in plaintext, the
password-reset flow leaks account existence and logs the reset code, and no
account lockout or per-endpoint rate limiting exists. Profile update, change
password, account deletion, Google, and Apple login are missing.
The original epic also conflates authentication, authorization, tenant
membership, and entitlements, and specifies roles (`ADMIN`, `MEMBER`, `VIEWER`)
without a tenant model to scope them.

The result is a system that appears feature-complete but is not safe to operate
as a financial SaaS, and that cannot absorb multi-user or social-identity
features without rework.

### Proposed Solution

#### Target authentication architecture

- Keep the existing layered backend (`route -> Joi -> controller -> service ->
  Prisma`) and the `{ success, message, data, errors }` envelope.
- Access tokens: short-lived HS256 JWTs (15-minute default) with pinned
  algorithm and `iss`/`aud`/`jti` claims; a unique server-validated subject
  (`userId`) and, later, a token version.
- Refresh tokens: opaque random values, **hashed (SHA-256) at rest**, 7-day
  expiry, atomically rotated, with reuse detection that revokes the token
  family when a revoked token is presented. Logout revokes the presented
  session; revoke-all runs on password reset and password change.
- Sessions: one refresh-token record per device session with IP/user-agent
  metadata, so sessions can later be listed and revoked per device.
- Authentication endpoints: uniform generic failures (no account enumeration),
  per-endpoint rate limits, and incremental lockout after repeated failures.
- Passwords: bcrypt cost 12 (retained), a documented strength policy,
  password-history reuse prevention, and no plaintext secrets in logs.

#### Provider-neutral identity model

- A `UserIdentity` model keyed by `provider` + `subject` with a unique
  `@@unique([provider, subject])` constraint, `emailVerifiedAt` per identity,
  and linking state (`pending`/`linked`/`revoked`). The canonical `User` stays
  provider-agnostic; password credentials and provider identities are linked
  authentication methods, not extra columns on `User`.
- One user may link multiple methods; an existing password account links to a
  provider only through explicit consent and reauthentication; an unverified
  provider email is never auto-linked. Email equality alone never proves
  account ownership.
- The model handles stable provider subjects, duplicate-email resolution,
  Apple private-relay addresses, provider identity changes/revocation, and
  recovery when a user loses access to a provider.

#### Google and Apple login integration

In dependency order:

1. Define the shared external identity model.
2. Establish provider-identity uniqueness and account-linking rules.
3. Define secure sign-in and account-recovery behavior.
4. Implement Google OpenID Connect.
5. Implement Sign in with Apple.
6. Validate both integrations against the shared authentication, session, and
   authorization contracts.

- Google: OpenID Connect via `expo-auth-session` on mobile; the backend verifies
  the ID token (or exchanges an authorization code server-side), validating
  `iss`, `aud`, `exp`, and `nonce`; identity is keyed by Google `sub`.
- Apple: identity-token verification via Apple's JWKS, keyed by Apple `sub`;
  honor Apple's re-verification requirement and treat email as a one-time
  attribute.
- Social login issues the same access/refresh token pair as password login.

#### Target authorization architecture

- `authenticate` (exists) verifies the token and attaches a safe,
  projection-limited user.
- Object-level authorization is the primary control: every single-record read,
  update, and delete loads or constrains by the caller's `userId` (or future
  membership) and returns 404 on mismatch. List endpoints are owner-scoped.
- Owner-constrained single-record mutations use Prisma's extended
  `WhereUniqueInput` form `where: {id, userId}` (valid in the installed
  Prisma 7.9.1 and atomic), or a `prisma.$transaction`
  fetch-then-authorize-then-mutate where richer checks are needed.
  `updateMany`/`deleteMany` remain an acceptable alternative when an explicit
  affected-row count is preferred. Never mutate by a bare `id`.
- A minimal `authorize(...roles)` seam is added only where a real consumer
  exists. `MEMBER`/`VIEWER` belong to the future household model, not the
  single-user MVP; platform `ADMIN` is out of scope unless a real ops surface
  is introduced.
- Subscription entitlements are a separate concern and are not mixed into roles
  or route guards.

#### User identity and account lifecycle

- Registration creates an inactive user, sends verification, and issues tokens
  only after verification (or keeps pre-verification issuance but guarantees an
  inactive user cannot refresh into an active session).
- Email verification: single-use, expiring token; resend supported; all
  responses use safe projections.
- Password recovery: generic forgot-password response; adequately throttled
  reset code; token is single-use and consumed on success; reset revokes all
  sessions.
- Profile update: name, username, locale, currency, timezone, theme; email
  change is a separate re-verified flow.
- Change password: requires current password, checks history, and revokes other
  sessions.
- Account deletion: explicit confirmation and reauthentication, immediate
  access revocation, and a documented soft-delete/hard-delete and
  retention/anonymization policy **approved before implementation**.

#### SaaS tenant and membership model

- Identity, authentication, authorization, tenant membership, and billing
  entitlements are modeled separately.
- Today: individual accounts; all financial resources are personal and
  owner-scoped; ownership enforcement is independent of subscription status.
- Future (separate epics): `Household` + `HouseholdMembership` with
  `owner`/`admin`/`member` roles, invitation-and-acceptance flows, and clear
  personal vs shared spaces; subscription plans and entitlements
  (Free/Plus/Pro + Family) owned by the billing owner.
- The unused `SubscriptionType` enum must be reconciled with the Free/Plus/Pro
  + Family strategy or removed.

#### Security and privacy requirements

- OWASP-aligned controls: fix broken object-level authorization and
  sensitive-data exposure; hash credentials and tokens; generic auth errors;
  per-endpoint rate limiting; account lockout; secure session rotation and
  revocation.
- Configuration: explicit CORS allow-list (no wildcard with credentials),
  `trust proxy` behind a load balancer, HTTPS/HSTS in production.
- Logging/audit: structured, secret-safe logs; persistent audit events for
  security-relevant actions without storing tokens, passwords, codes, or raw
  financial payloads.
- Privacy: UK GDPR-aligned data minimization, documented retention, export and
  deletion on every tier, and no premium-gating of security or deletion.

#### Migration and compatibility considerations

- Schema changes (role, `UserIdentity`, token hashing, deletion/consent fields,
  session metadata) require versioned migrations under version control; no
  migration directory is currently committed.
- Existing plaintext refresh tokens must be migrated or invalidated when hashing
  is introduced.
- API contract changes (error shapes, new endpoints) must be
  backwards-compatible or staged; the response envelope stays stable.
- Mobile must handle new error codes and social flows without breaking existing
  password login.

### Alternative Solutions

- Third-party hosted auth (Auth0/Firebase): faster to stand up but adds
  external dependency, cost, and vendor lock-in; rejected in favor of
  first-party auth with OIDC providers.
- Session-cookie authentication: simpler server-side revocation but less
  convenient for a mobile client and the current JWT architecture; rejected.
- OAuth-only (no passwords): reduces password-handling risk but blocks users
  without Google/Apple accounts; rejected.
- Full policy/permission matrix now: more flexible but unjustified complexity
  before household/org features exist; deferred.
- Provider-specific columns on `User` instead of a shared identity model:
  simpler short-term but cannot represent multiple linked methods per user and
  forces a later migration; rejected.

### Impact

- [x] Backend API
- [x] Mobile App
- [x] Both
- [x] Infrastructure / DevOps

### Acceptance Criteria

Each criterion is testable. "Covered by tests" means unit plus supertest/service
integration tests where applicable.

#### MVP (correctness and security — required for MVP completion)

- [ ] No auth endpoint returns a password hash or token material; all user
      responses use safe projections, including transaction-create responses.
- [ ] A user cannot read, update, or delete another user's transaction, budget,
      or category; ownership is enforced at the service layer and returns 404
      on mismatch.
- [ ] Transaction/budget/category CRUD works end to end with owner scoping;
      single-record reads, updates, and deletes are owner-constrained and
      return 404 on mismatch (including fixed `GET /budgets/:id`,
      `GET /categories/:id`, and `PUT /categories/:id`).
- [ ] Refresh tokens are stored hashed; rotation is atomic and detects reuse; a
      reused or revoked token invalidates the family.
- [ ] Password reset consumes the token, revokes all refresh tokens, returns a
      generic response for unknown email, and never logs the code.
- [ ] Login returns a uniform 401 for unknown email and wrong password and
      locks the account (or throttles) after N failures; per-endpoint rate
      limits exist for register/login/forgot-password/verify-otp/refresh.
- [ ] Profile update and change-password-with-current-password endpoints are
      implemented; password change verifies the current password, checks
      history, and revokes other sessions.
- [ ] The API starts successfully (logger configuration fixed) and a boot smoke
      test guards the startup path.
- [ ] Unit and integration tests cover registration, login, refresh
      rotation/reuse/concurrency, logout, verification, reset, ownership
      denial, profile update, and password change; CI executes them.

#### Production hardening (required for production-hardening completion)

- [ ] The provider-neutral identity model and account-linking rules are
      implemented and tested.
- [ ] Google OIDC and Sign in with Apple register and sign in users and issue
      the same token pair; linking requires explicit consent and handles
      duplicate email, private-relay addresses, and provider identity changes.
- [ ] JWT algorithm is pinned; issuer/audience and token versioning are
      configured; sessions can be listed and revoked per device.
- [ ] CORS uses an explicit allow-list; `trust proxy` and HTTPS/HSTS are
      configured for production.
- [ ] Security-relevant events are written to a persistent audit store without
      secrets.

#### Account deletion (required before Epic #7 is closed, but gated)

- [ ] A data-retention and deletion policy is approved (product decision plus
      legal review) covering eligibility, confirmation, reauthentication,
      immediate access revocation, soft-vs-hard delete, financial-record
      retention, anonymization, backup retention, audit retention, shared
      records, UK GDPR, and export/deletion workflows.
- [ ] Account deletion is implemented against that approved policy with
      confirmation, reauthentication, and session revocation, and is covered
      by tests.

### Definition of Done

- **Phase 0 security remediation complete:** the critical and high findings in
  the audit (credential exposure, the non-owner-scoped transaction read,
  non-atomic category mutations, plaintext refresh tokens, reset weaknesses,
  enumeration, startup blocker) are fixed and covered by automated regression
  tests.
- **MVP complete:** all MVP acceptance criteria above are met and covered by
  tests; every resource mutation is owner-scoped with a cross-user denial test;
  no password hash, token, or reset code appears in any response, log, or
  console output; the Prisma schema is migrated under version control with a
  documented token-hashing transition; API documentation matches implemented
  behavior.
- **Production-hardening complete:** the shared identity model, Google OIDC,
  Sign in with Apple, JWT/config hardening, persistent audit events, and
  per-device sessions all meet their acceptance criteria and are tested.
- **Epic #7 complete:** MVP and production-hardening acceptance criteria are
  met **and** the gated account-deletion criterion is met after the retention
  policy is approved. Epic #7 is **not** closed while mandatory in-scope
  Google/Apple integration or the gated deletion criterion remain unfinished.
  Deferred future epics do not block Epic #7 closure.

### Future Extensions (non-blocking)

These are outside Epic #7 and are **not** acceptance criteria. They do not
block Phase 0, MVP, production-hardening, or Epic #7 completion. Each requires
its own future epic and product-phase approval.

- Household membership with owner/admin/member roles, invitation acceptance,
  personal vs shared isolation, and removal that revokes shared access only.
- Entitlement enforcement separate from roles, with history-preserving
  downgrade.
- MFA (TOTP, recovery codes, step-up, then passkeys).

### Additional Context

- Stack: Express 5 + Prisma 7/PostgreSQL (backend), Expo SDK 57/TypeScript
  (mobile), JWT + bcrypt.
- Backend tests today cover middleware/utils/validations only; integration
  tests must be added.
- Product strategy documents (`docs/product/`) are proposals and do not
  authorize implementation; household and subscription phases require
  product-owner approval.
- Security, privacy, export, and deletion are foundational and never
  premium-gated.
- Phasing, existing-issue mapping, and proposed missing tasks are in
  `tickets/reviews/epic-7-roadmap.md`.

### Related Issues / PRs

Existing native children (all OPEN): stories #8–#13 and tasks #14–#28.

- #8 Core Authentication Infrastructure; #9 Social Authentication; #10 Password
  Management; #11 Authorization & Role Management; #12 Security & Compliance;
  #13 User Account Management.
- #14 Register; #15 Login; #16 Token Refresh; #17 Logout; #18 Google OAuth; #19
  Apple Sign-In; #20 Forgot Password; #21 Reset Password; #22 Role-Based
  Authorization Middleware; #23 Resource Ownership Enforcement; #24 API
  Security Configuration; #25 Authentication Event Logging; #26 Profile Update;
  #27 Change Password; #28 Account Deletion.

Supporting repository documentation:

- `docs/architecture/system-overview.md`;
  `docs/architecture/product-domain-design.md`;
  `docs/product/product-requirements.md`;
  `docs/product/product-roadmap.md`;
  `docs/product/subscription-strategy.md`;
  `docs/engineering/coding-standards.md`;
  `docs/engineering/testing-strategy.md`;
  `docs/decisions/0001-authentication-and-authorization-architecture.md`.
- Ticket-automation workflow: `tickets/README.md`.
