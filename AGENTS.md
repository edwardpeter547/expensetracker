# ExpenseTracker — Agent Instructions

## What this is
ExpenseTracker is a personal finance app with an Expo/React Native mobile client and a Node.js/Express API. It tracks income and expenses, supports categories and budgets, and includes email-based registration/verification and password reset.

## Repo layout
This is a **two-package monorepo orchestrated by Go Task** — it is **not** an npm workspace. Each package has its own `package.json`, `package-lock.json`, and `node_modules`.

- `src/backend/` — Express API (`"type": "module"`, plain JavaScript with JSDoc, not TypeScript).
- `src/mobile/` — Expo app (SDK 57) using TypeScript and `expo-router` file-based routing.
- `Taskfile.yml` — entry point for developer commands (orchestration lives under `build/`).
- `.github/` — issue templates only (no CI workflows yet).
- `docs/` — architecture and engineering guidance written during Phase 0.

## Stack
- **Backend:** Node.js, Express 5, Prisma 7 with `@prisma/adapter-pg` (PostgreSQL), Joi validation, JWT auth, `winston` logging, `i18n` localization, `nodemailer` + Handlebars email templates.
- **Mobile:** Expo SDK 57, React Native 0.86, React 19, `expo-router`, React Navigation 7 (tabs), Axios, `expo-secure-store` (tokens), AsyncStorage (theme), TypeScript.

## Local PostgreSQL database
Development uses a persistent local PostgreSQL 16 instance in Docker (Docker CLI
only — no Docker Compose yet). The container is `expensetracker-postgres`
(image `postgres:16-alpine`), its data lives in the named volume
`expensetracker-postgres-data`, and it binds only to `127.0.0.1:5432`.

- `expensetracker_dev` — persistent development database; never used for tests.
- `expensetracker_app` — runtime role (login only; no SUPERUSER, no CREATEDB).
- `expensetracker_migrate` — migration role (owns the schema; may create
  Prisma shadow databases for `migrate dev`).
- Integration tests use a separate administrative role and their own disposable
  databases; they never touch `expensetracker_dev`.

Environment files live in `src/backend/src/environment/`:
- `dev.env` (from `dev.env.example`) — runtime `DATABASE_URL` plus the
  provisioning and migration-role credentials.
- `integration.env` (from `integration.env.example`) — the container/administrative
  credentials shared by `task db:up` and the integration harness.

Workflows:
- One-time setup: `task db:up`, `task db:create-dev`, `task prisma:deploy`.
- Daily: `task db:up`, `task backend:dev`.
- Migrations: `task prisma:migrate -- --name <name>` (create/apply),
  `task prisma:deploy` (apply committed migrations only),
  `task prisma:status` (inspect state).
- Never point integration tests at `expensetracker_dev` or any remote database.

## Where code belongs
- **Backend:** routes in `src/backend/src/routes/v1`, controllers in `src/backend/src/controllers`, business logic in `src/backend/src/services`, validation in `src/backend/src/validations`, middleware in `src/backend/src/middleware`, Prisma schema in `src/backend/src/prisma/schema.prisma` plus model fragments in `src/backend/src/prisma/models`.
- **Mobile:** screens in `src/mobile/app` (file-based routes), API access in `src/mobile/src/api`, state in `src/mobile/src/contexts`, reusable hooks in `src/mobile/src/hooks`, components in `src/mobile/src/components`, theming styles in `src/mobile/src/constants` and `src/mobile/src/types`.

## Existing conventions to preserve
- Backend layers follow `route -> Joi validation -> controller -> service -> Prisma`.
- Async controllers are wrapped in `catchAsync`; operational errors are thrown as `AppError` and handled centrally by `error.middleware.js`.
- API responses use the envelope `{ success, message, data, errors }`.
- Mobile uses functional components, typed props, React Context (`AuthContext`, `ThemeContext`), and a `useStyles` hook backed by `StyleScheme`.
- Backend is ES modules with JSDoc on public functions; mobile is TypeScript with strict mode.

## Working rules
1. Inspect before editing; read the relevant files and follow the patterns already in use.
2. Preserve existing conventions. Do not impose new frameworks, layers, or module systems.
3. Make minimal, focused changes that solve the stated problem.
4. Avoid unrelated refactoring or "drive-by" cleanup.
5. Prefer simple, maintainable solutions (KISS/YAGNI) over speculative abstraction.
6. When changing behavior, add or update the relevant backend tests.
7. Do not silently add, upgrade, or remove dependencies; call out any change and justify it.
8. Never write or commit secrets, tokens, or real environment values; use `.env.example` patterns.
9. When a larger design choice is involved, explain trade-offs briefly.
10. Never `git commit`, `git push`, or create branches unless explicitly instructed.
11. Python code follows `docs/engineering/coding-standards.md`: Google-style docstrings, Python 3.9 type annotations, colocated tests, and explanatory comments for non-obvious or security-sensitive logic.
12. All new or modified JavaScript functions, including Jest test callbacks and test helpers, must follow the mandatory documentation rules in `docs/engineering/coding-standards.md`. Missing required documentation is an implementation defect and must be corrected before completion.
13. Keep API contracts documented: every implemented Express route must be in `src/backend/openapi/openapi.yaml`, validated with `task docs:validate`, and covered by the route-coverage test. Before adding a test fixture or helper, inspect existing utilities and factories for reuse.

## Implementation protocol
Before implementing and before declaring a task complete, Codex must:

1. Derive acceptance criteria from the task specification first.
2. Cover the successful execution path, failure cases, edge cases, and regressions.
3. Maintain a requirements-to-tests checklist.
4. Verify every required execution path remains reachable after changes.
5. Inspect the final diff for unintended modifications.
6. Never declare completion while a core requirement is unimplemented.
7. Stop and report unresolved technical blockers rather than inventing workarounds.
8. Never stage, commit, push, create PRs, or perform live external mutations without explicit user authorization.

## GitHub ticket automation workflow

Workflow: **validate → plan → human review → hash-bound approval → separately authorized apply**.

- Codex may validate, inspect, test, and plan within existing permissions.
- Codex must never independently execute live GitHub issue creation/linking,
  commit, push, change branches, or open a PR.
- Approval of a plan hash is not, by itself, authorization to perform live
  mutations. Live `apply` requires separate explicit user authorization.
- See `tickets/README.md` for package structure, commands, and safety rules.

## Commands
- Backend tests: `task test` (or `cd src/backend && npm test`).
- Backend dev server: `task backend:dev` (`cd src/backend && npm run start:dev`).
- Mobile: `task mobile:dev`; lint via `task lint`.
- Full command list: `task --list` (or `task`).
- Regenerate i18n JSON after editing `src/backend/translations/*.js`: `node --experimental-vm-modules src/backend/scripts/generate.locales.js`.
- Python automation tests: `python3 -m unittest discover -s scripts/github_tickets/tests -v`.
- Validate a ticket package: `python scripts/github_tickets.py validate --manifest <manifest.json>`.

## Documentation
- `docs/architecture/system-overview.md` — packages, data flow, API contract.
- `docs/engineering/coding-standards.md` — JS/Node/Express/Expo conventions.
- `docs/engineering/design-principles.md` — pragmatic design guidance.
- `docs/engineering/testing-strategy.md` — test setup and expectations.
- `docs/decisions/README.md` — how to write ADRs.
- `docs/product/` — product vision, feature inventory, market research, subscription strategy, roadmap, requirements, and metrics.
- `docs/architecture/product-domain-design.md` — conceptual product domain model.

Product strategy documents are proposals; they guide planning but do not authorize implementation. Read these before starting substantial work; keep them in sync when conventions change.
