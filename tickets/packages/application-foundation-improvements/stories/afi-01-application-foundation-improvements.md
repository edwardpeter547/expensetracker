### Story Description

As an product developer, I want reliable project commands, robust mobile-to-backend connectivity, and correct internationalized financial foundations so that future product development starts from a stable application baseline.

This is a retrospective improvements story for changes already implemented on `develop`, intended to be covered by one pull request.

### Problem Statement

Make-based workflows were inconsistent with the desired development experience, Expo connectivity relied on manual IP configuration, and existing implementation defects affected authentication integration, localization, and financial correctness.

### Proposed Solution

Organize completed improvement work into three child tasks:

1. Replace Makefile workflows with Go Task.
2. Improve environment-aware mobile/backend API connectivity and session handling.
3. Fix localization, currency, monetary precision, category relationships, and budget integrity.

Do not implement new product functionality or the Settings UI.

### Alternative Solutions

One broad task would obscure independently reviewable work; separate PRs are unnecessary for this retrospective change set.

### Impact

- [x] Backend API
- [x] Mobile App
- [x] Both
- [x] Infrastructure / DevOps

### Acceptance Criteria

- [ ] Go Task replaces required Make-based workflows.
- [ ] Supported mobile development does not require manual IP entry.
- [ ] Device language and default currency are detected independently.
- [ ] Financial values use exact Decimal handling and currency-aware calculations.
- [ ] Category ownership and relationships are enforced.
- [ ] Development migration is applied; test results and limitations are recorded.
- [ ] All three child tasks are associated with one PR.

### Additional Context

Existing Epic #29 is the intended parent; attach this story to #29 after ticket creation. Historical development DB was empty before migration. The Decimal/currency/category migration was reported applied by the developer after fixing PostgreSQL numeric casting; full real-database integration verification has not been independently established. Do not claim it passed unless recorded.

### Related Issues / PRs

- Parent Epic: #29
- Child tasks: AFI-01-T01, AFI-01-T02, AFI-01-T03
- Link all three tasks to the same improvement PR.
