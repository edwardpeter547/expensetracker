# 0004. Internationalisation and Localisation Architecture

**Status:** Accepted
**Date:** 2026-11-10

## Context

ExpenseTracker (the repository and its technical identifiers) and AuditWallet
(the product-facing brand adopted by the Expo mobile application) already
contain partial multilingual capability:

- The backend uses `i18n-node` with generated `en`/`fr` catalogues in
  `src/backend/src/locales`, authored from `src/backend/translations`, a
  request language middleware, and locale-aware transactional email.
- The mobile application detects device language and currency with
  `expo-localization`, persists overrides in AsyncStorage, and formats money
  and dates with `Intl`; it has no UI translation catalogue and hardcodes
  English strings.
- `User` stores `language`, `currency`, `timezone`, and `theme`; monetary
  columns are Prisma `Decimal` / PostgreSQL `NUMERIC(19,4)`.

A repository-wide audit
(`docs/audits/internationalisation-gap-analysis.md`) identified concrete gaps
in negotiation, error contracts, catalogue hygiene, preference
synchronisation, and mobile UI translation. This ADR records the approved
target architecture and the fourteen decision statements that govern it.
It describes the intended design, not the currently deployed behaviour.

## Problem statement

The product needs reliable English and French support now and the ability to
add further languages without redesign. The current implementation is
asymmetric: the backend is partially localised while the mobile UI is not, and
the two sides share no formal locale, preference, or error contract. Without a
single agreed architecture, further work would diverge and duplicate
catalogues.

## Decision

The approved internationalisation architecture is the target design. The
labels `ADR-01` to `ADR-14` below are the numbered decision statements
recorded by this ADR; the detailed design lives in
[`docs/architecture/internationalisation.md`](../architecture/internationalisation.md).

### ADR-01 — Translation engines

Retain the existing `i18n-node` infrastructure on the backend. Adopt
`i18next` and `react-i18next` as the standard mobile UI translation framework,
integrated with the existing locale-detection and preference infrastructure
rather than replacing it.

### ADR-02 — Supported languages

Initially support English (`en`) and French (`fr`). English is the canonical
fallback. The architecture must admit additional languages without redesign.

### ADR-03 — Regional language matching

Use language-only catalogue identifiers with BCP 47-compatible parsing and
canonicalisation. Regional variants (`en-GB`, `fr-CA`) match their base
catalogue; unsupported languages fall back to `en`. A translation language
never determines currency, country, or timezone.

### ADR-04 — Language preference precedence

For mobile UI rendering: (1) explicit in-app selection, (2) authenticated
account preference, (3) supported device language, (4) English fallback. An
explicit selection applies immediately; automatic detection is not a
permanent preference. Authenticated API requests propagate the effective
language through `Accept-Language`; background operations use the saved
recipient preference. Each execution context has a deterministic resolution
policy.

### ADR-05 — Guest-to-account preference transition

An explicit guest language choice is preserved after login and synchronised
to the account. A device-detected default never overwrites an existing
account preference. Distinguish explicit versus detected guest language,
existing account preference, pending local synchronisation, success, and
failure, and define offline behaviour and retry without synchronisation
loops between `LocaleContext`, `AuthContext`, and the profile API.

### ADR-06 — Translation ownership

The mobile application owns navigation labels, screen titles, buttons, form
labels, client-side validation, loading/empty states, accessibility labels,
and client-side error presentation. The backend owns server-generated emails,
background notifications, backend-generated reports, server-side validation
and domain error semantics, and API response localisation. Catalogues stay
separate; the backend catalogue is not duplicated in the mobile app.

### ADR-07 — API error contract

Introduce a backward-compatible structured error contract with a stable
machine-readable `code`, optional interpolation `params`, a localised
human-readable `message`, and field-level validation errors. Existing
`success`/`status`/`message`/`errors` fields remain compatible.

### ADR-08 — Translation catalogue organisation

Mobile resources use feature-based namespaces (`common`, `auth`, `dashboard`,
`transactions`, `planning`, `teams`, `profile`, `notifications`, `ai`),
refined to match the actual feature structure. Backend catalogues retain the
existing generation pipeline.

### ADR-09 — Financial localisation

Language, currency, region, and timezone are independent settings. Preserve
Decimal precision, canonical decimal API values, explicit ISO currency
identifiers, stable system-category identifiers, original financial values,
and existing backend calculations. Formatting never converts currency or
mutates stored values. Timezone-aware financial period boundaries are part of
the implementation roadmap.

### ADR-10 — Language preference persistence

The backend is the persistent account-level preference store for
authenticated users. The mobile application keeps a local cache for immediate
rendering and offline access. Hydration, precedence, synchronisation failure,
logout, account switching, guest usage, and multi-device concurrency are
defined. No database migration is required by this ADR; the existing
`User.language`/`currency`/`timezone`/`theme` columns are sufficient.

