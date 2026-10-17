### Story Description

Apply OWASP-aligned security and compliance controls across authentication,
session, and API configuration.

### Problem Statement

Refresh tokens are stored in plaintext, CORS uses a wildcard with credentials,
`trust proxy` and HTTPS/HSTS are not configured, rate limiting is global-only,
and no persistent secret-safe audit store exists. Several `console.log` calls
print tokens or reset codes.

### Proposed Solution

- Hash refresh tokens at rest and enforce atomic rotation with reuse detection
  (see #16).
- Use an explicit CORS allow-list (no wildcard with credentials), configure
  `trust proxy`, and enforce HTTPS/HSTS in production.
- Add per-endpoint rate limits and incremental account lockout.
- Write security-relevant events to a persistent audit store in a structured,
  secret-safe format, and remove all token/password/code logging.

### Alternative Solutions

- Refresh-token rotation without hashing: rejected; plaintext long-lived
  refresh tokens are a material credential-storage risk for a financial product.
- Global rate limiting only: rejected; auth endpoints need per-endpoint limits.

### Impact

- [x] Backend API
- [ ] Mobile App
- [ ] Both
- [x] Infrastructure / DevOps

### Acceptance Criteria

- [ ] Refresh tokens are never stored or logged in plaintext.
- [ ] CORS uses an explicit allow-list; `trust proxy` and HTTPS/HSTS are
      configured for production.
- [ ] Per-endpoint rate limits and account lockout exist for auth endpoints.
- [ ] Security-relevant events are written to a persistent, secret-safe audit
      store.
- [ ] No token, password, or reset code appears in logs or console output.

### Additional Context

The logger configuration startup blocker (`logger.config.js:67`) and the boot
smoke test are the first part of #24.

### Related Issues / PRs

- Parent Epic: #7
- Tasks: #24 (API security configuration), #25 (authentication event logging)
- New task: `AUTH-S5-T5` (sensitive-data exposure remediation)
