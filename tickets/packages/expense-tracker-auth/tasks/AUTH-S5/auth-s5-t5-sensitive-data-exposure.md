### Description

Eliminate sensitive-data exposure from all API responses.

### Task List

- [ ] Remove the password hash from `verify-email`, `resend-verification`,
      `verify-otp`, and `forgot-password` responses.
- [ ] Remove the nested full `User` (including password) from
      transaction-create responses.
- [ ] Use explicit safe `select` projections everywhere user data is returned.
- [ ] Add response-shape regression tests that assert no password hash or token
      material appears.

### Technical Details

Affected call sites: `auth.controller.js:93,123,216,241` and
`transaction.service.js:9-20` (`createTransactionRecord` selects `user: true`).
Use the existing `USER_MODEL_EXCLUDE` projection and explicit `select`.

### DOD

- [ ] No API response includes a password hash or token material.
- [ ] Transaction-create returns only the safe owner projection.
- [ ] Regression tests assert the absence of secrets in responses.
- [ ] Tests pass.

### Dependencies

- Story `AUTH-S5` (#12).

### Additional Context

This is the critical "sensitive data exposure" audit finding; it is
cross-cutting and distinct from the verification lifecycle work in
`AUTH-S1-T5`.

### Related Issues / PRs

- Parent Story: #12
- Related: `AUTH-S1-T5` (email verification), #23 (ownership)
