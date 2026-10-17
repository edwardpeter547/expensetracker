### Description

Harden API security configuration: startup path, per-endpoint rate limits,
explicit CORS allow-list, `trust proxy`, and HTTPS/HSTS.

### Task List

- [ ] Fix the `logger.config.js:67` undefined-`config` startup blocker and add a
      boot smoke test.
- [ ] Configure an explicit CORS allow-list (no wildcard with credentials).
- [ ] Configure `trust proxy` for deployment behind a load balancer.
- [ ] Enforce HTTPS/HSTS in production.
- [ ] Add per-endpoint rate limits for auth endpoints in addition to the global
      limiter.
- [ ] Add request-size limits and confirm Helmet/security headers.
- [ ] Add tests for startup, CORS, and rate limiting.

### Technical Details

Current state: `app.js:34` uses `origin: Config.clientUrl` defaulting to `*`
with `credentials: true`, and only a global 100 req/15 min/IP limiter exists.
The logger config references an undefined lowercase `config`, blocking startup.

### DOD

- [ ] The API starts successfully and a boot smoke test guards the startup path.
- [ ] CORS uses an explicit allow-list.
- [ ] `trust proxy` and HTTPS/HSTS are configured for production.
- [ ] Per-endpoint rate limits exist and are tested.
- [ ] Tests pass.

### Dependencies

- Story `AUTH-S5` (#12).

### Additional Context

The startup fix is part 1 and must land before any integration suite runs.

### Related Issues / PRs

- Parent Story: #12
- Related: #15 (login lockout), #25 (audit events)
