# 0003. Independent Backend and Mobile Versioning

**Status:** Proposed
**Date:** 2026-10-24

## Context

Backend and mobile currently share a monorepo and are both `1.0.0`. They release for different reasons and at different cadences, so a single shared version couples unrelated changes.

## Decision

Version the backend API and the mobile application independently using Semantic Versioning. Track compatibility through the API contract (the OpenAPI specification) rather than through equal version numbers. Use component-specific tags (`backend/vX.Y.Z`, `mobile/vX.Y.Z`). Assign official versions at release approval; development builds are identified by commit SHA and build number, not by bumping the public version on every merge.

## Alternatives considered

- **Shared product version:** rejected; forces unnecessary coordinated releases.
- **Monorepo-wide release orchestration only:** rejected; adds tooling complexity without solving per-artifact cadence.

## Consequences

Positive: independent release cadences, clearer changelogs, and store counters that belong to each platform.

Negative / follow-up: compatibility must be tracked explicitly in release manifests, the team must adopt Conventional Commits plus a release tool for reliable bump derivation, and the release tool must be configured for the component tag convention.
