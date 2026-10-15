# Success Metrics and Validation

**Status:** Proposal. No current user numbers or business performance are asserted.

All metrics below require future instrumentation; none are measured today. Treat them as leading indicators and success criteria, not achieved results.

## Stage-appropriate metrics

### Phase 0–1 (foundation and MVP)
- Activation rate (registered users who complete onboarding).
- Time-to-first transaction and first-transaction completion rate.
- First budget creation rate.
- Crash-free sessions and data-integrity error rate.
- 7-day and 30-day retention.

### Phase 2 (web + SaaS)
- Weekly/monthly active users across mobile and web.
- Free-to-paid conversion rate and trial conversion.
- Subscription churn and downgrade reasons.
- Feature adoption by tier (budgets, export, recurring). Track launch against delivered features: only Free and Plus launch initially; Pro metrics apply after Pro features ship.

### Phase 3–4 (automation, planning, collaboration)
- Recurring transaction adoption and alert open/action rates.
- Budget engagement (budgets viewed/updated per active user).
- Savings goal creation and goal completion rate.
- Household activation and member retention.

### Phase 5–6 (intelligence and expansion)
- Bank connection activation and connection retention.
- Automatic categorization accuracy and user correction rate.
- Insight helpfulness rating and opt-out rate.
- Multi-currency and specialist-segment activation.

## North-star metric (proposed)
**Weekly retained active users who complete at least one meaningful money action** (record, review, budget, or forecast). This balances usage breadth with the core value of understanding and controlling money.

## Guardrail metrics
- Data export and deletion completion rate (must be reliable).
- Support tickets per paid user.
- Security/privacy incident count.
- Downgrade-with-data-loss complaints (should be zero).

## Validation before building
1. **User interviews** with Manual Tracker and Irregular Earner personas to confirm pain points and willingness to adopt.
2. **Paper/prototype usability tests** for quick-add capture and cash-flow forecast views before coding.
3. **Willingness-to-pay experiments** for Plus/Pro price points and Family add-on versus standalone tier.
4. **Smoke tests** for feature ideas (e.g., a landing page or a manual prototype) to measure intent before full build.
5. **Cohort instrumentation** after launch to validate activation, retention, and conversion assumptions.

## Validation gates
- Validate willingness-to-pay before finalizing Plus/Pro/Family prices.
- Do not build Phase 2 billing until Phase 1 retention and activation are measurable and Plus features are delivered.
- Do not build Phase 4 household sharing until the authorization model and consent flows are designed and reviewed.
- Do not build Phase 5 bank connectivity until legal/compliance review and an AISP selection are complete.
- Do not build AI features until deterministic alternatives are shown insufficient and cost/accuracy limits are defined.
