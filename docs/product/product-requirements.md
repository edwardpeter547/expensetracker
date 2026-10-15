# Product Requirements

**Status:** Proposal. High-level requirements for future capabilities. These guide future GitHub issues but do not authorize implementation.

## Core functional requirements

### Accounts and profiles
- Users can register, verify email, sign in, reset password, and delete their account.
- Profile holds display name, locale, timezone, currency, and preferences.
- Account deletion removes or anonymizes personal data per a documented retention policy.

### Financial accounts and transactions
- Transactions carry amount, type (income/expense), category, date, description, and optional metadata.
- Amounts are stored and computed with exact monetary precision (no floating point for money).
- All transaction reads/writes are scoped to the owning user or an authorized household.
- Duplicate detection prevents double-counting on manual or synced entry.

### Categories and budgets
- Categories may be system-provided or user-defined, with optional subcategories.
- Basic budgets support monthly periods and budget-vs-actual reporting; advanced budgets (rollover, flexible periods, templates) arrive later.
- Budget spending aggregates only transactions in the correct category and period.

### Recurring transactions and alerts
- Recurring rules define frequency, next occurrence, amount, and category.
- Upcoming bill reminders are configurable and respect timezone.

### Goals and forecasting
- Savings goals track target amount, target date, and progress.
- Cash-flow forecast projects expected balances using recurring and historical data.
- Forecasts display assumptions and are never presented as guarantees.

### Household collaboration
- Household members are invited with explicit consent and assigned roles.
- Personal and shared financial spaces are clearly separated.
- Shared budgets/goals/transactions have defined read/write rules.

### Reporting and export
- Users can filter by date range and category and export their own data (CSV/PDF); advanced filters, tags, and saved filters are paid capabilities.
- Reports are consistent with the source transactions at export time.

### Subscriptions and entitlements
- Free, Plus, Pro, and Family entitlements are enforced consistently across mobile, web, and API.
- Downgrades preserve history and convert paid actions to read-only without data loss.

## Phase alignment
Requirements map to the roadmap in `product-roadmap.md`:

- **Phase 0:** correctness of ownership, money representation, and budget aggregation.
- **Phase 1:** reliable online capture, basic search/filter, basic budgets, CSV export, deletion.
- **Phase 2:** web parity using the same API, entitlement enforcement, self-service export/deletion.
- **Phase 3:** recurring transactions, advanced budgets (rollover/flexible periods/templates), alerts, reports.
- **Phase 4:** goals, debt, cash-flow forecast, net worth, household sharing.
- **Phase 5:** regulated bank connectivity, categorization, explainable insights.
- **Phase 6:** multi-currency, freelancer separation, integrations, localization.

## Non-functional requirements

### Correctness and data integrity
- Monetary calculations use exact arithmetic; date/time operations use the user's timezone with UTC storage.
- Idempotency protects against duplicate submissions and sync retries.

### Security and privacy
- Authentication uses short-lived access tokens and rotating refresh tokens.
- Passwords are hashed; secrets are never logged.
- Every tenant-scoped query filters by owner or authorized membership.
- Bank connectivity (when added) uses consent-based, re-authorizable connections.

### Reliability and observability
- Background jobs (recurring posts, alerts, sync) are retryable and idempotent.
- Structured logs avoid personal data; errors are monitored without exposing secrets.

### Accessibility and usability
- Core flows are keyboard/screen-reader accessible on web and respect device accessibility on mobile.
- Loading, error, and empty states exist for every data view.

### Export, deletion, and retention
- Users can export and delete data from settings on every tier.
- Deletion behavior is documented; backups are included in the deletion scope.

## Regulatory and trust requirements (UK/EU context)

### Financial data
- Exact monetary precision and auditability are foundational, not premium.
- Currency conversions (if added) record source, rate, and timestamp.

### Open Banking (proposed only)
- If UK Open Banking is added, use an FCA-regulated Account Information Service Provider (AISP) for account data.
- Obtain explicit customer consent, re-authenticate at the intervals required by applicable rules and the chosen provider, and honor revocation. The re-authorization interval is not fixed here and must be verified with current regulatory and provider requirements.
- A third-party AISP does not remove ExpenseTracker's obligations for data protection, fair processing, and security.
- Conduct a data protection impact assessment and record the lawful basis before launch.

### Advice boundary
- ExpenseTracker provides budgeting insights and projections, not regulated financial, investment, tax, or debt advice.
- AI-generated content must not present itself as personalised regulated advice.

### Consumer protection
- Pricing, trial terms, renewal, cancellation, and downgrade behavior must be clear before purchase.
- Refund and cancellation flows follow applicable consumer law.

## Questions for legal/compliance review
- Whether forecasts or AI summaries could be considered financial advice in target markets.
- Data retention periods and deletion scope for financial records.
- Open Banking AISP/PISP selection and FCA registration/agent responsibilities.
- VAT and regional pricing treatment for digital subscriptions.
- Accessibility obligations under UK/EU law for a consumer finance product.
