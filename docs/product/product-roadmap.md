# Product Roadmap

**Status:** Proposal. All phases are **Proposed** until the product owner explicitly approves them; none are marked Approved or Delivered.

## Roadmap statuses
- **Proposed** — Codex/product recommendation awaiting product-owner decision.
- **Approved** — explicitly approved by the product owner for implementation.
- **In Progress** — actively being built.
- **Delivered** — implemented and verified against acceptance criteria.
- **Deferred** — intentionally postponed with a documented reason.

No speculative calendar dates are assigned.

## Phase summary

| Phase | Focus | Complexity | Subscription | Status |
| --- | --- | --- | --- | --- |
| 0 | Stabilize existing foundation | Medium | — | Proposed |
| 1 | Reliable personal finance MVP (manual) | High | Free + Plus | Proposed |
| 2 | Web experience and SaaS foundations | High | Free + Plus launched | Proposed |
| 3 | Automation and advanced budgeting | Medium | Plus + Pro | Proposed |
| 4 | Financial planning and collaboration | High | Pro + Family | Proposed |
| 5 | Intelligent financial management | High | Plus/Pro (+ bank add-on) | Proposed |
| 6 | Differentiation and expansion | Exploratory | Pro/segments | Proposed |

---

## Phase 0 — Existing foundation (Proposed)
- **Objectives:** make what exists correct, safe, and testable before adding features.
- **User problems:** broken transaction scoping and budget aggregation undermine trust.
- **Features:**
  - Fix transaction ownership scoping and update/delete semantics.
  - Fix `Budget` ↔ `Transaction` category alignment (or approve a data-model change).
  - Approve a monetary representation before adding any financial calculations.
  - Complete profile update and the category update route.
  - Backfill controller/service integration tests for the corrected paths.
- **Dependencies:** none external.
- **Subscription:** not applicable.
- **Technical prerequisites:** test database; migrations under version control.
- **Risks:** schema migration on live data; preserving uncommitted work.
- **Acceptance criteria:** CRUD operations are user-scoped; budgets aggregate correct spending; money math uses exact arithmetic.
- **Success indicators:** integration tests pass; zero cross-user data-access defects.
- **Exclusions:** no new product features or UI redesign.

## Phase 1 — Reliable personal finance MVP (manual) (Proposed)
- **Objectives:** deliver a complete, trustworthy manual tracking and budgeting experience on mobile.
- **User problems:** users cannot finish core workflows, find transactions, or export their data.
- **Features:**
  - Reliable online transaction capture with clear loading/error states.
  - Transactions list with basic search, date filtering, and category filtering (Free).
  - Category management and basic category budgets.
  - Basic monthly budgets with budget-versus-actual calculation (no rollover yet).
  - Profile editing and account settings.
  - CSV export and account deletion.
  - Completed mobile screens for transactions, budgets, and profile.
- **Offline scope:** basic offline transaction entry is a candidate here, but **durable offline synchronization and conflict resolution is deferred** until core online workflows are stable. Full offline-first architecture is not committed in this phase.
- **Dependencies:** Phase 0 data-model and money-representation decisions.
- **Subscription:** Free (basic budgets, search/filter, export) and Plus (advanced filters, tags, saved filters).
- **Technical prerequisites:** idempotent create endpoints; export format definition.
- **Risks:** timezone correctness; premature offline-first complexity.
- **Acceptance criteria:** manual workflow completes without data loss; search/filter returns correct results; export contains complete data.
- **Success indicators:** first-transaction completion, first-budget creation, 30-day retention.
- **Exclusions:** rollover budgets, bank connectivity, AI, web app, household sharing.

## Phase 2 — Web experience and SaaS foundations (Proposed)
- **Objectives:** extend the same core to web and introduce the minimum commercial scaffolding.
- **User problems:** users want a larger screen for budgets/reports and need account/plan management.
- **Features:**
  - Responsive web client that reuses the existing backend API (no separate financial calculation system).
  - Web login/register, dashboard, transactions list, budgets, basic reports, profile, and settings.
  - Subscription plan model and entitlement enforcement.
  - Billing integration points (requirements only; infrastructure later).
  - Data export/deletion self-service on web.
- **Minimum web parity:** transactions, budgets, dashboard, profile, export/deletion must match mobile behavior.
- **Dependencies:** Phase 1 feature parity; entitlement definitions.
- **Subscription:** launch **Free and Plus** only; Plus features must already be delivered from Phase 1. Do not launch Pro before Pro features exist.
- **Technical prerequisites:** entitlement service, plan metadata, billing webhooks design.
- **Risks:** entitlement enforcement complexity; billing compliance.
- **Acceptance criteria:** mobile and web share the same business rules; plan changes take effect correctly; downgrade preserves history.
- **Success indicators:** free-to-paid conversion; cross-platform weekly active users; downgrade/churn reasons.
- **Exclusions:** deployment/provisioning decisions (deferred to infrastructure phase).

