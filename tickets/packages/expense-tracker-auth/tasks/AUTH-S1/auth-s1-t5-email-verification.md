### Description

Harden the email verification and resend lifecycle so tokens are single-use and
expiring, responses use safe projections, and the failed-send path is correct.

### Task List

- [ ] Confirm `GET /api/auth/verify-email` and `POST /api/auth/resend-verification`
      use single-use, expiring tokens.
- [ ] Return safe projections that never include the password hash.
- [ ] Fix the failed-send callback that references an undefined `user`
      variable (`auth.controller.js:91-92`).
- [ ] Keep pre-verification users inactive and unable to refresh into an active
      session.
- [ ] Add tests for verify success, expired token, reused token, resend, and
      failed-send behavior.

### Technical Details

Verification tokens are generated with expiry and deleted on success; they must
also be single-use. The `getVerificationToken` include and `getUser` calls
currently return full `User` rows including `password`.

### DOD

- [ ] Verification tokens are single-use and expiring.
- [ ] No verification/resend response includes a password hash.
- [ ] Failed email sends do not throw a `ReferenceError`.
- [ ] Tests pass.

### Dependencies

- `AUTH-S1-T1` (#14).

### Additional Context

This task covers the verification lifecycle; the cross-cutting removal of
sensitive data from all affected responses is `AUTH-S5-T5`.

### Related Issues / PRs

- Parent Story: #8
- Related: `AUTH-S5-T5` (sensitive-data exposure remediation)
