# Infrastructure roadmap alignment — ticket package

Contains **one new Task**, `INFRA-DOC-01`, with **direct parent existing Epic #29**. There is **no Story** in this package.

The Epic entry is a reconciliation placeholder with `issue_number: 29`; the CLI must not create or modify Epic #29. The new Task has `parent: "INFRA-EPIC-29"`, so the CLI can establish a native GitHub sub-issue relationship directly to #29.

Extract this ZIP at the repository root and use the existing CLI's review-first workflow:

```bash
python3 scripts/github_tickets.py validate --manifest tickets/packages/infrastructure-roadmap-alignment/manifest.json
python3 scripts/github_tickets.py plan --manifest tickets/packages/infrastructure-roadmap-alignment/manifest.json
```

Review the plan, then run the CLI's separately approved apply command using the exact options required by your installed version. **Do not apply automatically.**

After creation, use the new issue number for the documentation branch and PR (`Closes #<number>`). Do not close Epic #29.
