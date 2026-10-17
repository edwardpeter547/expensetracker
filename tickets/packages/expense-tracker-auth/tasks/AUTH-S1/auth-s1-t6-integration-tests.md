### Description

Add backend integration tests for the authentication and ownership flows so
security behavior is protected against regression.

### Task List

- [ ] Add supertest/service integration tests for registration and login.
- [ ] Add tests for refresh rotation, concurrent refresh requests, reuse/replay,
      and logout revocation.
- [ ] Add tests for email verification, resend, forgot-password, and
      reset-password.
- [ ] Add cross-user ownership denial tests for transactions, budgets, and
      categories.
- [ ] Add tests for profile update and password change.
- [ ] Wire the suite into the existing Jest project and CI.

### Technical Details

Use the existing Jest setup plus supertest against the Express app and a
disposable test database. Avoid live SMTP and assert on response shapes,
including that no response contains a password hash or token material.

### DOD

- [ ] All listed flows have integration coverage.
- [ ] Cross-user denial tests fail before ownership fixes and pass after.
- [ ] The suite runs in CI and passes.

### Dependencies

- Phase 0 remediation tasks (`AUTH-S4-T2`, `AUTH-S1-T3`, `AUTH-S3-T1`,
  `AUTH-S3-T2`, `AUTH-S5-T5`) should land first so the suite asserts the fixed
  behavior.

### Additional Context

Today only middleware/utils/validation are unit-tested; no controller, service,
or route tests exist.

### Related Issues / PRs

- Parent Story: #8
- Related: #23 (ownership), #16 (refresh)
