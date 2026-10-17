### Description

Implement the logout endpoint that revokes the presented refresh-token session.

### Task List

- [ ] Confirm `POST /api/auth/logout` accepts the refresh token.
- [ ] Mark the presented refresh token revoked (or delete it).
- [ ] Return a generic `200` success response.
- [ ] Ensure a logged-out token cannot be used again.
- [ ] Add a test that a revoked token is rejected by refresh.

### Technical Details

Request body: `{ refreshToken }`. Prefer marking the token revoked over deleting
it so reuse detection can observe the revocation. Revoke-all-sessions is a
separate capability covered by #16 and `AUTH-S1-T8`.

### DOD

- [ ] The presented refresh token is revoked.
- [ ] A revoked token cannot refresh into a new session.
- [ ] Tests pass.

### Dependencies

- Story `AUTH-S1` (#8).

### Additional Context

None.

### Related Issues / PRs

- Parent Story: #8
- Related: #16 (token refresh), `AUTH-S1-T8` (session management)
