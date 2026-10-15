# Competitive Analysis

**Status:** Proposal. Complements `market-research.md` (pricing and sources live there).

## Comparison matrix
Ratings are qualitative (Low / Medium / High) based on official pages fetched 2026-10-13; "—" means not evident from the source.

| Capability | YNAB | Monarch | Emma | Wallet | PocketGuard | Spendee | Snoop |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Manual expense tracking | High | High | Medium | High | High | Medium | Medium |
| Bank/account aggregation | Limited (US/CA) | High | High | High | High | High | High |
| Budgeting depth | High | Medium | Medium | Medium | High | Medium | Medium |
| Net worth tracking | Medium | High | Medium | Medium | Medium | Low | Low |
| Forecasting | Low | High | Low | Low | Medium | Low | Medium |
| Shared/household finance | High (Together) | Medium | Medium (Spaces) | Medium | Low | High (shared wallets) | Low |
| Automation/rules | Medium | High | High | Medium | High | Medium | Medium |
| Subscription/bill management | Low | Medium | Medium | Low | High | Low | High |
| Reports/export | Medium | High | Medium | Medium | Medium | Medium | Medium |
| Free tier usefulness | Low (trial only) | Low (trial) | Medium | Medium | Medium | Low | High |
| Privacy positioning | High | High | Medium | Medium | High | Medium | Medium |

## Strengths and weaknesses

**YNAB**
- Strength: strong method and education; shared subscription up to six people.
- Weakness: expensive; multi-currency not supported in one plan; US/Canada-focused bank import.

**Monarch Money**
- Strength: polished net worth, investments, forecasting; strong privacy story.
- Weakness: higher price; free tier is only a trial.

**Emma**
- Strength: UK open-banking breadth, savings/cashback/crypto, four plans.
- Weakness: feature breadth can feel cluttered; plan prices not transparent on the web page.

**Wallet by BudgetBakers**
- Strength: personal, family, and small-business products; bank sync.
- Weakness: public web pricing unclear; differentiation less sharp for households.

**PocketGuard**
- Strength: budgeting flexibility (zero-based, kakeibo, 50/30/20), subscription tracking, lifetime option.
- Weakness: UX complexity from many methods; pricing shown in CAD.

**Spendee**
- Strength: shared wallets and simple pricing.
- Weakness: lighter analytics and planning depth.

**Snoop**
- Strength: UK-first, genuinely useful free tier, strong money-saving actions.
- Weakness: UK-only scope; less international appeal.

## Positioning gap for ExpenseTracker
Competitors are split between two extremes:
1. Deep budgeting/planning tools that assume users adopt a methodology and connect banks (YNAB, Monarch, PocketGuard).
2. Broad money assistants that aggregate many features but are less focused on cash-flow foresight and household privacy (Emma, Snoop).

ExpenseTracker can occupy the middle: **fast manual capture + simple budgets + explainable cash-flow foresight + household sharing, with transparent privacy and pricing.** This avoids competing head-to-head on bank aggregation breadth in early phases.

## Differentiation candidates (detailed in `feature-opportunities.md`)
1. Predictable cash-flow forecast with irregular-income support.
2. Personal vs shared household spaces with role-based access.
3. First-class manual/offline capture and later sync.
4. Transparent data ownership: export, deletion, and no data selling.
5. Explainable, deterministic insights before expensive AI.

## Risks
- Manual-only positioning limits reach versus bank-synced competitors until a regulated aggregator is added.
- Household collaboration raises complex ownership and consent design questions.
- Differentiation claims require independent validation before marketing.
