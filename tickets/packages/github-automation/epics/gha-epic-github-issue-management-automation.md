### Feature Description

Establish a reusable, review-first GitHub issue automation capability for ExpenseTracker. A Python CLI will validate structured ticket packages, discover existing GitHub issues, preview proposed changes, and—only after explicit approval—create missing issues and establish native sub-issue relationships.

### Problem Statement

Epics, Stories, and Tasks are currently prepared as Markdown and manually copied into GitHub. Repeated manual entry creates overhead and risks duplicate tickets, incorrect parent-child relationships, and inconsistent traceability. Codex needs a safe, repeatable mechanism for synchronizing ticket packages without silently modifying GitHub.

### Proposed Solution

Implement a Python standard-library CLI inside the repository (`scripts/github_tickets.py`, with modular supporting code) and a versionable `tickets/` package format using `manifest.json` plus template-compatible Markdown files.

- `validate`: local-only structural and template validation.
- `plan`: read-only GitHub discovery and an auditable proposed action plan.
- `apply`: execute only an explicitly approved, plan-bound set of actions after checking for stale state.
- Support stable ticket IDs, mapping pre-existing manually created issues, native sub-issue links, safe reruns, and JSON/Markdown reports.
- Document the workflow in `AGENTS.md`, `tickets/README.md`, and the root README.

### Alternative Solutions

- Continue manually copying Markdown issues: simple but time-consuming and error-prone.
- Depend entirely on Codex's GitHub integration: less portable and harder to audit/re-run.
- Use GitHub CLI (`gh`) exclusively: not installed in the inspected environment; direct REST support is more portable.
- Use a hosted automation service: adds operational overhead for a local developer workflow.

### Impact

- [ ] Backend API
- [ ] Mobile App
- [ ] Both
- [x] Infrastructure / DevOps

### Acceptance Criteria

- [ ] A documented, reusable ticket package schema supports Epic → Story → Task hierarchy and preserves GitHub template Markdown.
- [ ] `validate`, `plan`, and `apply` commands work with Python 3.9+ without requiring `gh`.
- [ ] Existing issues are reliably detected by stable identifiers or explicit issue-number mappings; ambiguous matches fail safely.
- [ ] Planning performs no GitHub mutations; applying requires explicit approval bound to the reviewed plan and stale-state verification.
- [ ] Missing issues and supported native sub-issue relationships are created safely, with duplicate prevention and partial-failure recovery.
- [ ] Human-readable and machine-readable reports show created, skipped, linked, failed, and unresolved actions.
- [ ] Automated tests mock all GitHub interactions; no live issue mutations occur during development/testing.
- [ ] Developer documentation explains usage, authentication, security, approval, and limitations.
- [ ] Implementation is reviewed and merged through a dedicated PR, without unrelated application changes.

### Additional Context

Initial implementation is a one-time developer-tooling project, not a recurring service. Existing ExpenseTracker documentation tickets were created manually and must remain untouched unless explicitly authorized. The repository was inspected on `develop`; Python 3.9.6 is available and `gh` was not installed. Codex's proposed plan has been reviewed, but implementation and any live GitHub mutations require separate approval. No subscription, backend API, or mobile feature work is in scope.

### Related Issues / PRs

- Child Story: `#REPLACE_WITH_GHA-01_STORY_NUMBER`
- Implementation PR: To be linked.
