# Teams UI V2 Integration

Status: **UI implemented as in-memory demo — backend not connected**

This document describes the Teams workspace added to the AuditWallet mobile
application from the `AuditWallet_Teams_UI_V2_ReactNative_Handoff` reference.
It records what is implemented in the client, what is intentionally UI-only,
and which backend capabilities are still required.

All Teams data currently lives in
[`src/mobile/src/constants/teamsDemo.ts`](../../src/mobile/src/constants/teamsDemo.ts).
It follows the existing demo-data convention: the single `DEMO_MODE` switch in
`src/mobile/src/constants/dashboardDemo.ts` remains the source of truth, and
the Teams screens read and mutate in-memory stores. Nothing is persisted,
delivered, or authorized by a server.

## Scope and preservation

- The bottom navigation is unchanged: **Home | Transactions | Planning | Teams | Profile**.
- The Teams tab keeps its existing route file name `(tabs)/goals.tsx` for
  deep-link compatibility, exactly as the Planning tab keeps `budgets.tsx`.
- The approved personal Planning Dashboard V1 is frozen and was not modified.
- The previous Teams "coming soon" placeholder was replaced with the approved
  Teams list and creation entry point.
- Existing receipt scanner, upload, recognition review, and purchased-item
  editor components are reused for team expenses rather than rebuilt.

## Implemented screens and route structure

Team routes are scoped by stable `teamId` rather than display name.

| Screen | Route |
| --- | --- |
| Teams list | `/(tabs)/goals` (tab labelled Teams) |
| Create Team | `/teams/create` |
| Team workspace | `/teams/[teamId]` |
| Members | `/teams/[teamId]/members` |
| Invite member | `/teams/[teamId]/invite` |
| Invitation accept/decline | `/teams/invitations/[token]` |
| Team chat | `/teams/[teamId]/chat` |
| Budgets | `/teams/[teamId]/finance/budgets` |
| Savings Goals | `/teams/[teamId]/finance/goals` |
| Insights | `/teams/[teamId]/finance/insights` |
| Monthly Plan | `/teams/[teamId]/finance/monthly-plan` |
| Cash Flow | `/teams/[teamId]/finance/cash-flow` |
| Planned Expenses | `/teams/[teamId]/planned-expenses` |
| New pooled request | `/teams/[teamId]/planned-expenses/new` |
| Request detail | `/teams/[teamId]/planned-expenses/[requestId]` |
| Shared Expenses | `/teams/[teamId]/expenses` |
| Record Team Expense | `/teams/[teamId]/expenses/new` |
| Activity | `/teams/[teamId]/activity` |
| Contributions | `/teams/[teamId]/contributions` |
| Member Spending | `/teams/[teamId]/member-spending` |

Screens are implemented in
`src/mobile/src/components/teams/`; thin Expo Router route files live in
`src/mobile/app/teams/`.

## Team creation and finance model

Creation is a three-step flow:

1. **Team Details** — name and type (`Family`, `Couple`, `Travel`, `Other`).
2. **Finance Model** — mandatory choice between `POOLED` and `INDEPENDENT`.
3. **Review and Create** — shows the entered values and warns that changing
   the model after financial history exists requires a controlled process.

The selected model is stored on the team record and drives conditional UI.
No casual model-change path exists. In the demo, creating a team only adds it
to the in-memory store and seeds the current user as Owner.

## Pooled funds accounting behavior

For a `POOLED` team:

- The workspace headline is **tracked available pooled funds**, calculated as
  allocation minus recorded spending. The UI states that AuditWallet does not
  hold funds.
- Contributions are shown as shared inflows by member.
- Planned expenses may be requested, approved, and later completed.
- Approval changes status only. It never creates a transaction, never reduces
  the tracked balance, and never increases actual spending.
- Completion records an actual amount and creates or links exactly one team
  expense.

