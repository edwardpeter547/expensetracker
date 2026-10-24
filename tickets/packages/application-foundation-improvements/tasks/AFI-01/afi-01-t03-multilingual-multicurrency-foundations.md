### Description

Correct existing financial and localization implementations to establish safe multilingual, multi-currency foundations across backend, mobile, and PostgreSQL.

### Task List

- [ ] Detect device language from ordered preferences with English/French support and fallback.
- [ ] Detect default currency independently using device region/currency metadata.
- [ ] Preserve independent language/currency preference infrastructure without building Settings UI.
- [ ] Replace Float money storage with Prisma Decimal / PostgreSQL NUMERIC(19,4).
- [ ] Use canonical decimal-string API values and exact monetary arithmetic.
- [ ] Add transaction and budget currency fields without mixing currencies in totals.
- [ ] Add `Transaction.categoryId` and enforce user/system category ownership.
- [ ] Aggregate budget spending by category ID and matching budget currency.
- [ ] Use stable IDs and English/French labels for system categories.
- [ ] Apply the development migration and record regression results and outstanding integration limitations.

### Technical Details

The pending migration was `20261023000000_decimal_and_currency`; PostgreSQL requires `ROUND(amount::numeric, 4)` for Float-to-NUMERIC conversion. The developer reports applying the corrected migration to an initially empty development database. Nullable historical fields and reconciliation policies must not silently invent currencies or category relationships. Deletion constraints should preserve financial history.

### DOD

- [ ] Schema and services implement exact, currency-aware financial calculations.
- [ ] Device language and currency detection remain independent.
- [ ] System category labels localize without translating user-created names.
- [ ] Development migration is applied successfully.
- [ ] Backend/mobile tests and skipped/unverified integration cases are accurately documented.

### Dependencies

Parent story AFI-01.

### Additional Context

Retrospective improvements work. Do not build Settings UI, exchange-rate conversion, or new features. Do not assert real PostgreSQL integration tests passed without evidence.

### Related Issues / PRs

- Parent Epic: #29
- Parent Story: AFI-01
- Same improvements PR as AFI-01-T01 and AFI-01-T02.
