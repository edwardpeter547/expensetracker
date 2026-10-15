# Design Principles

These principles guide future development without imposing a rewrite or unnecessary abstraction. They are grounded in what the codebase already does well.

## Preserve the existing shape
- Keep the established backend layering: **route -> validation -> controller -> service -> Prisma**.
- Keep the mobile structure: **file-based screens -> contexts/hooks -> api client -> UI components**.
- Introduce new architecture only when a concrete maintenance problem makes the current approach hard to change safely.

## Separation of concerns
- Routes declare intent; controllers translate HTTP to service calls; services own business rules and persistence.
- Keep Prisma out of controllers and HTTP concerns out of services.
- In mobile, keep network and persistence details behind the API client and contexts rather than in screens.

## Keep it simple
- Prefer plain functions and small modules over classes and frameworks.
- YAGNI: build for current requirements plus clearly known near-term ones, not hypothetical futures.
- DRY: deduplicate through shared helpers/services, but avoid premature generic abstractions with few call sites.

## Dependency direction
- Controllers depend on services; services depend on Prisma. Do not invert this.
- Shared code goes down into `utils`, `services`, or `hooks`, never sideways between sibling controllers.
- Mobile components should not import directly from other screens.

## Boundaries and contracts
- Treat the response envelope and route contracts as stable; changing them requires an ADR (see `docs/decisions/README.md`).
- Data validation happens at the API boundary (Joi) and again at the client UI; backend remains authoritative.

## Error handling
- Operational errors are first-class: throw `AppError`, catch with `catchAsync`, format centrally.
- Keep error mapping (Prisma codes, JWT errors) in one place (`error.middleware.js`).

## State and effects
- Minimal, local state by default; lift to context only when multiple screens share it.
- Effects stay small, idempotent, and cleanup-capable.

## Financial and security invariants
- Money is never binary floating point in calculations; exact representation is a foundational decision, not a feature.
- Timezone and currency semantics are explicit at every boundary.
- Ownership is explicit: personal, household-shared, and subscription entitlements are separate concepts.
- Financial writes are idempotent and auditable; secrets are never logged.
- Preserve user data on downgrade; paid features may become read-only, but history remains exportable.

## What not to introduce now
- No TypeScript migration of the backend.
- No repository/unit-of-work layer over Prisma.
- No dependency-injection container.
- No second state-management, routing, or UI library.
- No microservice decomposition.
- No new lint/format/test framework.

These are deliberate exclusions. Each can be revisited through an ADR when the codebase grows and the pain becomes measurable.

## Trade-offs to document
When a change involves a real design decision, record it in a short ADR with context, options considered, decision, and consequences. Routine changes do not need ADRs.
