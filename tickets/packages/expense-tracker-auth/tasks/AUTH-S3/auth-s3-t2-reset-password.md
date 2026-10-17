### Description

Implement the reset-password endpoint that validates and consumes the reset
token, updates the password, and revokes all sessions.

### Task List

- [ ] Confirm `POST /api/auth/reset-password` accepts the reset token and new
      password.
- [ ] Validate the token exists, is unexpired, and is unused; consume it on
      success.
- [ ] Hash the new password with bcrypt and update the user.
- [ ] Revoke all refresh tokens for the user.
- [ ] Guard null-user dereferences (`user.language`) in the reset/verify paths.
- [ ] Add tests for success, expired token, reused token, and null-user guard.

### Technical Details

The reset token must be single-use with a `usedAt`/single-use flag. `verify-otp`
and `change-password` currently dereference `user.language` without a null
guard.

### DOD

- [ ] A valid token resets the password exactly once.
- [ ] Expired or reused tokens are rejected.
- [ ] All refresh tokens are revoked on reset.
- [ ] Null-user paths do not throw.
- [ ] Tests pass.

### Dependencies

- `AUTH-S3-T1` (#20).

### Additional Context

None.

### Related Issues / PRs

- Parent Story: #10
- Related: #20 (forgot password), #16 (refresh revocation)
