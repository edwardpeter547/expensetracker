# GitHub Ticket Automation

This directory contains version-controlled ticket packages and documents the
`validate → plan → human review → hash-bound approval → separately authorized apply`
workflow for synchronizing them with GitHub.

- Code lives in `scripts/github_tickets/` (entrypoint `scripts/github_tickets.py`).
- Approved ticket packages live under `tickets/packages/<package-name>/`.
- Generated plans, reports, and other artifacts belong in the Git-ignored
  `tickets/.generated/` directory.

## Package structure

```text
tickets/packages/<package-name>/
├── manifest.json
├── README.md
├── epics/
├── stories/
└── tasks/
```

`manifest.json` is the package input contract. Each entry declares:

- `id` — a stable, package-unique ticket identifier (letters, digits, `.`, `_`, `/`, `-`).
- `type` — one of `epic`, `story`, or `task`.
- `title` — the GitHub issue title.
- `body` — a relative path to the Markdown body file.
- `parent` — the parent ticket id (Epic → Story → Task).
- `labels`, `depends_on`, `related` — metadata used by validation and planning.
- `issue_number` — an explicit mapping to an existing GitHub issue, when one
  exists. Leave `null` for tickets not yet reconciled.

## Validation requirements

`validate` checks, offline and without credentials:

- Required fields, unique ids, supported types.
- Parent type rules (Epic has no parent; Story under Epic; Task under Story).
- Reference integrity, cycles, body-file existence, and safe paths (no
  traversal, absolute paths, or symlinks).
- Required Markdown headings from `.github/ISSUE_TEMPLATE/` for each type.

Markdown bodies are never rewritten by the tool.

## Repository targeting and authentication

- `manifest.repo` (`owner/repo`) is authoritative.
- `plan` accepts `--repo OWNER/REPO` only as an explicit override that must
  match `manifest.repo`; a mismatch is rejected.
- Authentication is read from `GITHUB_TOKEN` or `GH_TOKEN`. The token is never
  logged, stored in the repository, or written into reports.
- Live mutations require a token with Issues write permission; read-only
  discovery and planning only need Issues read permission.

## Commands (Python 3.9+, standard library)

All examples run from the repository root and are safe by default.

```bash
# Offline package validation (no GitHub access).
python3 scripts/github_tickets.py validate \
  --manifest tickets/packages/github-automation/manifest.json

# Read-only reconciliation. Prints actions and a plan hash.
python3 scripts/github_tickets.py plan \
  --manifest tickets/packages/github-automation/manifest.json

# Read-only reconciliation that authorizes safe issue creation in the plan.
# The permission is bound into the plan hash; apply must also pass the flag.
python3 scripts/github_tickets.py plan \
  --manifest tickets/packages/github-automation/manifest.json \
  --allow-create

# Verify approval against the exact plan hash (read-only).
python3 scripts/github_tickets.py plan \
  --manifest tickets/packages/github-automation/manifest.json \
  --approve "$APPROVED_PLAN_HASH"

# Write a deterministic plan artifact.
python3 scripts/github_tickets.py plan \
  --manifest tickets/packages/github-automation/manifest.json \
  --output tickets/.generated/plan.json

# Preflight execution without mutating GitHub.
python3 scripts/github_tickets.py apply \
  --manifest tickets/packages/github-automation/manifest.json \
  --approve "$APPROVED_PLAN_HASH" \
  --dry-run

# Preflight a creation plan without mutating GitHub. Dry-run does not perform
# live per-issue absence revalidation or GraphQL parent checks.
python3 scripts/github_tickets.py apply \
  --manifest tickets/packages/github-automation/manifest.json \
  --approve "$APPROVED_PLAN_HASH" \
  --allow-create \
  --dry-run

# Controlled execution (only with explicit human authorization).
python3 scripts/github_tickets.py apply \
  --manifest tickets/packages/github-automation/manifest.json \
  --approve "$APPROVED_PLAN_HASH"

# Controlled creation (requires both the reviewed plan hash and the explicit
# --allow-create permission that was used to generate that hash).
python3 scripts/github_tickets.py apply \
  --manifest tickets/packages/github-automation/manifest.json \
  --approve "$APPROVED_PLAN_HASH" \
  --allow-create
```

