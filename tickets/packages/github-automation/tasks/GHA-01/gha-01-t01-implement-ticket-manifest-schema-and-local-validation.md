### Description

Implement the reusable ticket-package manifest models and the local-only `validate` CLI command. This Task establishes the input contract for all subsequent automation.

### Task List

- [ ] Create the Python 3.9-compatible package structure and thin `scripts/github_tickets.py` entrypoint.
- [ ] Define versioned `manifest.json` schema and typed models for ticket IDs, types, titles, Markdown paths, parent, dependencies, labels, related IDs, and optional existing issue numbers.
- [ ] Validate required fields, unique IDs, paths, supported ticket types, parent type constraints, cycles, and reference integrity.
- [ ] Validate required issue-template headings without rewriting user Markdown; reject path traversal and unsafe paths.
- [ ] Add isolated `unittest` cases for valid and invalid manifests.

### Technical Details

Use Python standard library (`argparse`, `json`, `dataclasses`, `pathlib`). The package schema must support multiple independent ticket bundles; `repo` is authoritative. Template mappings: Epic → `feature_request.md`, Story → `story.md`, Task → `task.md`. No GitHub access in `validate`.

### DOD

- [ ] `python scripts/github_tickets.py validate --manifest ...` works without credentials or network.
- [ ] Invalid packages produce actionable errors and nonzero exit codes.
- [ ] Tests cover duplicate IDs, broken references, cycles, invalid paths, and template structure.
- [ ] No application code or live GitHub issues are changed.

### Dependencies

None; foundational Task.

### Additional Context

This Task belongs to the single GitHub Issue Management Automation Story. Use a dedicated feature branch and mocked tests. Codex must not commit, push, open a PR, or make live GitHub mutations without separate approval.

### Related Issues / PRs

- Parent Story: `#REPLACE_WITH_GHA-01_STORY_NUMBER`
- Parent Epic: `#REPLACE_WITH_GHA_EPIC_NUMBER`
- Related Task ID: `GHA-01-T01`
- Implementation PR: To be linked.
