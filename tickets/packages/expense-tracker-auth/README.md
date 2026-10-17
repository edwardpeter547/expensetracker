# ExpenseTracker — Epic #7 Authentication and Authorization Tickets

This package is the **read-only publication preview** for refining GitHub Epic
#7 and its existing children. It maps the verified GitHub issue tree
(#7–#28) to stable package identifiers and adds the six missing tasks retained
by the architecture review. Nothing here has been published to GitHub.

## Contents

- 1 Epic (`AUTH-EPIC`, #7) — body is the proposed replacement from
  `tickets/reviews/epic-7-proposed.md`.
- 6 Stories (`AUTH-S1`..`AUTH-S6`, #8–#13) — refined bodies.
- 15 existing Tasks (#14–#28) — refined bodies where the roadmap requires an
  amendment; #17 is retained unchanged.
- 6 new Tasks (`issue_number: null`) — the gaps confirmed by the review:
  `AUTH-S2-T3` (provider-neutral identity), `AUTH-S1-T5` (email verification),
  `AUTH-S5-T5` (sensitive-data exposure), `AUTH-S1-T6` (integration tests),
  `AUTH-S1-T7` (JWT validation/token versioning), `AUTH-S1-T8` (device/session
  management).

## Important safety notes

- `manifest.json` maps existing issues by `issue_number` so reconciliation marks
  them `EXISTS`; it does **not** authorize editing their bodies. Body updates
  for #7–#28 are a separately authorized GitHub operation outside this tool.
- The six new tasks carry `issue_number: null`. They become `CREATE` actions
  only after a human-reviewed `plan` that passes `--allow-create`, and only a
  separately authorized `apply` may create them.
- `DECISION-DELETION-POLICY` is a documented prerequisite for `AUTH-S6-T3`
  (#28), **not** a ticket in this package.
- Labels in the manifest are canonical template labels. The tool never modifies
  labels on existing issues; live labels (e.g. `Development`, `QA` on tasks)
  remain untouched on GitHub.

## Validation

```bash
python3 scripts/github_tickets.py validate \
  --manifest tickets/packages/expense-tracker-auth/manifest.json
```

`validate` is fully offline. Do **not** run `plan` or `apply` from this preview;
`plan` needs read-only GitHub discovery and `apply` is the only mutating
command.

## Proposed publication order

1. Human review and approval of the Epic #7 replacement body.
2. Human review and approval of each existing-issue amendment (#8–#28).
3. Read-only `plan` against this manifest; review the plan hash.
4. Separate approval for `--allow-create`; then a separately authorized
   `apply`.

See `tickets/reviews/epic-7-publication/` for the full preview artifacts.
