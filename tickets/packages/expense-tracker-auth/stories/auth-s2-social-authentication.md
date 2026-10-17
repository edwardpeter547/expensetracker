### Story Description

Add Google and Apple sign-in on a provider-neutral identity foundation, with
explicit account linking for existing password accounts.

### Problem Statement

Users want a frictionless sign-up and sign-in experience. The current system is
email/password only, and the original story proposed provider-specific columns
on `User`, which cannot represent multiple linked identities per user or a
consistent recovery story without a later migration.

### Proposed Solution

Build in dependency order: (1) define a provider-neutral `UserIdentity` model
with a unique `provider` + `subject` constraint, linking state, and
consent/reauthentication rules (`AUTH-S2-T3`); (2) implement Google OpenID
Connect (#18); (3) implement Sign in with Apple (#19); (4) validate both
integrations against the shared authentication, session, and authorization
contracts. The canonical `User` stays provider-agnostic. Linking requires
explicit consent and reauthentication; unverified provider emails are never
auto-linked; email equality alone never proves account ownership.

### Alternative Solutions

- Firebase/Auth0 hosted auth: faster but adds an external dependency, cost, and
  vendor lock-in.
- Provider-specific columns on `User`: rejected because it cannot represent
  multiple linked methods per user.

### Impact

- [x] Backend API
- [x] Mobile App
- [ ] Both
- [ ] Infrastructure / DevOps

### Acceptance Criteria

- [ ] The provider-neutral identity model and account-linking rules exist and
      are tested before provider integration (`AUTH-S2-T3`).
- [ ] Google OpenID Connect and Sign in with Apple register and sign in users
      and issue the same access/refresh token pair as password login.
- [ ] Linking requires explicit consent and reauthentication, and handles
      duplicate email, Apple private-relay addresses, and provider identity
      changes.
- [ ] Integration tests cover social sign-in and linking flows.

### Additional Context

Google uses OpenID Connect via `expo-auth-session`; the backend verifies the ID
token (or exchanges an authorization code server-side). Apple uses
identity-token verification against Apple's JWKS and re-verification on each
sign-in.

### Related Issues / PRs

- Parent Epic: #7
- Tasks: #18 (Google), #19 (Apple)
- New prerequisite task: `AUTH-S2-T3` (shared identity foundation)