Reports are written with `--report-dir` (recommended: `tickets/.generated`):

```bash
python3 scripts/github_tickets.py plan \
  --manifest tickets/packages/github-automation/manifest.json \
  --report-dir tickets/.generated
```

This writes `<prefix>-report.json` and `<prefix>-report.md` for `validate`,
`plan`, `apply-dry-run`, and `apply`. Existing files are never overwritten.

## Plan hashes and stale approvals

- `plan` computes a deterministic SHA-256 hash over safety-relevant plan data:
  repository, ticket definitions (including Markdown body fingerprints),
  actions, verified issue identities, conflicts, ambiguities, and relationship
  operations.
- Approval is bound to the exact hash. A changed manifest, changed issue
  identity/state, or changed relationship invalidates the hash.

Set the hash from a previously reviewed plan, never by extracting and
approving a fresh hash without human review:

```bash
APPROVED_PLAN_HASH="<paste the reviewed plan hash here>"
```
- `apply` regenerates the plan from current GitHub state and rejects execution
  when the hash differs. Re-run `plan` and obtain fresh approval after any
  relevant change.

## Action classifications

- `EXISTS` — a GitHub issue was positively identified and verified.
- `CREATE` — emitted only when planning ran with `--allow-create`, no existing
  issue carries the ticket's stable body marker, and no plausible existing
  title candidate exists. The same explicit permission is required again at
  apply time.
- `REVIEW_REQUIRED` — identity could not be verified; manual reconciliation is
  required (for example, by setting `issue_number` in `manifest.json`).
- `BLOCKED` — a conflict, pull-request reference, repository mismatch, or
  invalid issue number prevents safe execution.

## Native sub-issue linking

- Parent relationships are proposed for verified `EXISTS` issues.
- Parent relationships are also proposed for planned `CREATE` issues; their
  issue numbers are resolved after creation, parents first.
- Parent lookup uses a read-only GraphQL query for the authoritative
  `Issue.parent` field; a `null` parent means the child is parentless. This
  query runs during execution relationship preflight (not during planning).
- A child already linked to the intended parent is skipped.
- A child linked to a different parent blocks execution; it is never reparented.
- Ambiguous, permission, or unexpected API responses stop execution with no
  mutation.
- Linking uses `POST /repos/{owner}/{repo}/issues/{parent}/sub_issues` with the
  child's global issue `id`. Unsupported-feature responses are reported, not
  silently substituted.

## Read-only vs live mutations

- `validate` is entirely offline.
- `plan` performs read-only GitHub REST discovery (list issues, fetch issues);
  it makes no GraphQL calls and no mutations.
- `apply` preflight verifies the plan and, before linking, runs a read-only
  GraphQL `Issue.parent` query. GraphQL is sent over HTTP POST but performs no
  mutation.
- `apply` (without `--dry-run`) performs live GitHub mutations: creating
  authorized missing issues and linking sub-issues. Creation requires the full
  approved hash plus the same explicit `--allow-create` permission used during
  planning.

## Partial failures and reruns

- Execution stops on the first uncertain result and reports `PARTIAL` or
  `FAILED`; unrelated children are not linked.
- Reruns rediscover current GitHub state, skip existing links, and never create
  duplicate links or duplicate issues.
- Immediately before each creation the executor re-lists issues and checks for
  the ticket's marker again, so a concurrent or previous run cannot produce a
  duplicate. An ambiguous creation response (timeout, 5xx, rate limit, or
  malformed response) is reconciled with a read-only lookup before any further
  mutation; it is never blindly retried.
- An issue found during that pre-create revalidation is reused only when its
  repository, stable marker specification, and title all match. Any mismatch
  stops execution with an actionable diagnostic; existing issues are never
  overwritten or repaired.

## Troubleshooting

- `REVIEW_REQUIRED` — populate the missing `issue_number` in `manifest.json`
  (after confirming the issue number on GitHub), then re-run `plan`.
- `BLOCKED` — resolve the conflict or repository mismatch, then re-plan.
- `plan hash ... does not match` — re-run `plan`, review, and obtain a fresh
  approval hash.
- Rate-limit or network errors — retry; read-only requests have bounded retries.

GitHub remains the source of truth for issue status, comments, assignments,
and live relationships. This tool does not synchronize those back into the
repository.
