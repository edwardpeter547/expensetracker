### Description

Add a device/session registry with per-device listing and revocation.

### Task List

- [ ] Add session metadata (IP, user agent, created/expiry) to refresh-token
      records.
- [ ] Expose a session list for the authenticated user.
- [ ] Add per-device/per-session revocation and revoke-all-sessions.
- [ ] Ensure revocation is reflected in refresh reuse detection.
- [ ] Add tests for list, per-device revoke, and revoke-all.

### Technical Details

Build on the hashed, atomically rotated refresh-token model from `AUTH-S1-T3`
(#16). One refresh-token record represents one device session.

### DOD

- [ ] Sessions carry device metadata and can be listed.
- [ ] A session can be revoked per device and all sessions can be revoked.
- [ ] Revoked sessions cannot refresh.
- [ ] Tests pass.

### Dependencies

- `AUTH-S1-T3` (#16).

### Additional Context

This is the foundation for later per-device logout UX.

### Related Issues / PRs

- Parent Story: #8
- Related: #16 (token refresh), #17 (logout)
