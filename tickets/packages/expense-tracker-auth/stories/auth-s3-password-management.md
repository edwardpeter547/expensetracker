### Story Description

Complete and harden the forgot-password and reset-password recovery flows with
email notification.

### Problem Statement

Users need a safe recovery path. The current recovery flow leaks account
existence, generates a biased 6-digit code with `byte % 10`, prints the code to
the console, does not consume the reset token on use, does not revoke existing
sessions, and lacks per-endpoint throttling.

### Proposed Solution

- Forgot password: accept an email, return a generic response that never
  reveals account existence, generate the reset code with a cryptographically
  secure unbiased method, never log the code, and enforce a per-endpoint rate
  limit.
- Reset password: validate the token (exists, unexpired, unused), consume it on
  success, update the password hash, and revoke all refresh tokens.
- Keep the existing email service integration and templates; add confirmation
  where applicable.

### Alternative Solutions

- SMS OTP: rejected for cost and phone-number requirements.
- Security questions: rejected as weaker and higher-friction.

### Impact

- [x] Backend API
- [x] Mobile App
- [ ] Both
- [ ] Infrastructure / DevOps

### Acceptance Criteria

- [ ] Forgot-password returns a generic response for known and unknown email
      alike and never logs the code.
- [ ] The reset code is generated with an unbiased cryptographically secure
      method and is subject to a per-endpoint rate limit.
- [ ] The reset token is single-use, consumed on success, and expires.
- [ ] Password reset revokes all existing refresh tokens.
- [ ] Unit and integration tests cover forgot and reset password flows.

### Additional Context

Reset-token storage uses `userId`, token, and `expiresAt`. The biased code and
the `console.log` are in `backend/src/controllers/auth.controller.js`.

### Related Issues / PRs

- Parent Epic: #7
- Tasks: #20 (Forgot Password), #21 (Reset Password)
