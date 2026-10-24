# 0002. Container-First Backend Development and CI

**Status:** Proposed
**Date:** 2026-10-24

## Context

The backend has no application Dockerfile, no Docker Compose, and no automated pull-request validation. The Prisma generated client is gitignored, so any image must regenerate it. The prior infrastructure audit recommended a container-first development and CI architecture; this ADR records that direction as a decision for the team to approve.

## Decision

Adopt a single multi-stage backend Dockerfile with named targets (`development`, `test`, `migrate`, `production`), a single Compose file with `dev` and `test` profiles, and a GitHub Actions workflow that runs all backend validation inside the Docker `test` target. Keep Go Task as the only developer-facing command interface. Preserve the existing `postgres.sh` database tooling during a bounded transition, then consolidate it into Compose. The provisional base image is `node:24-alpine` (Prisma-compatible `>=24.0`); see the decision register for the final approval gate.

## Alternatives considered

- **Native-only CI:** rejected because it does not guarantee the same runtime as deployment.
- **Registry-centered intermediate images:** rejected for the current stage; adds registry/auth overhead without benefit.
- **Multiple Dockerfiles:** rejected; named targets in one file reduce duplication.

## Consequences

Positive: reproducible builds and tests, a clear path to deployment, and a smaller production image with no test tooling.

Negative / follow-up: the generated client must be produced at build time; macOS developers keep database-backed tests host-native because Docker Desktop lacks reliable host networking (Linux CI uses `--network host`); the production image excludes the Prisma CLI and requires a dedicated `migrate` target; publishing and deployment boundaries are defined in `docs/infrastructure/ci-cd.md`.