## Phase 3 — Automation and advanced budgeting (Proposed)
- **Objectives:** reduce capture friction and make budgets adaptive.
- **User problems:** users forget bills and abandon rigid monthly budgets.
- **Features:**
  - Recurring transactions and bill reminders.
  - Advanced budgets: rollover, flexible periods, templates, and overspend alerts.
  - Rule-based categorization and merchant recognition.
  - Duplicate detection and receipt attachments.
  - Advanced spending reports (trends, category comparisons, monthly/annual).
- **Dependencies:** Phase 1 budgets; Phase 2 entitlements.
- **Subscription:** Plus (advanced budgets, recurring, alerts, advanced reports); Pro only if richer analytics are ready.
- **Technical prerequisites:** background scheduler/notification design; attachment storage.
- **Risks:** notification fatigue; rule accuracy and user trust.
- **Acceptance criteria:** recurring entries post on schedule; rollover math is correct across period boundaries; alerts are accurate and configurable.
- **Success indicators:** recurring-transaction adoption; budget engagement rate.
- **Exclusions:** bank aggregation and AI.

## Phase 4 — Financial planning and collaboration (Proposed)
- **Objectives:** move from tracking to planning and sharing.
- **User problems:** irregular earners need foresight; households need shared space with privacy.
- **Features:**
  - Savings goals and emergency-fund targets.
  - Debt tracking with simple payoff projections.
  - Cash-flow forecast and financial calendar.
  - Net worth tracking and advanced analytics.
  - Household membership, roles, shared budgets/goals, and personal/shared spaces.
- **Dependencies:** Phase 3 recurring transactions; robust authorization and household ownership model.
- **Subscription:** launch **Pro** (goals, forecast, net worth) when delivered; **Family add-on** for household sharing.
- **Technical prerequisites:** household ownership/consent model; forecast engine.
- **Risks:** privacy and consent errors; forecast misinterpretation.
- **Acceptance criteria:** shared data is scoped by role; forecasts explain assumptions; goal progress is exact.
- **Success indicators:** goal creation rate; household activation and retention.
- **Exclusions:** investment advice; regulated financial advice.

## Phase 5 — Intelligent financial management (Proposed / exploratory)
- **Objectives:** add connectivity and intelligence only where they deliver clear value.
- **User problems:** manual entry limits coverage; users want plain-language answers.
- **Features:**
  - UK Open Banking connectivity via a regulated AISP (if compliance reviewed).
  - Automatic categorization with user correction.
  - Anomaly and subscription price-change detection.
  - Explainable, deterministic insights; optional limited AI summaries.
- **Dependencies:** Phases 2–4 foundations; legal/compliance review; aggregator cost validation.
- **Subscription:** Plus/Pro with connection allowances; limits determined by actual provider costs, not finalized now.
- **Technical prerequisites:** aggregator contract, consent/re-authorization flows (per current rules and provider requirements), data protection impact assessment.
- **Risks:** regulatory exposure, aggregator cost, AI accuracy/privacy.
- **Acceptance criteria:** bank data refreshes with consent; insights cite underlying transactions.
- **Success indicators:** connection activation rate; insight helpfulness and correction rate.
- **Exclusions:** payment initiation; investment advice.

## Phase 6 — Differentiation and expansion (Proposed / exploratory)
- **Objectives:** serve specialist segments and extend reach.
- **User problems:** multi-currency households and freelancers are under-served.
- **Features (candidates, not commitments):**
  - Multi-currency and localized reporting.
  - Freelancer/side-income and personal-vs-business separation.
  - Third-party integrations and a developer API.
  - Regional billing and localization.
- **Dependencies:** stable entitlement model and API from earlier phases.
- **Subscription:** Pro and targeted segments.
- **Technical prerequisites:** currency precision/exchange-rate design; partner security review.
- **Risks:** scope expansion before core value is proven.
- **Acceptance criteria:** to be defined if a segment is validated.
- **Success indicators:** segment activation and retention.
- **Exclusions:** enterprise expense management unless separately validated.

## Dependency highlights
- Phase 1 depends on Phase 0 money and data-model decisions.
- Phase 2 depends on Phase 1 parity.
- Phase 3 depends on Phase 1 budgets.
- Phase 4 forecast depends on Phase 3 recurring transactions.
- Phase 4 Pro launch depends on Pro features actually being delivered.
- Phase 5 bank connectivity and AI depend on Phases 2–4 plus compliance review.
