### Description

Implement Google sign-in using OpenID Connect on the shared identity model, so
users can register and sign in with Google and link existing accounts with
explicit consent.

### Task List

- [ ] Configure the Google Cloud Console project and OAuth/OIDC client.
- [ ] Obtain an authorization code or ID token via `expo-auth-session` on
      mobile.
- [ ] Verify the ID token (or exchange the authorization code server-side),
      validating `iss`, `aud`, `exp`, and `nonce`.
- [ ] Key identity by the Google `sub` claim via the `UserIdentity` model.
- [ ] Find or create the user, or start an explicit-consent link flow for an
      existing account, with reauthentication.
- [ ] Issue the same access/refresh token pair as password login.
- [ ] Add tests for sign-in, sign-up, linking consent, duplicate email, and
      token rejection.

### Technical Details

Google OpenID Connect, not raw OAuth. Backend verification is authoritative;
never trust the mobile-returned email alone. Email equality never proves
ownership.

### DOD

- [ ] Google OIDC sign-in works end-to-end.
- [ ] New users are created and existing users link with explicit consent.
- [ ] The same token pair is issued.
- [ ] Duplicate-email and private-relay cases are handled.
- [ ] Tests pass.

### Dependencies

- `AUTH-S2-T3` (provider-neutral identity foundation).

### Additional Context

The server-side authorization-code exchange is the recommended verification
path; this is an open product decision recorded in the ADR.

### Related Issues / PRs

- Parent Story: #9
- Related: `AUTH-S2-T3`, #19 (Apple)
