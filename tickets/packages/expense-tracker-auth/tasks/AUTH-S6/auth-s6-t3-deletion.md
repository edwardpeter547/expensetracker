### Description

Implement account deletion only after the data-retention and deletion policy is
approved, with confirmation, reauthentication, and access revocation.

### Task List

- [ ] Block implementation until `DECISION-DELETION-POLICY` is approved.
- [ ] Require explicit confirmation and reauthentication.
- [ ] Revoke access immediately (all refresh tokens and the current session).
- [ ] Apply the approved soft-delete/hard-delete, retention, and anonymization
      rules to financial records.
- [ ] Implement UK GDPR-aligned export and deletion-request workflows.
- [ ] Add tests against the approved policy.

### Technical Details

This task must not invent final retention periods. Product decision plus legal
review are prerequisites; engineering contributes feasibility options only.

### DOD

- [ ] Deletion is gated on the approved retention/deletion policy.
- [ ] Confirmation, reauthentication, and immediate revocation are implemented.
- [ ] Retention/anonymization follow the approved policy.
- [ ] Tests pass.

### Dependencies

- `DECISION-DELETION-POLICY` (documented prerequisite; not a ticket).

### Additional Context

See `docs/decisions/0001-authentication-and-authorization-architecture.md`
(Decision E).

### Related Issues / PRs

- Parent Story: #13
- Related: #16 (session revocation)
