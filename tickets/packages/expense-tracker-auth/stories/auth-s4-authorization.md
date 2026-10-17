### Story Description

Enforce ownership-based authorization for the single-user system and keep a
minimal role seam for future household/tenant roles.

### Problem Statement

There is no role/permission model and, critically, one single-record read
(`getTransactionById`) is not owner-scoped, while category mutations use a
non-atomic check-then-act pattern. The original story specified `ADMIN`,
`MEMBER`, and `VIEWER` roles with a permission matrix for a tenant model that
does not exist yet.

### Proposed Solution

- Make object-level authorization the primary control: every single-record
  read, update, and delete is constrained by the caller's `userId` and returns
  `404` on mismatch; list endpoints are owner-scoped.
- Preserve atomic owner-scoped single-record mutations using Prisma's extended
  `WhereUniqueInput` form `where: {id, userId}`, or a
  `prisma.$transaction` fetch-then-authorize-then-mutate where richer checks are
  needed. Never mutate by a bare `id`.
- Add a minimal `authorize(...roles)` seam only where a real consumer exists.
  Defer `MEMBER`/`VIEWER` and the permission matrix to the future household
  epic; platform `ADMIN` stays out of scope unless a real ops surface exists.

### Alternative Solutions

- Full RBAC/permission matrix now: rejected as unjustified complexity before a
  household or admin surface exists.
- Claims/policy-based access: deferred for the same reason.

### Impact

- [x] Backend API
- [ ] Mobile App
- [ ] Both
- [ ] Infrastructure / DevOps

### Acceptance Criteria

- [ ] Every financial resource is accessible only to its authorized owner;
      cross-user access returns `404` and is covered by denial tests.
- [ ] Single-record reads, updates, and deletes are owner-constrained and
      atomic (including the fixed `GET /budgets/:id`, `GET /categories/:id`,
      and `PUT /categories/:id` paths).
- [ ] The minimal `authorize` seam is present only where it has a real
      consumer; the permission matrix is deferred.

### Additional Context

Ownership enforcement is independent of subscription status; security is never
premium-gated. See `docs/decisions/0001-authentication-and-authorization-architecture.md`.

### Related Issues / PRs

- Parent Epic: #7
- Tasks: #22 (authorization middleware seam), #23 (resource ownership
  enforcement)
- Deferred: household tenancy and roles (future epic)
