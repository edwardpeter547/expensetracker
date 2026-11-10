# Internationalisation Gap Analysis and Implementation Roadmap

This document records the evidence-based audit that preceded the approved
internationalisation architecture. It is a temporary migration document and is
superseded, piece by piece, as each implementation phase lands.

## Audit methodology

The audit inspected the backend and mobile source trees, package manifests,
Prisma schema, OpenAPI specification, tests, CI workflows, and documentation.
It searched for language-related implementation (`i18n`, `locale`, `language`,
`translation`, `Accept-Language`, `Intl`, `currency`, `timezone`) and traced
actual usage rather than relying on filenames or dependency declarations. No
application code was modified.

## Current-state summary

- Backend `i18n-node` with generated `en`/`fr` catalogues exists and is used
  for email and a subset of auth messages.
- Mobile locale/currency detection, AsyncStorage persistence, `Intl`
  formatting, and `en`/`fr` system-category labels exist.
- Mobile UI translation, stable API error codes, preference synchronisation,
  and timezone-aware financial periods do not exist.
- `i18next` / `react-i18next` are not yet installed (verified against
  `src/mobile/package.json` and `src/mobile/package-lock.json`).

## Findings

Status legend: implemented, needs improvement, partially implemented, not
implemented, or unable to verify.

| ID | Area | Status | Current state / evidence | Severity | Remediation | Dependencies |
|---|---|---|---|---|---|---|
| BK-01 | Backend | Needs improvement | Unsupported `Accept-Language` returns 400 — `src/backend/src/middleware/lang.middleware.js` | High | Fall back to `en`; validate only explicit `lang` query strictly | BK-02, SH-01 |
| BK-02 | Backend | Partially implemented | `request.user.language` read before auth attaches the user — `src/backend/src/utils/helpers.js`, `src/backend/src/app.js` | High | Resolve locale lazily after authentication | BK-01 |
| BK-03 | Backend | Partially implemented | Naive header parsing (no q-values/order) — `helpers.js` | Medium | Add pure negotiation helper with tests | SH-01 |
| BK-04 | API | Not implemented | Error envelope lacks stable `code` — `src/backend/src/middleware/error.middleware.js`, `src/backend/src/utils/appError.js` | High | Add `code`/`params` to `AppError` and envelope | BK-05, MB-07 |
| BK-05 | Backend | Not implemented | Joi `detail.message` is English prose — `src/backend/src/middleware/validation.middleware.js` | High | Map Joi details to stable codes | BK-04 |
| BK-06 | Backend | Not implemented | Domain errors hardcoded English — transaction/budget/category services and controllers | Medium | Throw coded `AppError`; localise at boundary | BK-04 |
| BK-07 | Backend | Needs improvement | `RESPONSE_LOGOUT_SUCCESSFUL` and `VERIFICATION_COMPLETE_EMAIL_SUBJECT` referenced but undefined; unused keys present — `src/backend/src/controllers/auth.controller.js:518`, `src/backend/src/services/email.service.js:134` | High | Add missing keys, remove dead keys, add parity test | TS-01 |
| BK-08 | Backend | Needs improvement | Stray `src/backend/src/locales/og.json` (only `HEALTH_MSG`) | Low | Delete during catalogue cleanup | BK-07 |
| BK-09 | Backend | Needs improvement | `formatCurrency` hardcodes `$`, `formatDate` hardcodes `en-US` — `src/backend/src/messaging/email.templates.js` | High | Use `Intl` with render locale/currency | BK-02 |
| BK-10 | Backend | Needs improvement | `i18n.setLocale()` mutates a global singleton — `src/backend/src/messaging/email.templates.js:168` | Low | Pass locale explicitly to helpers | BK-09 |
| BK-11 | Backend | Needs improvement | Registration can persist an unvalidated header language — `src/backend/src/controllers/auth.controller.js:93` | Medium | Canonicalise through the shared negotiation helper | BK-03 |
| BK-12 | Backend | Partially implemented | `User.timezone` stored/validated but not applied to period boundaries — `src/backend/src/controllers/user.controller.js` | High | Derive periods in the user's timezone | None |
| BK-13 | API | Needs improvement | Success and error envelopes differ (`status` only on errors) | Medium | Decide and document one envelope; add `code` | BK-04 |
| MB-01 | Mobile | Not implemented | No UI translation catalogue; screens/tabs hardcoded English — `src/mobile/app/welcome.tsx`, `src/mobile/app/(tabs)/_layout.tsx` | Critical | Add `i18next`/`react-i18next` catalogues and `t()` | MB-06 |
| MB-02 | Mobile | Partially implemented | Explicit language change persists only locally — `src/mobile/src/contexts/LocaleContext.tsx` | High | Call `PUT /user/profile` when authenticated | MB-04 |
| MB-03 | Shared | Not implemented | API client sends no `Accept-Language` — `src/mobile/src/api/client.ts` | High | Add request interceptor | MB-01 |
| MB-04 | Mobile | Not implemented | No language selection UI in Profile/Settings | Medium | Add selector: Follow device / English / Français | MB-02 |
| MB-05 | Mobile | Not implemented | `Today`/`Yesterday` and `formatDate` hardcode English — `src/mobile/src/utils/transactions.ts`, `src/mobile/utils/utils.ts` | Medium | Move to catalogue/`Intl` | MB-01 |
| MB-06 | Mobile | Needs improvement | Supported-language list duplicated — `src/mobile/src/localization/registry.ts` vs `detect.ts` | Medium | Single source of truth | None |
| MB-07 | Mobile | Not implemented | Client error fallbacks English-only — `src/mobile/src/api/errors.ts` | Medium | Localise by `ApiErrorKind` and server `code` | MB-01, BK-04 |
| SH-01 | Shared | Not implemented | No shared locale canonicalisation/matching contract | High | Record and implement BCP 47 base-language matching | None |
| TS-01 | Testing | Not implemented | No catalogue completeness/parity tests | High | Add parity, orphan, and missing-key CI checks | BK-07 |
| TS-02 | Testing | Not implemented | No pluralisation/placeholder compatibility tests | Medium | Add placeholder/plural checks | TS-01 |
| DC-01 | Documentation | Needs improvement | `Float` wording stale in `coding-standards.md`; target architecture not yet documented | Medium | Fix drift and add the approved docs | None |

