### Description

Implement persistent, secret-safe authentication audit events.

### Task List

- [ ] Define a persistent audit-event store (model and migration).
- [ ] Log successful/failed login, account creation, logout, password reset,
      and authorization failures.
- [ ] Include event, user id (when authenticated), IP, timestamp, and request
      correlation id.
- [ ] Remove `console.log` calls that print tokens, codes, or full objects.
- [ ] Ensure no password, token, or reset code is ever logged.
- [ ] Add tests verifying events are written and secrets are absent.

### Technical Details

Use structured JSON logging (Winston). Audit events must be persistent and
secret-safe; do not store raw financial payloads.

### DOD

- [ ] Auth events are written to a persistent store.
- [ ] No secrets appear in logs or audit records.
- [ ] Suspicious patterns (repeated failures) are represented.
- [ ] Tests pass.

### Dependencies

- Story `AUTH-S5` (#12).

### Additional Context

The mobile `AuthContext.tsx:34` access-token log is out of this backend task but
should be fixed in the corresponding mobile work.

### Related Issues / PRs

- Parent Story: #12
- Related: #24 (API security), `AUTH-S5-T5` (sensitive-data exposure)
