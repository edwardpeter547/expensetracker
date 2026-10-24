### Description

Replace legacy Makefile-based project commands with a consistent Go Task development workflow.

### Task List

- [ ] Introduce Taskfile commands for backend/mobile checks and local development.
- [ ] Standardize PostgreSQL lifecycle commands including `task db:status`.
- [ ] Add Prisma validation, migration and deploy tasks using the migration role and finalize-dev workflow.
- [ ] Integrate environment and documentation validation.
- [ ] Update developer-facing command references and documentation.

### Technical Details

Use the repository's Taskfile as the supported command entry point. Relevant commands include `task check`, `task mobile:check`, `task prisma:validate`, `task prisma:deploy`, `task env:validate`, `task docs:validate`, and `task docs:test`. Avoid introducing duplicate manual Prisma workflows.

### DOD

- [ ] Taskfile commands replace required Makefile usage.
- [ ] Database and validation workflows execute as documented.
- [ ] No credentials or machine-specific paths are committed.
- [ ] Results are captured in the improvements PR.

### Dependencies

Parent story AFI-01.

### Additional Context

Retrospective task covering existing changes; verify the actual repository diff before checking completion.

### Related Issues / PRs

- Parent Epic: #29
- Parent Story: AFI-01
- Same improvements PR as AFI-01-T02 and AFI-01-T03.
