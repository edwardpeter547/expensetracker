# Architecture Decision Records

This directory holds Architecture Decision Records (ADRs) for significant, hard-to-reverse choices.

## Records

- [0001 — Authentication and Authorization Architecture (Epic #7)](0001-authentication-and-authorization-architecture.md) — Accepted
- [0002 — Container-First Backend Development and CI](0002-container-first-backend-development-and-ci.md) — Proposed
- [0003 — Independent Backend and Mobile Versioning](0003-independent-backend-and-mobile-versioning.md) — Proposed

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
- Cloud provider selection and managed-vs-self-hosted PostgreSQL.
- Docker Hub repository name and credential ownership verification (issue #6).
- Terraform vs OpenTofu adoption for Infrastructure as Code.
- Self-hosted runner hardware, network, and label/group model.
- EAS build profiles and remote build-number management.

## Rules

- One decision per ADR; keep it focused.
- Record the decision as made, not a speculative wish list.
- Reference prior ADRs instead of repeating context.
- When a decision is reversed or replaced, update the status and link to the new ADR.
