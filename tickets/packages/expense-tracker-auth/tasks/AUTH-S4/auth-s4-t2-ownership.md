### Description

Enforce owner-scoped access across transactions, budgets, and categories and fix
the broken single-record read/update paths.

### Task List

- [ ] Scope `getTransactionById` by `userId` (fix the IDOR read).
- [ ] Preserve the valid atomic `where: {id, userId}` extended-unique form for
      transaction and budget single-record mutations.
- [ ] Replace category check-then-act by bare `id` with the atomic
      `where: {id, userId}` form.
- [ ] Fix `GET /budgets/:id` (undefined `getBugetRecord` typo), `GET
      /categories/:id` (unawaited Promise), and `PUT /categories` (missing
      `:id` route parameter).
- [ ] Return `404` for non-existent and non-owned resources.
- [ ] Add cross-user denial tests for transactions, budgets, and categories.

### Technical Details

Under the installed Prisma 7.9.1 client, `where: {id, userId}` on
`update`/`delete`/`findUnique` is a valid extended `WhereUniqueInput` that
atomically constrains the mutation to the owner. Use `updateMany`/`deleteMany`
only where an explicit affected-row count is needed, or a
`prisma.$transaction` for richer checks.

### DOD

- [ ] Users cannot read, update, or delete another user's transaction, budget,
      or category.
- [ ] Single-record reads/updates/deletes are owner-constrained and atomic.
- [ ] The budget/category read and route bugs are fixed.
- [ ] Cross-user denial tests pass.

### Dependencies

- Story `AUTH-S4` (#11).

### Additional Context

This is the critical "broken object-level authorization" audit finding.

### Related Issues / PRs

- Parent Story: #11
- Related: #22 (authorization seam), `AUTH-S1-T6` (integration tests)
