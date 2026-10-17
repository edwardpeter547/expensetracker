### Description

Implement and harden the user registration endpoint with safe projections,
validation, and a per-endpoint rate limit.

### Task List

- [ ] Confirm `POST /api/auth/register` validates email format and password
      strength via Joi.
- [ ] Check for duplicate email and username with a race-safe unique check.
- [ ] Hash the password with bcrypt (cost 12) and create an inactive user.
- [ ] Return `201 Created` with a safe projection that excludes `password`.
- [ ] Revisit pre-verification token issuance: either issue tokens only after
      verification or guarantee an inactive user cannot refresh into an active
      session.
- [ ] Add a per-endpoint rate limit (e.g. 5 requests/minute/IP).
- [ ] Return `400` for validation errors and `409` for duplicate email/username.
- [ ] Add controller/service tests for the success, duplicate, and invalid
      paths.

### Technical Details

Request body: `{ email, password, name?, username?, preferences? }`. Use the
existing `User` model and safe `select` projections from
`backend/src/constants/model.exclude.js`. Registration currently returns a safe
projection but issues tokens before verification; that behavior must be
revisited.

### DOD

- [ ] Valid registration returns `201` without a password hash.
- [ ] Invalid input returns `400`; duplicate email/username returns `409`.
- [ ] Pre-verification token issuance is revisited and documented.
- [ ] Per-endpoint rate limiting is enforced.
- [ ] Tests pass and are wired into CI.

### Dependencies

- Story `AUTH-S1` (#8).

### Additional Context

Keep the `{ success, message, data, errors }` response envelope.

### Related Issues / PRs

- Parent Story: #8
- Related: `AUTH-S1-T5` (email verification/resend lifecycle)
