# Feature Opportunities

**Status:** Proposal. A prioritized, qualitative backlog. No user research or reach numbers were invented.

## Prioritization method
Each opportunity is scored 1–5 (5 = best) on:
- **Value** — how much it helps the core user.
- **Differentiation** — strategic separation from competitors.
- **Effort** — inverse development effort (5 = low effort).
- **Risk** — inverse technical/regulatory risk (5 = low risk).
- **Confidence** — strength of the evidence behind the opportunity.

**Priority score** = Value×2 + Differentiation×2 + Effort + Risk + Confidence (max 35). Dependencies and revenue potential are considered separately below. Scores inform priority; the roadmap phases govern sequencing.

## Prioritized backlog

| # | Opportunity | Value | Diff | Effort | Risk | Conf | Score | Tier |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Reliable online transaction capture; basic offline entry (durable sync deferred) | 5 | 4 | 4 | 4 | 4 | 30 | Free |
| 2 | Correct basic monthly budgets (rollover is a later Plus feature) | 5 | 3 | 4 | 5 | 5 | 30 | Free/Plus |
| 3 | Data export (CSV/PDF) and account deletion | 5 | 4 | 4 | 5 | 5 | 32 | All |
| 4 | Search and filtering (basic Free; advanced filters/tags/saved filters Plus) | 4 | 3 | 5 | 5 | 5 | 28 | Free/Plus |
| 5 | Cash-flow forecast for irregular income | 5 | 5 | 2 | 3 | 4 | 29 | Pro |
| 6 | Household shared budgets + personal/shared spaces | 5 | 5 | 2 | 2 | 4 | 28 | Family |
| 7 | Recurring transactions and bill reminders | 4 | 3 | 4 | 4 | 5 | 27 | Plus |
| 8 | Savings goals and debt tracking | 4 | 3 | 3 | 4 | 4 | 25 | Pro |
| 9 | Rule-based categorization and merchant recognition | 4 | 3 | 3 | 4 | 4 | 25 | Plus/Pro |
| 10 | Receipt attachments and OCR | 3 | 2 | 2 | 3 | 3 | 18 | Pro (later) |
| 11 | Regulated bank connectivity (UK AISP) | 5 | 3 | 1 | 1 | 3 | 21 | Later/add-on |
| 12 | Explainable AI insights and natural-language queries | 4 | 4 | 1 | 2 | 2 | 21 | Pro (later) |
| 13 | Multi-currency households | 4 | 4 | 2 | 2 | 3 | 23 | Later |
| 14 | Freelancer/business expense separation | 3 | 3 | 2 | 3 | 3 | 20 | Later |

## Top differentiation opportunities

### 1. Reliable online capture with basic offline entry (score 30)
- **User problem:** capturing a transaction must take seconds or users abandon the habit.
- **Solution:** quick-add flow and learned defaults; basic offline entry first, with durable synchronization and conflict resolution deferred until core flows are stable.
- **Why competitors may not solve it:** many prioritize bank aggregation and treat manual entry as secondary.
- **Evidence:** opportunity inferred from category norms; needs usability testing before marketing.
- **Complexity:** Medium; requires local queue and conflict-safe sync.
- **Operational cost:** Low.
- **Monetization:** baseline feature; drives activation and retention for all tiers.
- **Risks:** duplicate detection needed to avoid double-counting when synced entries also arrive.

### 2. Correct basic budgets first; rollover later (score 30)
- **User problem:** monthly budgets fail when income is irregular or spending crosses month boundaries.
- **Solution:** reliable monthly budgets and budget-vs-actual first; rollover and flexible periods follow as Plus features.
- **Why competitors may not solve it:** many enforce one methodology; rollover is inconsistently available.
- **Evidence:** PocketGuard advertises rollover; several products list it as premium. Validated by competitor presence, not user research.
- **Complexity:** Medium; must fix the existing `Transaction.category` vs `Budget.categoryId` mismatch first.
- **Operational cost:** Low.
- **Monetization:** multiple budgets and rollover are natural Plus incentives.
- **Risks:** design complexity around period boundaries and timezone handling.

### 3. Data export and deletion (score 32)
- **User problem:** users fear being locked into a finance app.
- **Solution:** one-tap CSV/PDF export and full account deletion, available on every tier.
- **Why competitors may not solve it:** export often exists but is buried; deletion is rarely prominent.
- **Evidence:** strong privacy expectations in the category; competitor marketing emphasizes data control.
- **Complexity:** Low-medium.
- **Operational cost:** Low.
- **Monetization:** not monetized directly; builds trust and reduces churn.
- **Risks:** must define retention and deletion semantics carefully.

### 4. Cash-flow forecast for irregular income (score 29)
- **User problem:** irregular earners cannot plan with a fixed monthly budget.
- **Solution:** project upcoming recurring transactions and expected balances to warn of low points.
- **Why competitors may not solve it:** forecasting is often premium (Monarch) or absent (YNAB).
- **Evidence:** Monarch markets forecasting; Snoop/Emma surface leftover money. Market pattern, not user research.
- **Complexity:** High; depends on recurring transactions and historical data.
- **Operational cost:** Medium if AI is used; low if deterministic.
- **Monetization:** strong Pro-tier driver.
- **Risks:** avoid presenting projections as guarantees; explain assumptions.

### 5. Household sharing with personal/shared spaces (score 28)
- **User problem:** couples need shared budgets without losing private money.
- **Solution:** households with roles, shared budgets/goals, and clearly separated personal vs shared data.
- **Why competitors may not solve it:** shared access exists, but personal/shared boundaries within one account are weaker.
- **Evidence:** YNAB Together and Spendee shared wallets confirm demand; boundary design gap inferred.
- **Complexity:** High; ownership, consent, and role models are non-trivial.
- **Operational cost:** Medium (support and reconciliation).
- **Monetization:** Family add-on or tier.
- **Risks:** privacy and consent errors are high-impact; requires careful authorization design.

### 6. Deterministic categorization and rules (score 25)
- **User problem:** manual categorization is tedious.
- **Solution:** merchant/category learning and user-owned rules before any AI.
- **Why competitors may not solve it:** they do offer rules, but early ExpenseTracker can keep them simple and transparent.
- **Evidence:** PocketGuard, Monarch, and Emma all advertise rules; table stakes, not unique.
- **Complexity:** Low-medium.
- **Operational cost:** Low.
- **Monetization:** Plus/Pro.
- **Risks:** low; accuracy must remain user-correctable.

### 7. Explainable AI insights (score 21)
- **User problem:** users want plain-language answers without trusting a black box.
- **Solution:** deterministic summaries first; optional explainable AI for questions like "why did groceries rise?" with cited transactions.
- **Why competitors may not solve it:** AI assistants exist (Expensify Concierge, Moneyhub), but explainability is often weak.
- **Evidence:** market trend only; no user research yet.
- **Complexity:** High; model selection, cost control, and privacy boundaries.
- **Operational cost:** High per query if LLM-based.
- **Monetization:** Pro only, with transparent limits.
- **Risks:** accuracy, hallucinations, privacy, and regulated-advice boundaries.

## Explicit de-scopes for now
- Investment account tracking and financial scenario modeling (scope expansion before core value is proven).
- Crypto, credit-score, and cashback marketplaces (partner-dependent and heavily competed).
- Developer APIs and public integrations until a stable internal API and entitlement model exist.
- Business tier for expense reports/reimbursement until consumer product-market fit is established.
