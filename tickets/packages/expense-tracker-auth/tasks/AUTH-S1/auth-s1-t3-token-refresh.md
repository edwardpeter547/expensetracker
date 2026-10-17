### Description

Harden the refresh-token flow: hash tokens at rest, rotate them atomically,
detect reuse with family revocation, and support revoke-all.

### Task List

- [ ] Replace plaintext refresh-token storage with SHA-256 hashes and document
      migration/invalidation of existing plaintext records.
- [ ] Make revoke-old/issue-new rotation atomic (single transaction or
      equivalent concurrency-safe strategy) with documented trade-offs.
- [ ] Detect reuse: presenting an already-rotated/revoked token revokes the
      whole token family and rejects the request.
- [ ] Re-check the user is still active/eligible on refresh.
- [ ] Support revoke-all-sessions for password reset and password change.
- [ ] Return `401` for invalid, expired, revoked, or nonexistent tokens without
      a `TypeError`.
- [ ] Test rotation, concurrent refresh requests, reuse/replay, expiry, and
      database-failure paths.

### Technical Details

Refresh tokens are opaque random values, hashed with SHA-256 at rest, 7-day
expiry, atomically rotated. A presented revoked token must invalidate the
family. Existing code stores plaintext (`auth.service.js:53-65`) and rotates in
two non-atomic operations (`auth.controller.js:295,297`).

### DOD

- [ ] Refresh tokens are never stored or logged in plaintext.
- [ ] Rotation is atomic and reuse detection revokes the family.
- [ ] Revoke-all works on password reset and password change.
- [ ] Concurrency, replay, expiry, and database-failure tests pass.

### Dependencies

- Story `AUTH-S1` (#8).

### Additional Context

See `docs/decisions/0001-authentication-and-authorization-architecture.md`
(Decision B). `AUTH-S1-T8` builds the session registry on top of this work.

### Related Issues / PRs

- Parent Story: #8
- Related: #20/#21 (reset revocation), `AUTH-S1-T8` (session registry)
