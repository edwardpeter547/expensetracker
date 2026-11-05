# Biometric Login & Biometric App Lock

Status: design + implementation notes for the mobile client. Not a backend
contract change.

## Existing authentication architecture (verified)

- Credentials are email + password, exchanged at `POST /api/v1/auth/login`.
- The backend issues a short-lived JWT access token (15 minutes) plus a
  single-use, rotating refresh token (7 days). Refresh tokens are stored
  server-side by SHA-256 digest and rotate atomically on every
  `POST /api/v1/auth/refresh-token`; reuse revokes the whole family.
- The mobile client stores `accessToken` and `refreshToken` in
  `expo-secure-store`, never in AsyncStorage.
- Session restore reads the stored token pair and calls `GET /user/profile`;
  a failed 401 clears the tokens.
- Explicit logout calls `POST /api/v1/auth/logout` and then clears the local
  tokens. Password change revokes every refresh session and bumps the token
  version server-side.
- Expo Router has no route guard middleware. Authenticated routing is handled
  by `app/index.tsx`, which redirects to `(tabs)` when `useAuth().user`
  exists, and to `/welcome` otherwise.

## Biometric Login design

- Never store the password. Enrollment provisions the current refresh token
  into `expo-secure-store` with `requireAuthentication: true` (device-protected,
  biometric-gated) and stores a separate non-sensitive account marker.
- Biometric sign-in reads the gated refresh token, exchanges it through the
  existing refresh endpoint (so the backend still authenticates the session),
  persists the rotated token pair, and loads the profile.
- The account marker (email + user id) keeps enrollment scoped to one account.
- Disabling, explicit logout, and invalidated/expired credentials all delete
  the gated credential.

## Biometric App Lock design

- A local-only gate at the root layout renders a lock screen instead of the
  navigator when an authenticated session exists and the lock is armed.
- Cold launch locks whenever the lock is enabled. Foreground transitions lock
  based on a persisted background timestamp and the chosen threshold
  (Immediately / 1 minute / 5 minutes), so suspended processes are handled
  without relying only on JavaScript timers.
- Unlock uses the operating-system biometric prompt. Cancel keeps the app
  locked. Recovery is "Use password instead", which signs out and returns to
  password login.

## Known limitations / backend needs

- `SecureStore` `requireAuthentication` uses Face ID / Touch ID on iOS and
  Keystore user authentication on Android. On iOS it is not fully supported in
  Expo Go for Face ID and requires a development build with
  `NSFaceIDUsageDescription`.
- The backend refresh token is single-use and rotating. After a biometric
  sign-in the rotated token is written back; on iOS updating an existing
  biometric-gated keychain item can prompt again. A dedicated, long-lived or
  independently-rotatable biometric credential endpoint would remove this
  limitation. No such endpoint is introduced here.
- App-switcher screenshot privacy (FLAG_SECURE) is not implemented because no
  screen-capture module is installed.
