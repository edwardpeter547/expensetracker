### Story Description

Harden and complete the core email/password authentication flows: user
registration, login, token refresh, and logout. This story preserves the
existing layered backend (`route -> Joi -> controller -> service -> Prisma`)
and the `{ success, message, data, errors }` response envelope.

### Problem Statement

The repository already contains registration, login, refresh-token rotation,
logout, email verification, and password reset at source level, but the core
flows are uneven and contain security defects: refresh tokens are stored in
plaintext, rotation is non-atomic, login distinguishes unknown-email (401) from
wrong-password (403) and leaks account existence, lockout and per-endpoint
throttling are missing, registration issues tokens before verification, and no
controller/service/integration tests exist for these flows.

### Proposed Solution

- **Registration:** create an inactive user with a safe projection and a
  per-endpoint rate limit. Revisit pre-verification token issuance so an
  inactive user cannot refresh into an active session (either issue tokens only
  after verification, or guarantee the inactive user stays blocked).
- **Login:** return a uniform `401` for both unknown email and wrong password,
  add incremental lockout/per-endpoint throttling, and keep responses generic
  to prevent account enumeration.
- **Token refresh:** store refresh tokens hashed at rest, rotate them
  atomically, detect reuse with token-family revocation, and support revoke-all
  on password reset/change (detailed in #16).
- **Logout:** revoke the presented refresh-token session (detailed in #17).

### Alternative Solutions

- Session-cookie authentication: rejected for a mobile-first client that already
  uses JWT and SecureStore token storage.
- Single long-lived JWT without refresh: rejected because it removes server-side
  revocation and forces frequent re-login.

### Impact

- [x] Backend API
- [x] Mobile App
- [ ] Both
- [ ] Infrastructure / DevOps

### Acceptance Criteria

- [ ] Registration creates an inactive user with a safe projection and never
      returns a password hash; pre-verification issuance is revisited.
- [ ] Login returns a uniform `401` for unknown email and wrong password and
      locks/throttles after repeated failures; per-endpoint rate limits exist.
- [ ] Refresh tokens are stored hashed, rotated atomically, and reuse is
      detected with family revocation (see #16).
- [ ] Logout revokes the presented session.
- [ ] Unit and integration tests cover registration, login, refresh
      rotation/reuse/concurrency, and logout.

### Additional Context

Existing implementation is in `backend/src/controllers/auth.controller.js` and
`backend/src/services/auth.service.js`. Tests today cover only middleware,
utils, and validation schemas; integration coverage is added by `AUTH-S1-T6`.

### Related Issues / PRs

- Parent Epic: #7
- Tasks: #14 (Register), #15 (Login), #16 (Token Refresh), #17 (Logout)
- New tasks: `AUTH-S1-T5` (email verification), `AUTH-S1-T6` (integration
  tests), `AUTH-S1-T7` (JWT validation), `AUTH-S1-T8` (session management)
