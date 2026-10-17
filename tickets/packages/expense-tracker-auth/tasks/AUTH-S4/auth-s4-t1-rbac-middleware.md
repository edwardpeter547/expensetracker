### Description

Add a minimal authorization seam (not a full RBAC matrix) so roles can be
introduced where a real consumer exists, while ownership stays the primary
control.

### Task List

- [ ] Keep `authenticate` as the token verifier that attaches a safe,
      projection-limited user.
- [ ] Add a minimal `authorize(...roles)` seam only where a real consumer
      exists.
- [ ] Do not seed or enforce `USER`/`ADMIN`/`MEMBER`/`VIEWER` role machinery.
- [ ] Document that `MEMBER`/`VIEWER` belong to the future household model and
      platform `ADMIN` is out of scope unless a real ops surface is introduced.
- [ ] Add tests for the minimal seam and ownership behavior.

### Technical Details

Ownership enforcement is the primary control; the role seam is a thin extension
point. Do not add a permission matrix or a `role` table migration in this task
unless a concrete consumer requires it.

### DOD

- [ ] `authenticate` still verifies the JWT and attaches a safe user.
- [ ] The minimal `authorize` seam exists and is tested.
- [ ] No premature role/permission matrix is introduced.
- [ ] Tests pass.

### Dependencies

- Story `AUTH-S4` (#11).

### Additional Context

See `docs/decisions/0001-authentication-and-authorization-architecture.md`
(Decision A).

### Related Issues / PRs

- Parent Story: #11
- Related: #23 (resource ownership)
