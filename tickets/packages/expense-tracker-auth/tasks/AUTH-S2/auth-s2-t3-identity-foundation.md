### Description

Implement the provider-neutral identity model and account-linking foundation
that Google and Apple sign-in build upon.

### Task List

- [ ] Add a `UserIdentity` model keyed by `provider` + `subject` with a unique
      `@@unique([provider, subject])` constraint and per-identity
      `emailVerifiedAt`.
- [ ] Add linking state (`pending`/`linked`/`revoked`) and a confirmation
      challenge for merging into an existing account.
- [ ] Define duplicate-email, Apple private-relay, provider identity-change,
      and lost-provider-access recovery rules.
- [ ] Require reauthentication for linking and never auto-link an unverified
      provider email.
- [ ] Add schema migration and tests for uniqueness, linking, and revocation.

### Technical Details

Keep the canonical `User` provider-agnostic; credentials and identities are
linked authentication methods, not extra columns on `User`. Email equality
alone never proves account ownership.

### DOD

- [ ] `UserIdentity` supports multiple methods per user with unique
      provider+subject.
- [ ] Linking requires consent and reauthentication and is tested.
- [ ] Duplicate-email and private-relay rules are implemented and documented.
- [ ] Migration is version-controlled and tests pass.

### Dependencies

- Phase 0/1 completion.

### Additional Context

This task precedes #18 (Google) and #19 (Apple).

### Related Issues / PRs

- Parent Story: #9
- Related: #18 (Google), #19 (Apple)
