### Description

Resolve the fragile Expo/mobile API connection workflow that previously required manually entering the development host's IP address, and address existing session integration defects.

### Task List

- [ ] Implement or verify environment-aware API base URL resolution using the established project configuration.
- [ ] Remove the normal need to manually type changing host IP addresses.
- [ ] Preserve backend API prefix and authenticated request behavior.
- [ ] Improve refresh-token rotation and concurrent refresh handling.
- [ ] Improve error behavior for unavailable backend and expired sessions.
- [ ] Add or update focused backend/mobile regression tests.

### Technical Details

React Native/Expo mobile client communicates with Express API at `/api/v1`. Follow the existing endpoint resolver and authentication client; do not introduce a second configuration path or hard-code private LAN addresses.

### DOD

- [ ] Mobile can connect to the backend using supported automatic configuration.
- [ ] Authentication and refresh-token behavior remain consistent.
- [ ] Relevant tests and any physical-device limitations are documented.
- [ ] No manual IP configuration is needed for the supported development workflow.

### Dependencies

Parent story AFI-01.

### Additional Context

Retrospective improvements work; do not expand into new authentication features or settings UI.

### Related Issues / PRs

- Parent Epic: #29
- Parent Story: AFI-01
- Same improvements PR as AFI-01-T01 and AFI-01-T03.
