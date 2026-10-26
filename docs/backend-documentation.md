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

## Account management

The account-profile backend (profile DTO, avatar contract, authenticated
password change, and the deletion-policy gate) is described in
`docs/audits/account-management-gap-assessment.md`. Keep that note in sync with
`src/backend/src/services/profile.service.js`,
`src/backend/src/services/avatar.service.js`,
`src/backend/src/services/auth.service.js`, and the `Users` section of
`src/backend/openapi/openapi.yaml`.

## File storage configuration

Avatar (and future file) storage is selected at startup with `STORAGE_DRIVER`:

- `disabled` (default) — the deterministic default avatar works; uploads and
  removals return `503`.
- `local` — the Node filesystem adapter. `STORAGE_LOCAL_ROOT` defaults to
  `src/backend/uploads`; relative roots resolve against the backend package
  root. Keep this directory out of public static serving and out of Git (it is
  already gitignored), and do not rely on its contents in ephemeral production
  containers.
- `s3` — Amazon S3 or an S3-compatible store. Requires `STORAGE_S3_BUCKET` and
  `STORAGE_S3_REGION`; `STORAGE_S3_ENDPOINT` is optional and enables path-style
  addressing for compatible stores such as MinIO. Credentials are resolved by
  the AWS SDK's standard provider chain (environment, shared config, or IAM
  role); never commit credentials.

Selecting `s3` with missing bucket or region fails startup rather than leaving
a broken upload endpoint. Switching providers does not migrate existing
objects: plan a migration or a transitional read strategy before changing
drivers, and schedule a periodic orphan sweep for objects that outlived a
failed cleanup. Configuration examples live in `src/backend/.env.example` and
`src/backend/src/environment/dev.env.example`.
