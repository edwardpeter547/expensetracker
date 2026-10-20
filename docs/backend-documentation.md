# Backend API Documentation

This guide explains how the ExpenseTracker backend API contract is documented
and how to keep it accurate.

## Where the specification lives

- `backend/openapi/openapi.yaml` — the single-source OpenAPI 3.1 document for
  every implemented endpoint.
- `backend/redocly.yaml` — Redocly validation configuration (minimal ruleset).

## Running documentation locally

Enable documentation by exporting `ENABLE_API_DOCS=true`, then start the API:

```bash
cd backend
ENABLE_API_DOCS=true npm run start:dev
```

- Swagger UI: `GET /api/docs`
- Machine-readable specification: `GET /api/openapi.json`

Documentation is disabled by default and must never be enabled unintentionally
in production.

## Validating the specification

```bash
cd backend
npm run docs:validate
```

This runs `redocly lint` and fails on structural OpenAPI errors. The route
coverage test is part of the normal Jest suite:

```bash
cd backend
npx jest src/docs/__tests__/apiDocs.test.js
```

## Documenting a new endpoint

1. Implement the route, Joi validation, controller, and service.
2. Add the operation under `backend/openapi/openapi.yaml` with a unique
   `operationId`, a tag, a summary, parameters, request body, and responses.
3. Reflect the actual Joi constraints and controller response shape — do not
   document intended behavior.
4. Run `npm run docs:validate` and the route-coverage test.

## Updating request and response schemas

- Request schemas derive from `backend/src/validations/*.validation.js`.
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