### ADR-11 — Language selection interface

The initial mobile rollout includes a language selector in Profile/Settings
with "Follow device language", "English", and "Français". The choice applies
throughout the app without a restart where technically feasible, including
navigation titles, active screens, forms, validation messages, and
accessibility labels. This is a future implementation requirement.

### ADR-12 — AI-generated content localisation

AuditWallet's AI chat defaults to the effective application language and
allows an explicit per-request response language. The application interface
language, the default AI response language, and an explicit user-requested
response language are distinct. The assistant never automatically translates
transaction descriptions, merchant names, or other user-authored records.

### ADR-13 — Automated translation quality assurance

Introduce CI checks for catalogue key completeness, English/French parity,
missing references, placeholder compatibility, pluralisation, invalid
resources, unsupported-locale fallback, stable error-code mappings, runtime
language switching, and financial formatting regressions, integrated with the
existing backend and mobile runners.

### ADR-14 — Documentation and governance

Architecture decisions, developer instructions, localisation standards, and
implementation guidance are maintained in the existing version-controlled
`docs/` system and integrated with its indexes.

## Rationale

- Reusing `i18n-node` and the mobile locale-detection layer preserves working
  behaviour and limits migration risk.
- `i18next`/`react-i18next` provide namespace, interpolation, pluralisation,
  fallback, and runtime-switching support that the current mobile app lacks,
  without requiring a custom framework.
- Language-only catalogue identifiers keep catalogues small and match the
  current `en`/`fr` assets while remaining BCP 47 compatible.
- Stable error codes decouple client presentation from English server prose
  and make messages localisable without breaking existing consumers.
- Backend ownership of server-generated content and mobile ownership of UI
  strings avoids catalogue duplication and keeps responsibilities clear.

## Alternatives considered

- **Keep the mobile UI hardcoded and localise only the backend.** Rejected:
  the mobile app is the primary product surface and would remain unusable for
  French users.
- **Add a third-party translation service or a new backend framework.**
  Rejected: unnecessary for two languages and incompatible with the
  KISS/YAGNI standards.
- **Use a single shared catalogue shipped to both clients.** Rejected: it
  would couple the two deployables and make feature-specific UI strings harder
  to evolve.
- **Duplicate the backend catalogue in mobile.** Rejected as redundant;
  shared contracts cover identifiers and parameters instead.
- **Treat language as determining currency or region.** Rejected: these are
  independent settings and must remain so.

## Consequences

**Positive**

- A single, documented contract for locales, preferences, errors, and
  translation ownership.
- Incremental, backwards-compatible rollout; existing API consumers are not
  broken.
- Adding a third language becomes a catalogue and registry addition rather
  than an architectural change.

**Negative / cost**

- The mobile app gains a new dependency (`i18next`, `react-i18next`) and a
  large mechanical string-extraction effort.
- The backend error path must be touched across controllers and middleware to
  introduce stable codes.
- Dual catalogue maintenance requires CI parity checks to prevent drift.

## Compatibility requirements

- Existing response keys (`success`, `status`, `message`, `errors`) remain.
- New `code`/`params` fields are additive.
- Existing `en`/`fr` backend catalogues and the generation pipeline remain.
- `User` preference columns and the Decimal money model remain unchanged.
- The repository name, package names, namespaces, and technical identifiers
  remain `ExpenseTracker`; `AuditWallet` is used only for product-facing text.

## Security considerations

- Translation parameters are interpolated, never interpreted as HTML, except
  where an explicitly trusted email template renders HTML.
- Untrusted user input is never passed through as a translation key.
- Locale input is validated and canonicalised; malformed or unsupported
  values fall back, never propagate, and never persist.
- Preference updates remain authenticated and ownership-scoped through the
  existing profile endpoint.
- Error responses must not leak sensitive financial or personal data beyond
  documented, parameterised values.

## Migration implications

- No database migration is required.
- Mobile dependency installation and catalogue extraction are implementation
  phases, not part of this documentation task.
- The error-contract change is additive and rolled out alongside coded
  `AppError` conversions.

## Future extensibility

Adding a language means: add the backend `translations/<code>.js`, regenerate
`locales/<code>.json`, add the mobile namespace catalogue, add `<code>` to
both supported-language registries, and run the CI parity checks. Regional
formatting information can be added independently without changing
catalogues.

## References

- [Internationalisation architecture](../architecture/internationalisation.md)
- [Translation developer guide](../engineering/translation-guide.md)
- [Financial localisation standards](../engineering/financial-localisation.md)
- [Internationalisation gap analysis and roadmap](../audits/internationalisation-gap-analysis.md)
- [Localization and currency detection](../engineering/localization.md)
