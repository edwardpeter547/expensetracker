# Localization and Currency Detection

ExpenseTracker detects its initial language and currency from the device and
keeps display formatting separate from stored monetary values.

> **Status.** Device language/currency detection, preference persistence,
> money/date formatting, and system-category labels described below are
> **implemented**. A full mobile UI translation layer
> (`i18next`/`react-i18next`), stable API error codes, preference
> synchronisation, and a language selection UI are the **approved target** and
> remain planned.

Related documents:

- [Internationalisation architecture](../architecture/internationalisation.md)
- [ADR 0004 — Internationalisation and Localisation Architecture](../decisions/0004-internationalisation-architecture.md)
- [Translation developer guide](translation-guide.md)
- [Financial localisation standards](financial-localisation.md)
- [Internationalisation gap analysis and roadmap](../audits/internationalisation-gap-analysis.md)

## Supported languages

The registry lives in two places and must stay in sync:

- Mobile: `src/mobile/src/localization/registry.ts`
- Backend: `src/backend/src/constants/localization.js`

Current languages: `en` and `fr`. A language is added only when complete
translation files exist on the backend (`src/backend/src/locales/<code>.json`)
and on the client.

## Detection

On first launch the mobile client reads the device's ordered locale list with
`expo-localization` and selects the first base language that is supported.
Currency is detected independently from the device locale's `currencyCode`,
falling back to an ISO 3166-1 region-to-currency map. The currency is never
derived from GPS, IP address, SIM card, or the selected language alone.

Precedence:

1. Explicit user override.
2. Device language and regional settings.
3. Documented fallback (`en`, `USD`).

Unknown or ambiguous regions fall back to `USD` and can be changed explicitly
by the user.

## Persistence and overrides

Overrides are stored in AsyncStorage under `preferences.language` and
`preferences.currency`. A missing override means "follow the device".
Authenticated preferences are also stored on the `User` profile and returned
by login/profile endpoints; the mobile client adopts those values during
session restoration.

Changing the device language or region never rewrites existing transactions or
budgets. It only changes the default used for newly created records.

## Monetary integrity

Monetary columns are Prisma `Decimal` and PostgreSQL `NUMERIC(19, 4)`:

- `Transaction.amount`
- `Transaction.currency`
- `Budget.amount`
- `Budget.currency`

The API serializes monetary values as canonical decimal strings. Localized
money input is parsed with `parseMoneyInput`, which uses string manipulation
only; display formatting uses `Intl.NumberFormat` and never changes storage.

Dashboard and budget totals aggregate only transactions whose `currency`
matches the user's default currency, so different currencies are never summed
without an approved conversion policy.

## System categories

System categories use stable identifiers (for example `sys.food`) that are
independent of their translated labels. The backend seeds these identifiers in
the decimal/category migration, and the mobile client resolves English/French
labels from `src/mobile/src/localization/systemCategories.ts`.

Transaction records reference the category through `Transaction.categoryId`.
Historical rows whose old free-text category name cannot be matched to exactly
one system or user-owned category remain `NULL` and are not arbitrarily mapped.

## Planned target architecture

The approved design extends — not replaces — the behaviours above. In the
target state:

- The mobile UI is translated through `i18next`/`react-i18next` feature-based
  catalogues, with `LocaleContext` supplying the resolved language.
- Explicit language/currency choices synchronise to `PUT /user/profile` when
  authenticated.
- API requests carry `Accept-Language`; the backend negotiates gracefully and
  returns a stable, localisable error `code`.
- `User.timezone` is applied to financial period boundaries.

The full specification, diagrams, and phased roadmap are in the documents
linked at the top of this page.
