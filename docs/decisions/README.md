# Architecture Decision Records

This directory holds Architecture Decision Records (ADRs) for significant, hard-to-reverse choices. No ADRs exist yet; this file defines how future ones are written.

## When to write an ADR

Write an ADR when a decision:

- changes an API contract, data model, or public boundary,
- introduces or removes a framework, dependency, or architectural layer,
- affects security, persistence, or how money values are represented,
- is expensive to reverse or has broad team impact.

Routine, local implementation choices do not need an ADR.

## File naming

Use zero-padded sequence numbers and a short slug:

```text
docs/decisions/0001-use-integer-cents-for-money.md
```

## Template

```markdown
# NNNN. Title

**Status:** Proposed | Accepted | Deprecated | Superseded by NNNN
**Date:** YYYY-MM-DD

## Context
The problem, current state, and constraints that motivate the decision.

## Decision
What was decided, concisely and concretely.

## Alternatives considered
The main options that were rejected and why.

## Consequences
Positive and negative outcomes, including migration cost and follow-up work.
```

## Proposed decision backlog

Important unresolved decisions that may warrant ADRs once made. These are **not** finalized decisions:

- Monetary representation (integer minor units vs Prisma `Decimal`).
- Financial account ownership and transfer accounting model.
- Transaction/category normalization (`Transaction.category` string vs `Category` relation).
- Offline synchronization scope (basic offline entry vs durable offline-first sync).
- Subscription entitlement enforcement model and tier launch sequencing.
- Household data ownership, roles, and dissolution policy.
- Web application architecture (single API client vs separate financial system — proposal is to reuse the backend API).

## Rules

- One decision per ADR; keep it focused.
- Record the decision as made, not a speculative wish list.
- Reference prior ADRs instead of repeating context.
- When a decision is reversed or replaced, update the status and link to the new ADR.
