### Story Description

Complete user account management: profile update, password change, and account
deletion, with email verification already implemented but hardened separately.

### Problem Statement

Profile update is a placeholder, change-password-with-current-password is
unimplemented, account deletion is unimplemented and has no retention policy,
and the existing email-verification flow leaks the password hash in several
responses.

### Proposed Solution

- Profile update: name, username, locale, currency, timezone, and theme via a
  safe projection; email change is a separate re-verified flow.
- Change password: require the current password, check password history, and
  revoke other sessions.
- Account deletion: implement only after the data-retention and deletion policy
  is approved (`DECISION-DELETION-POLICY`), with confirmation, reauthentication,
  immediate access revocation, and the policy's soft/hard-delete and retention
  rules.
- Email verification hardening is tracked separately (`AUTH-S1-T5`).

### Alternative Solutions

- Account deactivation instead of deletion: noted as a possible policy option,
  not a substitute for a real deletion workflow.
- Hard delete without a retention policy: rejected; retention and
  anonymization require product and legal decisions first.

### Impact

- [x] Backend API
- [x] Mobile App
- [ ] Both
- [ ] Infrastructure / DevOps

### Acceptance Criteria

- [ ] Users can update their profile with safe projections and duplicate
      username/email handling; email change is separately verified.
- [ ] Users can change their password with current-password verification,
      password-history checks, and revocation of other sessions.
- [ ] Account deletion is implemented against an approved retention/deletion
      policy with confirmation, reauthentication, and session revocation.
- [ ] Unit and integration tests cover all account-management flows.

### Additional Context

Deletion is gated on `DECISION-DELETION-POLICY` (product decision plus legal
review). Security, privacy, export, and deletion are never premium-gated.

### Related Issues / PRs

- Parent Epic: #7
- Tasks: #26 (Profile Update), #27 (Change Password), #28 (Account Deletion)
- Prerequisite: `DECISION-DELETION-POLICY` (not a ticket)
