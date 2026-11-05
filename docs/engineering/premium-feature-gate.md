# Premium Feature Gate (frontend entitlement architecture)

This document describes the reusable, frontend-only premium feature gate and
feature-access architecture introduced for the mobile app. It is presentation
infrastructure only: it does not implement billing, payments, backend
entitlements, or server-side authorization.

## Feature catalog

The catalog is the single source of truth for feature identifiers and their
display copy. It lives in
`src/mobile/src/constants/featureCatalog.ts` and is typed against the
`FeatureKey` union in `src/mobile/src/types/featureAccess.ts`.

Current identifiers:

| Feature id | Category | Preferred presentation |
| --- | --- | --- |
| `teams.create` | teams | full |
| `teams.invite` | teams | compact |
| `teams.contributions` | teams | compact |
| `teams.manage` | teams | compact |
| `planning.insights` | planning | full |
| `planning.cashflow` | planning | full |
| `receipts.scan` | receipts | compact |
| `transactions.export` | transactions | compact |

Each definition carries a display name, headline, description, benefit list,
category, and preferred presentation. Definitions deliberately contain no plan
names, prices, billing intervals, or feature-to-plan allocations; the backend
owns those later.

### Naming conventions

- Use dot-separated `area.action` keys (`teams.create`, `planning.insights`).
- Keep keys stable; they are the contract screens and adapters share.
- Reconcile new keys with existing route and component naming before adding one.
- Do not assume every Teams feature is premium just because `teams.create` is
  used as the first test case.

### Adding a premium feature

1. Add the identifier to the `FeatureKey` union in
   `src/mobile/src/types/featureAccess.ts`.
2. Add its definition to `FEATURE_CATALOG` in
   `src/mobile/src/constants/featureCatalog.ts`. The `satisfies` annotation
   makes a missing or extra entry a compile-time error.
3. Choose whether the mock default in
   `src/mobile/src/contexts/FeatureAccessContext.tsx` should allow or deny the
   feature until the backend provides real entitlements.

## Entitlement architecture

The frontend asks for an access decision rather than reading a subscription
string. Components never compare values such as `user.plan === "premium"`.

### Access states

`FeatureAccessStatus` is `allowed`, `denied`, `loading`, or `unknown`.

- **allowed** — permit the feature.
- **denied** — present the premium upgrade experience.
- **loading** — show a pending state while the decision is determined.
- **unknown** — show a retryable unavailable state. This is explicitly not a
  confirmed denial and must never present a paywall.

### Provider and adapter

`src/mobile/src/contexts/FeatureAccessContext.tsx` owns a replaceable
`FeatureEntitlementAdapter`. The default adapter is a development-only mock
whose status map is defined at the top of the file. The provider exposes:

- `getAccess(featureId)` — the resolved `FeatureAccessResult`.
- `requestAccess(featureId, onAllowed, options?)` — runs an allowed action or
  presents the gate/pending/unavailable modal.
- `setMockStatus(featureId, status)` — development-only override.
- `resetMock()` — clears development overrides.
- `refresh()` — re-fetches from an adapter when one is supplied.

`useFeatureAccess(featureId)` returns the normalized decision plus
`isAllowed`, `isDenied`, `isLoading`, and `isUnknown` booleans.
`useFeatureGate()` returns the `requestAccess` helper for action-level checks.

### Mock behavior and switching states

The mock is clearly labelled development-only. It defaults `teams.create` to
`denied` so the premium gate can be exercised, and keeps `teams.manage`
`allowed` so normal team viewing and management remain available. It never
persists an upgrade and never creates a fake payment success.

During development, switch `teams.create` through the context:

```ts
const { setMockStatus } = useFeatureAccessContext();
setMockStatus('teams.create', 'allowed'); // or 'denied' | 'loading' | 'unknown'
resetMock(); // return to the default map
```

`setMockStatus` and `resetMock` are no-ops outside `__DEV__`, so mock controls
are not exposed in production builds. In production the default mock must be
replaced by an authenticated backend adapter.

### Future backend replacement

The future backend will own plan definitions, feature-to-plan mapping,
effective user entitlements, limits, trials, and authorization. The frontend
adapter is the only integration point: inject an adapter that resolves against
a server-provided entitlement snapshot. The intended refresh points are sign
in, sign out, application resume, subscription change, and return from the
plans website. These hooks are not wired to real endpoints yet.

The UI is not an authorization boundary. Protected API operations must be
enforced server-side.

## UI integration

### Full-screen gate

`src/mobile/src/components/premium/PremiumFeatureGate.tsx` renders the approved
emerald/ivory/navy experience with the AuditWallet brand, a "Premium Access"
indicator, the finance illustration, feature-specific copy and benefits, the
**Explore Premium Plans** CTA, and **Maybe Later**.

`src/mobile/src/components/premium/FeatureGate.tsx` is the route/section guard.
Wrapping a route renders children only when access is allowed and otherwise
renders the full gate, pending state, or unavailable state inline.

### Compact gate

The same `PremiumFeatureGate` supports a `compact` presentation for premium
actions or sections within an existing screen. Compact omits the full header
and illustration and is suitable for a page sheet or an inline section.

### Route protection

`src/mobile/app/teams/create.tsx` wraps the existing `CreateTeamScreen` in
`<FeatureGate featureId="teams.create" presentation="screen">`. Direct
navigation or deep links to the create route therefore reach the gate rather
than bypassing it. The existing Create Team flow itself is unchanged.

### Action-level checks

`src/mobile/app/(tabs)/goals.tsx` gates the existing Create Team button with
`requestAccess('teams.create', () => router.push('/teams/create'))`. The
provider opens the full-screen gate modal when access is denied.

### External plans page configuration

The plans URL is a single configuration value,
`EXPO_PUBLIC_AUDITWALLET_PLANS_URL`, bridged through `app.config.js` into
`Constants.expoConfig.extra.auditWalletPlansUrl` and read via
`src/mobile/src/api/plans.ts`. The pure normalizer in
`src/mobile/src/api/plans.resolver.ts` only accepts a well-formed HTTPS URL.

The URL is intentionally left unconfigured until the official AuditWallet
website exists. While unconfigured, the external CTA is disabled and labelled
"Plan comparison is not available yet" rather than opening a dead or guessed
link. The Membership & Billing screen now consumes the same shared value.

## Current limitations

- Mock entitlements are not real subscriptions and are not persisted.
- No billing, checkout, payment, or purchase-success flow exists.
- No backend authorization or server-side entitlement enforcement exists.
- The frontend gate is presentation only and can be bypassed by a determined
  client; the future backend must protect the actual operations.
- Before production release, the external subscription CTA must be reviewed
  against applicable Apple App Store and Google Play billing and external-link
  rules. Permitted behavior may depend on platform, storefront, distribution
  method, and entitlements. This task implements no payment processing and no
  bypass of platform billing requirements.
