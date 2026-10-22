# Backend API Documentation

This guide explains how the ExpenseTracker backend API contract is documented
and how to keep it accurate.

## Where the specification lives

- `src/backend/openapi/openapi.yaml` — the single-source OpenAPI 3.1 document for
  every implemented endpoint.
- `src/backend/redocly.yaml` — Redocly validation configuration (minimal ruleset).

## Running documentation locally

Start the API with documentation enabled:

```bash
task backend:docs
```

- Swagger UI: `GET /api/docs`
- Machine-readable specification: `GET /api/openapi.json`

Documentation is disabled by default (`ENABLE_API_DOCS=true` is opt-in) and
must never be enabled unintentionally in production.

## Validating the specification

```bash
task docs:validate
```

This runs `redocly lint` and fails on structural OpenAPI errors. The route
coverage test is part of the normal Jest suite:

```bash
task docs:test
```

`task docs:check` runs both validation and the coverage test.

## Documenting a new endpoint

1. Implement the route, Joi validation, controller, and service.
2. Add the operation under `src/backend/openapi/openapi.yaml` with a unique
   `operationId`, a tag, a summary, parameters, request body, and responses.
3. Reflect the actual Joi constraints and controller response shape — do not
   document intended behavior.
4. Run `npm run docs:validate` and the route-coverage test.

## Updating request and response schemas

- Request schemas derive from `src/backend/src/validations/*.validation.js`.
- Response schemas derive from controller responses and service projections.
- Keep reusable shapes in `components.schemas`; do not duplicate Prisma model
  definitions in the spec.

## Writing useful JSDoc

- Document purpose, `@param`, `@returns`, and `@throws` where applicable.
- Note side effects, ownership checks, and security or transaction invariants.
- Describe current limitations honestly; do not claim an unimplemented
  guarantee.

## Reviewing documentation changes

- Confirm every new or changed route is reflected in OpenAPI.
- Confirm JSDoc matches behavior, not aspiration.
- Keep documentation-only changes separate from behavioral changes.

## Avoiding drift

Run `npm run docs:validate` and the route-coverage test before merging any
route or contract change. The coverage test fails when an implemented route is
missing from OpenAPI or a documented operation has no route.

## Local development database

Local development uses a persistent Docker-hosted PostgreSQL 16 instance, not a
Neon-hosted database. The container is `expensetracker-postgres` (image
`postgres:16-alpine`, bound to `127.0.0.1:5432`) with data in the named volume
`expensetracker-postgres-data`. The runtime application role is
`expensetracker_app`; Prisma migrations run as the schema-owning
`expensetracker_migrate` role.

```bash
task db:up          # start/reuse the persistent container
task db:create-dev  # idempotently provision expensetracker_dev + roles
task prisma:deploy  # apply committed migrations
task backend:dev
```

The committed Prisma migrations under `src/backend/src/prisma/migrations` are
the authoritative schema mechanism. Use `task prisma:migrate -- --name <name>`
to create a migration during development and `task prisma:deploy` to apply
committed migrations noninteractively (the CI/CD-friendly path).
