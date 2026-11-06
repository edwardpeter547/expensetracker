# Mobile Data Layer: Contracts and Offline

This document explains how the Expo mobile client switches between live API
data and in-memory demo data, and where each piece of code belongs.

## Goal

- Keep every piece of demo/offline code inside a single directory
  (`src/mobile/src/offline`) so it can be excluded from a production build.
- Let the rest of the app depend only on stable **contracts**, never on demo
  fixtures or raw API modules directly.
- Centralise the demo/API choice in one factory instead of scattering
  `DEMO_MODE` branches through hooks, routes, and components.

## Directory responsibilities

| Path | Responsibility |
| --- | --- |
| `src/contracts/types.ts` | The data-source interfaces (the contracts). |
| `src/contracts/apiDataSources.ts` | API-backed implementations of the contracts. |
| `src/contracts/index.ts` | The factory that resolves demo vs API and exports the chosen sources plus `isDemoMode`. |
| `src/offline/demoDataSources.ts` | Demo-backed implementations of the same contracts. |
| `src/offline/` | Demo fixtures and in-memory stores (`dashboardDemo`, `teamsDemo`, `transactionsDemo`, `planningDemo`, `recurringDemo`). |
| `src/api/` | Raw HTTP functions used by the API implementations (Axios client, endpoint modules, URL resolver). |
| `src/types/` | Shared domain types, including `planning.ts`. |
| `src/hooks/` | React hooks that consume the resolved sources and own loading/error state. |

## How it is wired

1. `contracts/types.ts` declares one interface per data domain, for example
   `TransactionDataSource` and `TeamDataSource`.
2. `contracts/apiDataSources.ts` and `offline/demoDataSources.ts` each implement
   the same interface set.
3. `contracts/index.ts` reads `DEMO_MODE` from
   `offline/dashboardDemo.ts` and exports the resolved instances:

   ```ts
   export const isDemoMode = DEMO_MODE;
   export const transactionDataSource = isDemoMode
       ? demoTransactionDataSource
       : apiTransactionDataSource;
   ```

4. Hooks and routes import the resolved sources:

   ```ts
   import { transactionDataSource } from '@/contracts';
   const records = await transactionDataSource.list();
   ```

They never import from `@/offline` and never check `DEMO_MODE` themselves.

## Rules

- `@/offline` may only be imported by `contracts/index.ts` and by files inside
  `src/offline/`. Production code must never import demo fixtures directly.
- Demo fixtures and demo implementations live under `src/offline/` only.
- The single `DEMO_MODE` switch lives in
  `src/offline/dashboardDemo.ts` and is read only by the factory.
- Demo-only domains (Teams, Recurring, non-budget Planning) have API
  implementations that return empty data and throw a clear "not available"
  error for writes.
- Shared domain types belong in `src/types/`, not in demo fixture files.

## Adding a new data source

1. Add the interface to `contracts/types.ts`.
2. Add the API implementation to `contracts/apiDataSources.ts` (empty/throw for
   a demo-only domain).
3. Add the demo implementation to `offline/demoDataSources.ts`.
4. Resolve it in `contracts/index.ts` using `isDemoMode`.
5. Update the consumers (hooks/routes) to import the resolved source.

## Build-time exclusion

Because all demo code lives under `src/mobile/src/offline`, a production build
can later exclude that directory (Metro resolver, Babel transform, or a build
profile) and leave only the API implementations behind. The contracts remain
unchanged; only `contracts/index.ts` would resolve to the API implementations.

## Verification

From `src/mobile`:

```bash
npx tsc -p tsconfig.json --noEmit
npm run lint
npm run test:components
```
