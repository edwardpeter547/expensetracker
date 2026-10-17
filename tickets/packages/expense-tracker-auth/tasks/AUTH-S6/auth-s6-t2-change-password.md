### Description

Implement the change-password endpoint with current-password verification,
history checks, and session revocation.

### Task List

- [ ] Confirm `POST /api/user/change-password` accepts current and new
      passwords.
- [ ] Verify the current password with `bcrypt.compare`.
- [ ] Check the new password against password history.
- [ ] Hash and update the new password.
- [ ] Revoke all other refresh-token sessions (keep the current one if
      desired).
- [ ] Return `401` for an incorrect current password and guard null users.
- [ ] Add tests for success, wrong current password, history reuse, and
      revocation.

### Technical Details

The reset-code flow exists; this task adds current-password change with history
and session revocation. `PasswordHistory` already exists and is written on
password changes.

### DOD

- [ ] Password changes with the correct current password.
- [ ] Wrong current password returns `401`.
- [ ] History reuse is rejected.
- [ ] Other sessions are revoked.
- [ ] Tests pass.

### Dependencies

- Story `AUTH-S6` (#13).

### Additional Context

None.

### Related Issues / PRs

- Parent Story: #13
- Related: #26 (profile), #16 (session revocation)
