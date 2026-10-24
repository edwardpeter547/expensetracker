# API Connectivity

This document describes how the Expo mobile client resolves the ExpenseTracker
API base URL, how the backend binds its HTTP listener, and how local
development stays usable across iOS Simulator, Android Emulator, and physical
devices without hardcoding a developer machine's LAN address.

## Configuration sources

There is exactly one mobile configuration bridge: `src/mobile/app.config.js`.
It reads Expo public environment variables and exposes them through
`Constants.expoConfig.extra`. Runtime code never reads `process.env` directly.

| Variable | Purpose | Default |
| --- | --- | --- |
| `EXPO_PUBLIC_API_URL` | Explicit absolute base URL override | empty |
| `EXPO_PUBLIC_API_PORT` | Backend port used for local development | `7001` |
| `EXPO_PUBLIC_APP_ENV` | `development`, `staging`, or `production` | `development` |

The explicit URL must include the `/api/v1` prefix. Precedence is:

1. `EXPO_PUBLIC_API_URL`, when non-empty.
2. In development, a platform-aware localhost/default route.
3. Otherwise, fail closed with an actionable error.

## Resolution matrix

| Runtime | Development URL |
| --- | --- |
| iOS Simulator | `http://localhost:7001/api/v1` |
| Android Emulator | `http://10.0.2.2:7001/api/v1` |
| Physical iOS/Android device | `http://<metro-host>:7001/api/v1` |
| Web (local) | `http://localhost:7001/api/v1` |
| Staging / production | explicit `EXPO_PUBLIC_API_URL` (must be `https`) |

Physical-device development derives the backend host from Expo's Metro host
URI. This is the same address that serves the JavaScript bundle, so it tracks
the developer's active network automatically. Set `EXPO_PUBLIC_API_URL` for
cases where that host is not reachable (for example, a tunnel or a remote
staging backend).

## Backend binding

`src/backend/src/configurations/env.config.js` sets the listener host:

- development: `0.0.0.0` by default, so phones on the same LAN can connect;
- staging/production: `127.0.0.1` by default, for use behind a reverse proxy.

Override with `HOST` in `src/backend/src/environment/dev.env` or with
`task backend:dev -- HOST=0.0.0.0`.

The health endpoint is `GET /api/v1/health` and returns only
`{ "status": "ok", "service": "expensetracker-api" }`.

## Developer workflow

One-time setup:

```bash
cp src/mobile/.env.example src/mobile/.env
cp src/backend/src/environment/dev.env.example src/backend/src/environment/dev.env
# fill backend dev.env secrets, then:
task db:up
task db:create-dev
task prisma:deploy
```

Daily development:

```bash
task dev              # starts backend and Expo together
task network:url      # prints the API URL the mobile app will resolve
task network:check    # checks the backend health endpoint
```

Run the components separately with `task backend:dev` and `task mobile:dev`.
Use `task mobile:web` for the Expo web target.

## Troubleshooting

- **Simulator cannot connect:** run `task network:check`. The URL should use
  `http` (not `https`) and the loopback alias (`localhost` on iOS,
  `10.0.2.2` on Android).
- **Physical device cannot connect:** confirm the device is on the same LAN,
  the backend is bound to `0.0.0.0`, and the macOS firewall allows incoming
  connections on port `7001`. Run `task network:url` and compare it with the
  address shown by `expo start`.
- **Metro host is unavailable:** start Expo in LAN mode or set
  `EXPO_PUBLIC_API_URL` to an explicit reachable endpoint.
- **Android cleartext error:** development uses plain HTTP. Expo Go permits
  this; a custom development build may need an Android network-security
  exception scoped to the LAN address, which should never be shipped in a
  production build.

## Security

- Staging and production builds reject non-HTTPS explicit URLs.
- Production builds never fall back to localhost or a LAN address.
- The health endpoint discloses no database, environment, or infrastructure
  details.
- The HTTP client logs only method, URL, and status in development; it never
  logs tokens, request bodies, or response bodies.
- Access and refresh tokens remain in `expo-secure-store`; the refresh
  interceptor retries a rejected request at most once and never retries on
  network failure or timeout. Concurrent 401 responses share a single refresh
  attempt so they cannot race to consume the same refresh token.
- Native React Native networking is not subject to browser CORS, but the
  backend's browser-facing CORS origin comes from `CLIENT_URL`. Browser
  clients must set that to their real origin; the `*` fallback should not be
  used for credentialed browser traffic.
