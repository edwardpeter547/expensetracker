### Description

Build a minimal, secure GitHub REST client and reconcile package tickets against existing GitHub issues, including manually created issues.

### Task List

- [ ] Implement authenticated GitHub REST requests using environment-provided `GITHUB_TOKEN` or `GH_TOKEN`.
- [ ] List all relevant issues with pagination, explicitly excluding pull requests.
- [ ] Detect stable hidden markers (`<!-- et-ticket-id: ... -->`) in issue bodies.
- [ ] Support explicit `issue_number` mapping for previously created issues without altering their bodies.
- [ ] Detect duplicate markers, conflicting mappings, wrong repository targets, and ambiguous matches; never match on title alone.
- [ ] Handle API errors, rate limits, retries, and token redaction; add mocked HTTP/client tests.

### Technical Details

Use `urllib.request` or equivalent standard-library HTTP code. Manifest `repo` is the primary target; require explicit validation of `--repo` overrides. Existing issues may be open or closed. Avoid logging credentials or entire sensitive API responses.

### DOD

- [ ] All issue pages are scanned before declaring an ID missing.
- [ ] Existing mapped issues are identified without mutation.
- [ ] Duplicate/ambiguous mappings fail safely.
- [ ] HTTP/auth/rate-limit behavior is covered by mocks.
- [ ] No live GitHub mutations occur.

### Dependencies

GHA-01-T01.

### Additional Context

This Task belongs to the single GitHub Issue Management Automation Story. Use a dedicated feature branch and mocked tests. Codex must not commit, push, open a PR, or make live GitHub mutations without separate approval.

### Related Issues / PRs

- Parent Story: `#REPLACE_WITH_GHA-01_STORY_NUMBER`
- Parent Epic: `#REPLACE_WITH_GHA_EPIC_NUMBER`
- Related Task ID: `GHA-01-T02`
- Implementation PR: To be linked.
