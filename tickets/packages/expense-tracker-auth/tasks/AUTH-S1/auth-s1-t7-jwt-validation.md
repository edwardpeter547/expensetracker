### Description

Pin the JWT algorithm, add issuer/audience/jti claims, and introduce token
versioning for global invalidation.

### Task List

- [ ] Pin the signing and verification algorithm to HS256 (or the approved
      choice) and reject tokens with other algorithms.
- [ ] Add and verify `iss` and `aud` claims and include a unique `jti`.
- [ ] Add a `tokenVersion` on the user and reject tokens whose version no longer
      matches.
- [ ] Validate `jwtSecret` at startup and fail fast when missing/empty.
- [ ] Add tests for wrong algorithm, wrong issuer/audience, stale token
      version, and missing secret.

### Technical Details

`utils/helpers.js` signs tokens and `middleware/auth.middleware.js` verifies
without restricting algorithms. `env.config.js:31` has no fallback or startup
validation for `JWT_SECRET`.

### DOD

- [ ] Algorithm is pinned and enforced on verification.
- [ ] Issuer/audience are configured and validated.
- [ ] Token versioning invalidates stale tokens.
- [ ] Missing/empty secret fails fast at startup.
- [ ] Tests pass.

### Dependencies

- Phase 0/1 remediation.

### Additional Context

None.

### Related Issues / PRs

- Parent Story: #8
- Related: #12 (security story), #24 (API security)
