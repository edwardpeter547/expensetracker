### Description

Implement and harden the user login endpoint with uniform errors, lockout, and
per-endpoint throttling.

### Task List

- [ ] Confirm `POST /api/auth/login` validates email/password against the
      database with `bcrypt.compare`.
- [ ] Generate a short-lived JWT access token (15-minute default) and a refresh
      token that is stored hashed.
- [ ] Return a uniform `401` for unknown email and wrong password with the same
      generic message (no `403` for wrong password).
- [ ] Add incremental account lockout and per-endpoint throttling (e.g. 10
      requests/minute/IP) with documented thresholds.
- [ ] Record login attempts without leaking account existence.
- [ ] Return the token pair and a safe user projection.
- [ ] Add tests for success, unknown email, wrong password, lockout, and
      throttling.

### Technical Details

Access-token payload carries a unique server-validated subject (`userId`) and
later `iss`/`aud`/`jti`. The current code returns `401` for unknown email and
`403` for wrong password (`auth.controller.js:140,147`); both must become a
uniform `401`.

### DOD

- [ ] Valid credentials return `200` with access/refresh tokens.
- [ ] Unknown email and wrong password both return a uniform `401`.
- [ ] Lockout/per-endpoint throttling is enforced and tested.
- [ ] No account-existence signal leaks through status codes.
- [ ] Tests pass and are wired into CI.

### Dependencies

- Story `AUTH-S1` (#8).

### Additional Context

Concrete lockout thresholds remain an open product decision; use safe defaults
and document them.

### Related Issues / PRs

- Parent Story: #8
- Related: #24 (per-endpoint rate limiting)
