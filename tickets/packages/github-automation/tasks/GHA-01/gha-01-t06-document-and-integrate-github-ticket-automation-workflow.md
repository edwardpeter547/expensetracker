### Description

Make the new issue automation discoverable and repeatable for contributors and Codex through repository documentation.

### Task List

- [ ] Create `tickets/README.md` with package structure, manifest schema, sample commands, and safety guidance.
- [ ] Update `AGENTS.md` to direct Codex to the CLI and require validate → plan → human approval → apply.
- [ ] Add a concise navigation link to the root `README.md`.
- [ ] Document token permissions, repository targeting, stable IDs, existing-issue mappings, and approval requirements.
- [ ] Explain reports, troubleshooting, partial retries, and unsupported GitHub sub-issue behavior.
- [ ] Verify examples on Python 3.9-compatible CLI and check internal Markdown links.

### Technical Details

Expected paths: `scripts/github_tickets.py`, `tickets/README.md`, `AGENTS.md`, `README.md`. Use the existing repository documentation style. Do not suggest Codex may execute a live `apply` without explicit authorization.

### DOD

- [ ] Instructions accurately match implemented commands and flags.
- [ ] AGENTS.md makes the review-first approval gate unambiguous.
- [ ] Examples and links are checked.
- [ ] No unrelated documentation is rewritten.
- [ ] Changes are reviewed and ready for the dedicated feature PR.

### Dependencies

GHA-01-T01 through GHA-01-T05.

### Additional Context

This Task belongs to the single GitHub Issue Management Automation Story. Use a dedicated feature branch and mocked tests. Codex must not commit, push, open a PR, or make live GitHub mutations without separate approval.

### Related Issues / PRs

- Parent Story: `#REPLACE_WITH_GHA-01_STORY_NUMBER`
- Parent Epic: `#REPLACE_WITH_GHA_EPIC_NUMBER`
- Related Task ID: `GHA-01-T06`
- Implementation PR: To be linked.
