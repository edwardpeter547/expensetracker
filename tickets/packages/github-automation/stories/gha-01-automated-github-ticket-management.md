### Story Description

As an ExpenseTracker developer, I want a safe, repeatable CLI that validates ticket packages, identifies existing GitHub issues, previews actions, and creates approved missing issues with the correct hierarchy, so that I can manage tickets efficiently without duplicates or unintended changes.

### Problem Statement

Manual creation of template-based Epics, Stories, and Tasks is slow and difficult to reproduce. The repository lacks a standard package schema, GitHub reconciliation logic, approval gate, and execution report.

### Proposed Solution

Deliver the capability through six focused implementation Tasks:

1. Define manifest models and local validation.
2. Build a GitHub REST client and discover existing issues.
3. Generate read-only plans and enforce plan-bound approval.
4. Create missing issues and synchronize native sub-issue relationships safely.
5. Produce execution reports and comprehensive mocked tests.
6. Integrate the workflow into developer documentation.

Use Python 3.9-compatible standard-library code. Preserve GitHub issue template headings and body formatting. Never mutate real GitHub issues during implementation or testing.

### Alternative Solutions

- Manual issue entry from generated ZIP packages.
- One-off scripts for each ticket package.
- A GitHub CLI-only implementation (not portable to the inspected environment).

### Impact

- [ ] Backend API
- [ ] Mobile App
- [ ] Both
- [x] Infrastructure / DevOps

### Acceptance Criteria

- [ ] A package containing `manifest.json` and Markdown tickets can be validated locally, including unique IDs, file paths, hierarchy, and cycles.
- [ ] GitHub discovery supports full pagination, excludes PRs, and reconciles existing manually created issues via explicit issue-number mappings.
- [ ] `plan` produces a read-only, human-reviewable list of creates, skips, links, and conflicts.
- [ ] `apply` requires explicit approval of the exact plan, rechecks relevant GitHub state, and refuses stale or conflicting plans.
- [ ] Creation and linking are ordered, safely retryable, and never overwrite or close existing issues implicitly.
- [ ] Reports contain issue URLs/numbers, completed actions, skips, warnings, and failures.
- [ ] Mocked tests cover success, failure, ambiguity, approval, staleness, and retries; no live mutations occur in tests.
- [ ] `AGENTS.md`, `tickets/README.md`, and root README document usage and review-first expectations.
- [ ] All six Tasks are completed, code is reviewed, and the feature PR is merged.

### Additional Context

Implementation should follow the reviewed Codex architecture, with these refinements: plan-hash-bound approval, explicit mapping of legacy issues, robust pagination and PR exclusion, reconciliation after ambiguous failures, and generated output ignored by Git by default. The manifest's `repo` field should be authoritative; any CLI override must be explicitly validated. Do not run a live `apply` without separate authorization.

### Related Issues / PRs

- Parent Epic: `#REPLACE_WITH_GHA_EPIC_NUMBER`
- Child Tasks: GHA-01-T01 through GHA-01-T06 (add actual GitHub sub-issues after creation).
- Implementation PR: To be linked.
