### Description

Implement the approved `apply` workflow to create missing GitHub issues in hierarchy order and attach native parent-child relationships, without overwriting existing tickets.

### Task List

- [ ] Implement approved plan execution in Epic → Story → Task order.
- [ ] Reconcile GitHub state immediately before issue creation and after ambiguous API failures.
- [ ] Create issues with exact Markdown bodies plus stable invisible ID markers.
- [ ] Resolve internal IDs to GitHub issue numbers and attach supported native sub-issue links.
- [ ] Check for existing links before attempting to attach children; handle partial failures and safe reruns.
- [ ] Never modify existing issue bodies, labels, statuses, or close issues without an explicit approved action.
- [ ] Report unsupported sub-issue API behavior clearly; add mocked executor tests.

### Technical Details

Verify current GitHub REST sub-issue endpoints and payloads before implementing. Preserve template Markdown exactly apart from the deliberate stable marker. Enforce the reviewed plan's repository, approval, and staleness checks. Avoid assuming a successful mutation after a timeout.

### DOD

- [ ] Missing issues are created only under an approved valid plan.
- [ ] Existing issues are skipped, not overwritten.
- [ ] Parent-child links are established where supported and verified.
- [ ] Partial failures can be reconciled without blind duplicate creation.
- [ ] All execution paths are tested with mocked GitHub responses; no live apply is run.

### Dependencies

GHA-01-T01, GHA-01-T02, and GHA-01-T03.

### Additional Context

This Task belongs to the single GitHub Issue Management Automation Story. Use a dedicated feature branch and mocked tests. Codex must not commit, push, open a PR, or make live GitHub mutations without separate approval.

### Related Issues / PRs

- Parent Story: `#REPLACE_WITH_GHA-01_STORY_NUMBER`
- Parent Epic: `#REPLACE_WITH_GHA_EPIC_NUMBER`
- Related Task ID: `GHA-01-T04`
- Implementation PR: To be linked.