The planned-expense lifecycle is `Pending → Approved → Completed`, with
`Rejected` and `Canceled` kept in history without expenditure. The UI
distinguishes estimated cost from actual cost and shows requester, approver,
and completion timestamps where available.

## Independent spending accounting behavior

For an `INDEPENDENT` team:

- No pooled balance, contributions, or mandatory approval workflow is shown.
- Members keep their own money and record qualifying purchases directly.
- Planned purchases are optional reminders only; they are never treated as
  actual spending.
- Shared expenses carry payer attribution, and the member-spending screen
  aggregates purchases by member.
- A member's personal team category should only reflect that member's own
  purchases; other members' purchases appear in team reports, not personal
  spending. This accounting is documented as backend work below.

## Personal-to-team expenditure categories

The desired production behavior is:

- Creating or joining a team activates a system-managed personal category.
- Selecting that category deep-links to `/teams/[teamId]`.
- Leaving a team or deactivation makes the category inactive while retaining
  historical transactions and reports.
- Pooled contributions are a personal team-category outflow plus a linked team
  inflow; later pool spending is not counted again as contributor spend.
- Independent purchases appear in the paying member's personal team category
  and shared team reports only.

The current client only renders the informational "Personal finance link" card
on the team workspace and documents the accounting rules. Automatic category
creation, activation, and linked financial records are **backend TODO**.

## Roles, invitations, and chat

Member roles are `Owner`, `Admin`, and `Member`. Invites are recorded for phone
or email with a proposed role and a pending status. The recipient screen shows
the team, finance mode, and proposed role with Accept/Decline actions.

The current implementation is UI-only:

- No invitation is sent or delivered.
- No account existence is probed or revealed.
- Accepting or declining does not change membership.
- Chat messages are local demo state and are not delivered or persisted.

The intended production journey is: invitation sent → recipient opens a secure
link → existing user signs in or a new user installs and registers → invitation
resumes → recipient accepts or declines → membership is updated. The deep-link
route exists, but authentication, token validation, expiry, revocation, and
server-side membership checks are backend work.

## Receipt scanning and line-item reuse

The Record Team Expense screen reuses the existing `ReceiptActionButtons`,
`ReceiptScannerModal`, `ReceiptScanPreviewModal`, `ReceiptUploadModal`,
`ReceiptReviewModal`, and `PurchasedItemsEditor` components. It adds team
context and payer attribution. Saved receipts and line items are stored only
in memory. Production should route team expenses through the same backend
transaction flow with a team ID and server-side attribution.

## Financial reporting and historical data retention

Team-scoped Budgets, Savings Goals, Insights, Monthly Plan, and Cash Flow
screens reuse the approved personal Planning visual primitives with
mode-specific labels. Team data must never bleed into another team or into
personal screens. Retention rules (historical records after leaving a team,
refunds, edits, reversals, partial payments, currency and timezone semantics)
are product requirements for the backend and are not yet implemented.

## Outstanding backend requirements

None of the following exist yet; the client intentionally does not simulate
them as production behavior:

- Team, membership, role, and invitation data models.
- Team-scoped CRUD and object-level authorization.
- Finance-mode enforcement and a controlled migration path.
- Pooled contribution and ledger records with idempotent double-entry.
- Planned-expense request lifecycle with approver/delegate authorization and
  duplicate-completion prevention.
- Receipt, line-item, and shared-expense persistence with payer attribution.
- Invitation tokens, expiry, revocation, deep-link resume, and account-enumeration
  protection.
- Chat delivery and persistence.
- System-managed personal team categories with activation/deactivation and
  historical retention.
- Team activity from server-side audit history.

## Validation

- Mobile lint: `cd src/mobile && npm run lint` — 0 errors.
- Mobile typecheck: `npx tsc -p tsconfig.json --noEmit` — passes.
- Mobile node tests: `npm test` — 32 tests pass.
- Mobile component tests: `npm run test:components` — 25 suites, 158 tests pass.
