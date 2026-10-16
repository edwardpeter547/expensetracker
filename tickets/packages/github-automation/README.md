# ExpenseTracker — GitHub Issue Management Automation Tickets

This package contains **1 Epic, 1 Story, and 6 Tasks**. Each `.md` file contains the **GitHub issue body only**, matching the corresponding repository issue template headings. Use the issue **title** and **labels** in `manifest.json` when creating issues.

## Manual creation order

1. Create the Epic from `epics/` using the Feature Request template.
2. Create the Story from `stories/` using the Story template and attach it as an Epic sub-issue.
3. Create the six Tasks from `tasks/GHA-01/` using the Task template and attach them to the Story.
4. Replace `#REPLACE_WITH_...` references in issue bodies with actual GitHub issue numbers.
5. Link the eventual feature PR to the six Tasks; keep the Story and Epic open until their acceptance criteria are met.

The package's `manifest.json` is **proposed input for the future CLI**. It is not executable by an existing script yet. Set `issue_number` for issues created manually when you later test reconciliation. No GitHub actions have been performed by generating this package.
