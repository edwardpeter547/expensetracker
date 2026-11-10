# Financial Localisation Standards

These standards govern how AuditWallet presents monetary and date values
across locales without compromising stored financial data. Language, currency,
region, and timezone are independent settings.

## Decimal precision

Monetary columns are Prisma `Decimal` and PostgreSQL `NUMERIC(19,4)`:

- `Transaction.amount` — `src/backend/src/prisma/models/transactions.prisma`
- `Budget.amount` — `src/backend/src/prisma/models/budget.prisma`

All arithmetic uses Decimal (via `src/backend/src/utils/money.js`), never
binary floating point. Rounding happens once at a documented presentation
boundary, not repeatedly during sums.

## Canonical monetary values

The API serialises monetary values as canonical decimal strings such as
`"1234.56"`. Input to the backend is canonical; localised input is converted
by the mobile client before submission.

- Backend: `toCanonicalDecimal(value, maxDecimalPlaces = 4)` and
  `sumMoney(values)` in `src/backend/src/utils/money.js`.
- Mobile: `parseMoneyInput(raw, locale)` and `formatMoney(...)` in
  `src/mobile/src/localization/format.ts`.

## Currency codes

Currency is stored and transmitted as an uppercase ISO 4217 code (for example
`USD`, `GBP`, `EUR`). It is validated against ICU's currency list on the
backend (`src/backend/src/validations/common.validation.js`). Formatting a
value in a currency is presentation, never conversion; no exchange rate is
applied implicitly.

## Currency formatting

Display formatting uses `Intl.NumberFormat` with the resolved locale and
currency:

```ts
// Existing mobile utility
const formatted = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
}).format(Number(amount));
```

Currency symbols must not be hardcoded in copy. The backend email templates
must use the same `Intl` approach instead of locale-blind helpers.

## Numeric input parsing

The decimal separator is locale-dependent (`1.234,56` in `fr-FR` versus
`1,234.56` in `en-US`). `parseMoneyInput` uses string manipulation only and
produces a canonical decimal string; it never performs floating-point
arithmetic.

The backend `decimalAmount` schema accepts canonical strings matching
`/^\d+(\.\d{1,4})?$/` and normalises them with `toCanonicalDecimal`.

## Locale-sensitive date formatting

Dates are formatted with `Intl.DateTimeFormat` and the resolved locale.
Relative labels (`Today`, `Yesterday`) must come from the translation
catalogue rather than being hardcoded, because they vary by language.

## Timezone-aware reporting periods

Timestamps are stored in UTC. Financial periods such as "this month" must be
derived from the user's IANA timezone, not the server's local clock. The
approved roadmap includes applying `User.timezone` to dashboard and budget
period boundaries; this is currently missing.

## Transaction date semantics

A transaction's `transactionDate` is preserved verbatim. Presentation may
convert it to the user's timezone for display, but storage and export retain
the original value. Presentation never rewrites a stored date.

## Original versus converted amounts

Only the original amount and currency are authoritative. If conversion is
introduced later, it must record the source amount, source currency, rate,
rate timestamp, and target currency, and must never replace the original
value.

## System-defined versus user-defined category labels

System categories use stable identifiers (`sys.food`) mapped to `en`/`fr`
labels in `src/mobile/src/localization/systemCategories.ts`. User-created
category names are displayed verbatim and are never translated.

## Financial correctness tests

Required regression coverage includes:

- Canonical decimal parsing and serialisation.
- Locale decimal/comma input parsing.
- Exact Decimal sums and balances.
- Currency-scoped aggregation (never summing across currencies).
- Locale/currency display formatting.
- Timezone boundary tests for monthly periods and budget rollover.
- No mutation of stored values during formatting.
