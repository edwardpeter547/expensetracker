# Application Foundation Improvement — Ticket Package

## Existing parent Epic

Epic #29 — **Project Infrastructure Development** is included **only as a manifest reconciliation entry** with `issue_number: 29`. It must **not** be created again, and this package does not authorize modifying the existing Epic body.

## New tickets

- `AFI-01`: [STORY] Application Foundation Improvement, child of `AFI-EPIC-29`
- `AFI-01-T01`: Migrate developer workflows from Makefile to Go Task
- `AFI-01-T02`: Improve Expo mobile-to-backend connectivity and session handling
- `AFI-01-T03`: Implement multilingual and multi-currency financial foundations

All three tasks are children of `AFI-01`. Link them to the same PR.

## Usage

Extract at repository root to produce `planning/application-foundation-improvements/`.

```bash
python3 scripts/github_tickets.py validate --manifest planning/application-foundation-improvements/manifest.json
```

Then follow the project's normal `plan` → review → separately approved `apply` workflow. Review the plan to confirm Epic #29 is classified as **EXISTS**, not CREATE, and that no update to Epic #29 is proposed.

This package records previously implemented changes. Verify acceptance criteria against the final PR before closing tickets.
