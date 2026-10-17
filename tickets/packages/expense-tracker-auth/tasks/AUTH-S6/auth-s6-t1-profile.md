### Description

Implement the user profile update endpoint with safe projections and duplicate
handling.

### Task List

- [ ] Confirm `PUT /api/user/profile` updates name, username, locale, currency,
      timezone, and theme.
- [ ] Validate the body via Joi and return `400` for invalid input.
- [ ] Check for duplicate username (and email when it is ever changed) and
      return `409`.
- [ ] Return the updated user via a safe projection (no password).
- [ ] Keep email change as a separate re-verified flow.
- [ ] Add tests for update, validation, duplicate, and safe-projection paths.

### Technical Details

`PUT /user/profile` is currently a placeholder with its body commented out
(`user.controller.js:50-52`). Do not implement email change in this task.

### DOD

- [ ] Profile fields update successfully.
- [ ] Duplicate username/email returns `409`.
- [ ] Responses use safe projections.
- [ ] Tests pass.

### Dependencies

- Story `AUTH-S6` (#13).

### Additional Context

None.

### Related Issues / PRs

- Parent Story: #13
- Related: #27 (change password)
