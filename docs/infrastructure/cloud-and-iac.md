# Cloud and Infrastructure as Code

**Status:** Proposed. No cloud provider has been selected and no infrastructure configuration exists.

## 1. Cloud hosting strategy

| Model | Cost | Complexity | Automation | Scalability | Reliability | Security | Teardown/recreate | Fit |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Single VM + Docker | Low | Low | Medium | Low | Single point of failure | Medium | Easy | Earliest deployment only |
| Managed container service | Low–Medium | Low–Medium | High | Medium–High | High (managed) | High | Easy | **Recommended near-term** |
| Serverless containers | Usage-based | Medium | High | High | High | High | Easy | Viable for bursty APIs; watch cold starts |
| Managed PostgreSQL | Medium | Low | High | High | Very high | High | Persistent | **Recommended for production** |
| Self-hosted PostgreSQL | Lower direct | High | Medium | Low | Operator-dependent | Medium | Harder | Only if managed is unsuitable |
| Managed Kubernetes | High | High | High | High | High | Medium–High | Medium | **Defer** (see §4) |

Near-term recommendation: a **managed container service** running the production image plus **managed PostgreSQL** with automated backups, point-in-time recovery, and deletion protection. The provider is undecided; selection is a decision gate (see [ci-cd-roadmap.md](ci-cd-roadmap.md) §Decision register). Managed services can incur minimum charges even when no application requests are served; exact costs are provider- and region-specific and are not asserted here.

## 2. Infrastructure as Code

### Terraform vs OpenTofu

OpenTofu is the provisional preference, but it is **not universally drop-in compatible**; provider versions, modules, and feature availability must be verified against the selected provider before committing.

| Criterion | Terraform | OpenTofu |
| --- | --- | --- |
| License | BSL (recent versions) | MPL-2.0 |
| Language/providers | HCL + registry providers | Mostly compatible; verify per provider |
| Remote state + locking | Supported | Supported |
| Ecosystem | Larger | Growing |

### State is sensitive (correction H)

The earlier statement that "secrets are never stored in IaC state" is too absolute. Some providers expose sensitive values (passwords, keys, connection strings) in state even when secret references are used. Therefore state is treated as sensitive and protected:

- **Remote backend:** encrypted at rest, access-controlled, and versioned.
- **Locking:** prevents concurrent apply.
- **Environment separation:** one state per environment (development/staging/production), never shared.
- **Bootstrap:** the state backend is provisioned out-of-band and never destroyed with the environment it manages.
- **Sensitive outputs:** marked `sensitive`; never echoed in plan logs.
- **Credentials:** provider credentials via short-lived OIDC where supported, not long-lived keys in state or config.
- **Retention/recovery:** state is backed up; deletion protection applies.
- **Destroy protection:** the state backend is excluded from any environment teardown.

### Proposed future structure

```text
infrastructure/
├── modules/
│   ├── networking/
│   ├── database/
│   └── compute/
├── environments/
│   ├── development/
│   ├── staging/
│   └── production/
├── ansible/            # only if VM-based hosts are used
└── scripts/
```

Created only in Phase 6.

## 3. Ansible

**OpenTofu/Terraform manages cloud resources; Ansible configures operating systems and hosts.** Ansible is **unnecessary** for the recommended managed-container + managed-PostgreSQL model because there is no persistent VM to configure. It is used only if the team adopts self-hosted VMs or a self-hosted Kubernetes control plane, where it would install Docker Engine, configure reverse proxies and system services, harden the OS, install monitoring agents, and install runner agents. It is not introduced solely to satisfy issue #35.

## 4. Kubernetes

Kubernetes is a long-term option, **not** a dependency for the initial CI/CD pipeline. It is not automatically cheaper or more secure than a managed container service.

### Adoption triggers (measurable)

- Multiple independently scaling backend services with uneven load.
- Sustained operational demand for rolling updates, self-healing, or multi-node resilience beyond the managed container service.
- A large number of concurrent environments making per-environment cluster namespaces economical.
- Team capacity to operate Kubernetes.
- A favorable, measured cost comparison against the managed container service.

### Evolution path

Single-host Docker → managed container service → managed Kubernetes, reusing the same immutable images and health endpoints. Helm/Kustomize and GitOps (Argo CD/Flux) are evaluated only after Kubernetes is adopted. For temporary environments, managed-container namespaces or lightweight deployments are usually simpler and cheaper than Kubernetes namespaces.

## 5. Observability

Before the first cloud deployment: structured application logs, container log collection, error monitoring (Sentry, issue #32), deployment records, and basic alerting. After production usage grows: metrics, dashboards, SLOs, tracing, and cost dashboards. The first deployment is not over-instrumented.

## 6. Secrets and identity

- GitHub Environments for deployment secrets; OIDC federation for cloud access where supported; short-lived credentials preferred over long-lived keys.
- Database credentials are per-environment, least-privilege, and rotated.
- Application secrets are injected at runtime, never baked into images or committed.
- IaC state is protected per §2; provider credentials are separate from state.
