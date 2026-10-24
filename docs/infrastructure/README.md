# Infrastructure & CI/CD

This directory is the authoritative planning home for the product's infrastructure, continuous integration, continuous delivery, release engineering, and cloud operations. It describes the **current approved direction** and the **proposed future direction**. It is implementation documentation, not a historical audit.

Historical assessments live under [`docs/audits/`](../audits/) and are snapshots in time:

- [Application roadmap and architecture audit](../audits/application-roadmap-and-architecture-audit.md)
- [Infrastructure architecture and CI readiness audit](../audits/infrastructure-architecture-and-ci-readiness-audit.md)

> **Status note:** every concrete technology decision in this directory is marked **Proposed** unless it is verified as already present in the repository. Nothing here has been implemented by this documentation task.

## Why this exists

The product currently has reliable local tooling (Go Task, Docker-managed PostgreSQL, a guarded integration harness) but no application containerization, no Docker Compose, and no automated pull-request validation. The goal is to close that gap incrementally, then grow into publish, deploy, release, cloud, and operations capabilities only when each capability solves a real problem.

## Index

| Document | Purpose |
| --- | --- |
| [architecture.md](architecture.md) | Target infrastructure architecture, environments, and component responsibilities |
| [ci-cd.md](ci-cd.md) | GitHub Actions organization, PR CI, deployment, self-hosted runners, and EAS builds |
| [release-versioning.md](release-versioning.md) | Versioning, build numbers, Docker Hub tags, image identity, and release manifests |
| [cloud-and-iac.md](cloud-and-iac.md) | Cloud hosting, Terraform/OpenTofu, Ansible, and Kubernetes evolution |
| [ephemeral-environments.md](ephemeral-environments.md) | Temporary cloud environments, teardown, data safety, and cost controls |
| [ci-cd-roadmap.md](ci-cd-roadmap.md) | Phased delivery roadmap and Epic #29 ticket alignment |

Related, outside this directory:

- [System overview](../architecture/system-overview.md)
- [Architecture decisions](../decisions/README.md)
- [ADR 0002 — Container-first backend development and CI](../decisions/0002-container-first-backend-development-and-ci.md) (Proposed)
- [ADR 0003 — Independent backend and mobile versioning](../decisions/0003-independent-backend-and-mobile-versioning.md) (Proposed)

## Strategy at a glance

The immediate implementation order is deliberately small and reversible:

1. Multi-stage backend `Dockerfile` with named targets.
2. Docker Compose for development and integration tests.
3. Go Task commands that wrap Docker and Compose.
4. GitHub Actions validation on every pull request to `develop`.

The long-term direction, introduced only when justified, is:

5. Docker Hub publishing with immutable digests.
6. Automated backend deployment to a development environment.
7. Self-hosted GitHub Actions runners.
8. Expo EAS mobile builds.
9. Infrastructure as Code for cloud environments.
10. Ephemeral, cost-controlled environments.
11. Production release operations.
12. Kubernetes and advanced scaling only on operational evidence.

## Environment model (summary)

| Environment | Runs where | Persistence | Lifetime | Automation |
| --- | --- | --- | --- | --- |
| Local development | Developer machine | Persistent dev database (named volume) | Long-lived | Go Task + Docker Compose |
| Continuous integration | GitHub-hosted runners | Disposable PostgreSQL only | Per run | `pull_request` / `push` workflows |
| Self-hosted build/deploy | Operator-managed runner host | Deploys images; no app data | Long-lived host | Deployment workflows |
| Cloud dev/test | Cloud provider | Disposable by default; persistent only where declared | On demand + TTL | Terraform/OpenTofu + deploy workflows |
| Production | Cloud provider | Persistent databases, object storage, backups | Persistent | Controlled, approved deployments |

Full detail is in [architecture.md](architecture.md).

## Decision register and first task

Architectural decisions are recorded in the [decision register](ci-cd-roadmap.md#4-decision-register), split into agreed requirements, proposed technical defaults, and decisions deferred to implementation gates.

The first implementation task is **GitHub issue #43 — Multi-Stage Backend Dockerfile**, scoped to the verified stage graph in [architecture.md](architecture.md#6-multi-stage-docker-architecture). Prerequisites: confirm the Node 24 LTS default and the Docker Hub repository name/access (see the decision register); no cloud-provider decision is required for Phases 1–2.
