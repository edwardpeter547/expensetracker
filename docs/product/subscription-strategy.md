# Subscription Strategy

**Status:** Proposal. Prices are strategic estimates, not finalized commercial decisions. Competitor reference prices were collected 2026-10-13 in `market-research.md`.

## Principles
1. Free must be genuinely useful for ongoing manual tracking.
2. Security, privacy, export, and deletion are available on every tier.
3. Users retain historical data on downgrade; paid features become read-only where technically reasonable.
4. Paid features provide clear additional value; limits are transparent.
5. No paywall over essential security or account recovery.
6. AI is not automatically premium-worthy; it is priced only where it adds real value and cost.

## Proposed tiers

### Free (£0)
- **Target:** Manual Tracker.
- **Value:** low-friction daily expense tracking with a trustworthy privacy stance.
- **Included:**
  - Manual income and expense tracking.
  - Basic categories.
  - Basic transaction search, date filtering, and category filtering.
  - Multiple manual accounts within a reasonable allowance.
  - Basic monthly budgeting.
  - Unlimited access to historical records, subject to a documented fair-use policy.
  - Basic dashboard, CSV export, and account deletion.
  - Essential security (secure login, token handling, data isolation).
- **Recommended allowances:** up to **3 manual accounts** and **3 active budgets**.
  - Rationale: three accounts cover a common pattern (spending, savings, credit card) and three budgets cover common top-level planning without undermining paid tiers.
  - These are defensible product proposals, not evidence of willingness to pay.
- **Limits:** no rollover or flexible periods, no recurring transactions, no tags/saved filters, no attachments, no advanced reports.
- **Support:** self-serve help center.

### Plus (proposal: £4.99/month or £39.99/year)
- **Target:** Budget Improver and engaged trackers.
- **Value:** meaningful productivity improvements over manual tracking.
- **Included:**
  - Advanced budgets: rollover and flexible budget periods.
  - Recurring transactions and bill reminders.
  - Advanced search, tags, and saved filters.
  - Receipt photo attachments (fair-use allowance).
  - Rule-based categorization and automation.
  - Additional financial accounts (e.g., up to 10 manual accounts).
  - Advanced spending reports.
  - CSV and PDF export.
- **Support:** standard email support.

### Pro (proposal: £8.99/month or £79.99/year)
- **Target:** Irregular Earner and financial planners.
- **Value:** advanced planning and intelligence.
- **Included:**
  - Cash-flow forecasting.
  - Savings goals and debt tracking.
  - Net worth tracking.
  - Advanced analytics and custom reports.
  - Scenario planning, if validated.
  - Explainable financial insights.
  - Optional limited AI features with transparent allowances.
- **Support:** priority support.

### Family (proposal: add-on +£4/month to Plus or Pro; standalone tier deferred)
- **Target:** Household Lead.
- **Value:** shared budgets and goals with private personal space.
- **Form:** ship as an **add-on** to Plus or Pro first; evaluate a standalone Family tier after usage data.
- **Billing ownership:** the add-on attaches to one billing owner's subscription.
- **Members:** up to 5 additional members (6 people total including the owner).
- **Shared vs personal:** members keep private personal finances; only explicitly shared budgets, goals, and transaction spaces are visible to the household.
- **Roles:** owner, admin, and member permissions; owner/admin manage membership and shared spaces.
- **Membership changes:** invitations require explicit acceptance; removal revokes access to shared spaces only.
- **Data ownership on leave:** shared records created by a member remain in the household unless reassigned or exported; private records stay with the member.
- **Downgrade:** when the Family add-on is removed, shared spaces become read-only; historical data remains exportable.
- **Decision:** add-on first to avoid a separate SKU and billing complexity.

## Tier availability
Distinguish these concepts explicitly:
- **Defined commercial plans:** Free, Plus, Pro, and Family are defined as strategy, not yet launched.
- **Implemented entitlement infrastructure:** does not exist yet; planned for Phase 2.
- **Available paid features:** features that are actually delivered in the roadmap.
- **Publicly launched subscription tiers:** only Free and Plus should launch after Phase 1/2, once Plus features exist. Pro launches with Phase 4 Pro features; Family launches with Phase 4 household features.

Do not launch a tier before its headline features are delivered.

## Bank connectivity
- Position as a **Plus/Pro capability with a fair-use connection allowance** once a regulated aggregator is integrated.
- **Do not finalize connection limits now.** Allowances must follow actual aggregator pricing and commercial validation.

## Pricing rationale
- Undercuts premium US products (YNAB $14.99, Monarch $14.99) while staying above Spendee ($5.99) because ExpenseTracker targets planning depth.
- Aligns with UK competitor Snoop Plus (£5.99) at the Plus tier.
- Annual discounts (~25–33%) match common category practice and improve retention.
- GBP is proposed as the initial billing currency; regional pricing requires later analysis.

## Business tier evaluation
- **Not recommended now.** Expense-report/reimbursement workflows are a different product surface.
- Revisit only if freelancer/business expense separation shows strong demand.

## Downgrade and data retention
- Downgrade keeps all historical transactions, budgets, goals, and attachments readable.
- Paid-only creation actions become read-only; users can still export or delete.
- Scheduled recurring transactions may pause, but historical records are never deleted on downgrade.

## Qualitative subscription economics
Cost drivers to model in the infrastructure phase (no precise figures asserted):
- **Hosting/storage:** proportional to active users, attachment volume, and history depth.
- **Bank aggregation:** per-connected-account or per-call fees; highest variable cost for bank-synced users.
- **AI inference:** per-query cost; controlled by tier limits and caching/deterministic paths.
- **Payment processing:** per-transaction + percentage fees; annual plans reduce transaction count.
- **Support:** free self-serve keeps cost low; paid tiers justify human support.
- **Free-user servicing:** acceptable if the free tier is lightweight and converts to Plus; monitor conversion and support load.
- **Data retention/export:** deletion and export tooling is a compliance and trust cost, not revenue.
- **Gross margin:** healthiest on annual plans with bank aggregation usage within allowances.

## Open commercial questions
- Exact GBP price points and annual discounts require willingness-to-pay testing.
- Whether bank connectivity is bundled or a metered add-on depends on aggregator unit costs.
- Whether Family is an add-on or standalone tier should follow early cohort data.
- Regional pricing (EUR/USD) and VAT treatment need review.
