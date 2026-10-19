# ExpenseTracker — Agent Instructions

## What this is
ExpenseTracker is a personal finance app with an Expo/React Native mobile client and a Node.js/Express API. It tracks income and expenses, supports categories and budgets, and includes email-based registration/verification and password reset.

## Repo layout
This is a **two-package monorepo orchestrated by a `Makefile`** — it is **not** an npm workspace. Each package has its own `package.json`, `package-lock.json`, and `node_modules`.

- `backend/` — Express API (`"type": "module"`, plain JavaScript with JSDoc, not TypeScript).
- `mobile/` — Expo app (SDK 57) using TypeScript and `expo-router` file-based routing.
- `Makefile` — install/run/test helpers for both packages.
- `.github/` — issue templates only (no CI workflows yet).
- `docs/` — architecture and engineering guidance written during Phase 0.

## Stack
- **Backend:** Node.js, Express 5, Prisma 7 with `@prisma/adapter-pg` (PostgreSQL), Joi validation, JWT auth, `winston` logging, `i18n` localization, `nodemailer` + Handlebars email templates.
- **Mobile:** Expo SDK 57, React Native 0.86, React 19, `expo-router`, React Navigation 7 (tabs), Axios, `expo-secure-store` (tokens), AsyncStorage (theme), TypeScript.

## Where code belongs
- **Backend:** routes in `backend/src/routes/v1`, controllers in `backend/src/controllers`, business logic in `backend/src/services`, validation in `backend/src/validations`, middleware in `backend/src/middleware`, Prisma schema in `backend/src/prisma/schema.prisma` plus model fragments in `backend/src/prisma/models`.
- **Mobile:** screens in `mobile/app` (file-based routes), API access in `mobile/src/api`, state in `mobile/src/contexts`, reusable hooks in `mobile/src/hooks`, components in `mobile/src/components`, theming styles in `mobile/src/constants` and `mobile/src/types`.

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
- Backend tests: `cd backend && npm test` (or `make test-backend`).
- Backend dev server: `make start-backend-dev` (`cd backend && npm run start:dev`).
- Mobile: `cd mobile && npm start`; lint via `cd mobile && npm run lint`.
- Regenerate i18n JSON after editing `backend/translations/*.js`: `node --experimental-vm-modules backend/scripts/generate.locales.js`.
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
