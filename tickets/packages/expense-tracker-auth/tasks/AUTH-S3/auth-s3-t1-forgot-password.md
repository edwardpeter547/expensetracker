### Description

Implement the forgot-password endpoint that sends a secure reset code with a
generic response, unbiased generation, and no secret logging.

### Task List

- [ ] Confirm `POST /api/auth/forgot-password` accepts an email and returns a
      generic response whether or not the email exists.
- [ ] Generate the reset code with a cryptographically secure, unbiased method
      (no `byte % 10` bias).
- [ ] Store the code with `userId`, expiry, and a single-use flag.
- [ ] Never log the code (remove the `console.log`).
- [ ] Enforce a per-endpoint rate limit (e.g. 5 requests/hour/IP).
- [ ] Add tests for generic response, code generation, and throttling.

### Technical Details

Use rejection sampling or a secure integer-remapping method for the numeric
code. The current `crypto.randomBytes(6).map(byte => byte % 10)` is biased.

### DOD

- [ ] Unknown email and known email produce indistinguishable responses.
- [ ] Code generation is unbiased and never logged.
- [ ] Per-endpoint rate limiting is enforced.
- [ ] Tests pass.

### Dependencies

- Story `AUTH-S3` (#10).

### Additional Context

None.

### Related Issues / PRs

- Parent Story: #10
- Related: #21 (reset password)
