# ExpenseTracker Mobile

The mobile client for ExpenseTracker. The in-app product is branded
**AuditWallet**; the package, project, and code retain the ExpenseTracker name.

This app implements the Mobile UI milestone (Epic #125): authentication with
biometric sign-in, a five-tab shell, a dashboard, transactions with receipts
and recurring schedules, Planning, Teams, Profile/settings with membership, a
premium feature gate, and an AI chat surface.

## Stack

- Expo SDK 57, React Native 0.86, React 19
- TypeScript with `strict: true`
- `expo-router` file-based routing
- Axios + `expo-secure-store` (tokens)
- `expo-local-authentication` (biometrics)
- AsyncStorage (theme and app-lock preferences)

## Getting started

From the repository root:

```bash
task mobile:dev          # start Metro
task dev                 # backend + mobile together
```

The `android` and `ios` scripts use `expo run:android` / `expo run:ios`, which
require a native development build (the app has `expo-dev-client`). Expo Go is
not sufficient for biometrics (`expo-local-authentication`) or the iOS scene
lifecycle plugin.

Install dependencies once:

```bash
cd src/mobile && npm install
```

## Environment

Copy `.env.example` to `.env`. Supported variables:

| Variable | Purpose |
| --- | --- |
| `EXPO_PUBLIC_API_URL` | Explicit API base URL (must include `/api/v1` for staging/prod) |
| `EXPO_PUBLIC_API_PORT` | Local backend port (default `7001`) |
| `EXPO_PUBLIC_APP_ENV` | `development`, `staging`, or `production` |
| `EXPO_PUBLIC_AUDITWALLET_PLANS_URL` | Verified HTTPS plans page for the premium gate (optional) |

See `docs/engineering/api-connectivity.md` for URL resolution details.

## Project structure

```text
app/                       # expo-router file-based routes
  (auth)/                  # login, register, forgot/reset password, reset-code
  (tabs)/                  # five-tab shell: index, transactions, budgets, goals, profile
  planning/                # Planning tool routes
  teams/                   # Teams workspace routes
  transaction/             # transaction detail
  recurring-transaction/   # recurring schedule detail
  welcome.tsx              # unauthenticated entry
  add-transaction.tsx      # create/edit transaction
  add-recurring-transaction.tsx
  ai-chat.tsx
  membership.tsx
  receipt-preview.tsx
src/
  api/                     # Axios client + raw API modules + URL resolver
  contracts/               # data-source contracts, API implementations, factory
  offline/                 # demo fixtures and demo data-source implementations
  components/              # auth, dashboard, planning, teams, transactions,
                           # receipts, recurring, profile, premium, security, ui
  constants/               # design tokens and theme modules
  contexts/                # Auth, AppLock, FeatureAccess, Locale, Theme
  hooks/                   # data and feature-access hooks
  security/                # biometrics, app lock, biometric credential storage
  types/                   # domain types
  utils/                   # pure helpers (money, periods, itemization, etc.)
```

## Architecture

### Routing and providers

`app/_layout.tsx` is the root layout. It wraps the app in
`GestureHandlerRootView`, `ThemeProvider`, `LocaleProvider`, `AuthProvider`,
`AppLockProvider`, and `FeatureAccessProvider`, then gates the navigator behind
`AppLockScreen` when a protected session is locked.

`app/index.tsx` redirects authenticated users to `/(tabs)` and unauthenticated
users to `/welcome`.

`app/(tabs)/_layout.tsx` owns the five-tab bar:

| Tab | Route file | Purpose |
| --- | --- | --- |
| Home | `index.tsx` | Dashboard V1.5 |
| Transactions | `transactions.tsx` | Transactions and recurring entry |
| Planning | `budgets.tsx` | Planning workspace (keeps `budgets` name for deep links) |
| Teams | `goals.tsx` | Teams workspace (keeps `goals` name for deep links) |
| Profile | `profile.tsx` | Profile, settings, membership |

### Data layer and demo mode

Data flows through a set of **data-source contracts** instead of scattered
`DEMO_MODE` branches:

- `src/contracts/types.ts` defines the interfaces (`DashboardDataSource`,
  `TransactionDataSource`, `CategoryDataSource`, `BudgetDataSource`,
  `PlanningBudgetDataSource`, `MembershipDataSource`, `TeamDataSource`,
  `RecurringDataSource`, `PlanningDataSource`).
- `src/contracts/apiDataSources.ts` implements them against the API. Demo-only
  domains return empty data and throw a clear "not available" error.
- `src/offline/demoDataSources.ts` implements them against the in-memory demo
  stores; `src/offline/*Demo.ts` holds the demo fixtures.
- `src/contracts/index.ts` is the factory. It reads the single `DEMO_MODE`
  switch and exports the resolved sources plus `isDemoMode`. This is the only
  production file allowed to import from `@/offline`.

Hooks and routes import the resolved sources from `@/contracts` and never know
whether they are talking to the API or the demo store. See
`docs/engineering/mobile-data-layer.md` for the full picture.

### Feature access (premium gate)

`FeatureAccessContext` resolves per-feature access through a replaceable
entitlement adapter. The default adapter is a development-only mock defined in
the context. Screens gate actions with `useFeatureAccess`, `useFeatureGate`, or
the `FeatureGate` component; they never compare subscription strings directly.
See `docs/engineering/premium-feature-gate.md`.

### Security and biometrics

- Credentials are never stored; the refresh token is kept in
  `expo-secure-store` with `requireAuthentication` for biometric sign-in.
- Biometric app lock is local-only, with Immediate / 1 minute / 5 minute
  timing, persisted in AsyncStorage.
- See `docs/engineering/biometric-authentication.md`.

## Commands

From `src/mobile`:

```bash
npm start               # expo start
npm run android         # expo run:android (development build)
npm run ios             # expo run:ios (development build)
npm run web             # expo start --web
npm run lint            # expo lint
npm test                # node --test (API + localization)
npm run test:components # Jest via jest-expo
npm run test:typecheck  # tsc -p tsconfig.node.json
```

## Testing

- `npm test` runs Node-based tests for API modules and localization.
- `npm run test:components` runs Jest component tests (jest-expo) for auth,
  dashboard, transactions, receipts, recurring, welcome, profile, premium,
  biometrics, and utilities.
- `npm run test:typecheck` type-checks the Node-side TypeScript config.

See `docs/engineering/testing-strategy.md` for the repository-wide strategy.

## Backend integration status

Connected to the real backend (when `DEMO_MODE` is off): authentication,
profile, transactions, categories, budgets, sessions, password change, and
account deletion.

Frontend-only or demo-backed (no backend yet): Teams, membership/billing, AI
chat, receipt OCR, recurring scheduling, premium entitlements, the
password-reset UI, and social sign-in.

## Related documentation

- [System overview](../../docs/architecture/system-overview.md)
- [Testing strategy](../../docs/engineering/testing-strategy.md)
- [Biometric authentication](../../docs/engineering/biometric-authentication.md)
- [Premium feature gate](../../docs/engineering/premium-feature-gate.md)
- [Teams UI integration](../../docs/engineering/teams-ui-integration.md)
- [API connectivity](../../docs/engineering/api-connectivity.md)