## Implementation phases

### Phase 1 — Shared contract and foundations

Locale identifiers, negotiation rules, preference precedence, translation
ownership, API error contract, and ADR adoption.

### Phase 2 — Backend alignment

Language negotiation fixes, request-scoped localisation, structured error
codes, Joi validation codes, catalogue corrections, email localisation, and
timezone-aware financial periods.

### Phase 3 — Mobile translation foundation

Install and configure `i18next`/`react-i18next`, integrate with
`LocaleContext`, establish feature catalogues, introduce translation hooks,
implement the language selector, synchronise explicit preferences, and
propagate `Accept-Language`.

### Phase 4 — Feature translation

Authentication, navigation, dashboard, transactions, planning, teams,
profile, notifications, AI chat, and error/accessibility messages.

### Phase 5 — Cross-platform verification

Guest-to-account transitions, preference synchronisation, API error
translation, background messages, financial formatting, offline behaviour,
and AI language defaults/overrides.

### Phase 6 — Quality assurance and rollout

Catalogue parity, placeholder validation, CI integration, regression tests,
translation review, accessibility, release readiness, and a third-language
procedure.

## Test requirements

- Negotiation: supported/unsupported locales, q-values, ordered lists, `*`,
  malformed tags, fallback.
- Authenticated/anonymous transitions, logout, and account switching.
- Stable API error codes and field-level validation codes.
- Language preference persistence and multi-device synchronisation.
- Runtime language switching and offline catalogue resolution.
- Currency/number/date/timezone formatting and monetary precision.
- Catalogue parity, placeholder compatibility, and pluralisation.
- Long translated strings, layout overflow, and accessibility labels.

## Acceptance criteria

- Every shipped mobile string resolves from the `en`/`fr` catalogues with
  deterministic `en` fallback.
- Unsupported locale input falls back, never errors, never persists.
- The API error envelope is backward compatible and carries stable codes.
- Email/notification formatting honours the recipient language, currency, and
  timezone.
- Explicit preferences synchronise across devices without loops.
- CI fails on catalogue drift, missing references, or malformed resources.

## Open implementation questions

- Exact `code` naming registry and its location (single source of truth).
- Whether the `lang` query parameter should reject or fall back on invalid
  values (the ADR specifies fallback; confirm the strict-query edge case).
- Translation review workflow and pseudolocalisation tooling.
- Whether AI responses may be requested in languages outside `en`/`fr`.

## Relationship to existing work

`tickets/packages/application-foundation-improvements/tasks/AFI-01/afi-01-t03-multilingual-multicurrency-foundations.md`
already covers device detection, Decimal migration, category IDs, and system
category labels — those areas are largely implemented and are **not** duplicated
by this roadmap. The work here extends into UI translation, negotiation, error
contracts, preference synchronisation, and QA.
