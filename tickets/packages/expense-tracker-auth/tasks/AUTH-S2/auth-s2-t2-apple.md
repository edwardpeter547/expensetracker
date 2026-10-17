### Description

Implement Sign in with Apple using identity-token verification against Apple's
JWKS, keyed by Apple's stable `sub`.

### Task List

- [ ] Configure the Apple Developer Services ID and private key.
- [ ] Verify the Apple identity token against Apple's JWKS with the app's `aud`
      and Apple's issuer, re-verifying on every sign-in.
- [ ] Key identity by Apple `sub` (email is only provided on first
      authorization and may be a private-relay address).
- [ ] Find or create the user, or start an explicit-consent link flow with
      reauthentication.
- [ ] Issue the same access/refresh token pair as password login.
- [ ] Add tests for sign-in, sign-up, linking consent, private-relay email, and
      token rejection.

### Technical Details

Apple's `sub` is the stable anchor; treat email as a one-time attribute. Never
auto-link an unverified provider email.

### DOD

- [ ] Sign in with Apple works end-to-end.
- [ ] New users are created and existing users link with explicit consent.
- [ ] The same token pair is issued.
- [ ] Private-relay and duplicate-email cases are handled.
- [ ] Tests pass.

### Dependencies

- `AUTH-S2-T3` (provider-neutral identity foundation).

### Additional Context

None.

### Related Issues / PRs

- Parent Story: #9
- Related: `AUTH-S2-T3`, #18 (Google)
