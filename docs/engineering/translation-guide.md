# Translation Developer Guide

This guide explains how translations are organised and how to add and use them
across the backend and the Expo mobile application.

> **Status note.** Backend `i18n-node` usage described here already exists.
> Mobile `i18next` / `react-i18next` usage is the approved target and is
> **proposed, not yet implemented**; those examples are labelled
> `Proposed (not yet implemented)`.

## Backend translation files

Backend translations are authored as ES modules in `src/backend/translations/`
and generated into JSON in `src/backend/src/locales/`:

```text
src/backend/translations/en.js   # source of truth (template literals)
src/backend/translations/fr.js
src/backend/src/locales/en.json  # generated for i18n-node
src/backend/src/locales/fr.json
```

Regenerate after editing:

```bash
node --experimental-vm-modules src/backend/scripts/generate.locales.js
```

Keys are `UPPER_SNAKE_CASE`. Interpolation uses double-brace placeholders:

```js
// src/backend/translations/en.js
export default {
    WELCOME_EMAIL_SUBJECT: '{{brandName}} Registration Successful — Verify Your Email',
};
```

Use a translation in a controller (existing pattern):

```js
response.status(201).json({
    success: true,
    message: request.__('RESPONSE_MSG_USER_CREATED'),
    data: { user, accessToken, refreshToken },
    errors: null,
});
```

Use a translation without a request (existing pattern, for email):

```js
const subject = i18n.__(
    { phrase: 'WELCOME_EMAIL_SUBJECT', locale: user.language || 'en' },
    { brandName: Config.brandName },
);
```

## Mobile translation files (proposed)

Mobile resources are feature-based `i18next` namespaces:

```text
src/mobile/src/i18n/
  index.ts              # i18next initialisation
  locales/
    en/
      common.json
      auth.json
      dashboard.json
      transactions.json
      planning.json
      teams.json
      profile.json
      notifications.json
      ai.json
    fr/
      common.json
      auth.json
      ...
```

```text
Proposed (not yet implemented)
```

The namespaces reflect the current feature organisation: `common`, `auth`,
`dashboard`, `transactions`, `planning`, `teams`, `profile`, `notifications`,
and `ai`.

## Initialising i18next (proposed)

```tsx
// Proposed (not yet implemented) — src/mobile/src/i18n/index.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en';
import fr from './locales/fr';

export const SUPPORTED_LANGUAGES = ['en', 'fr'] as const;
export const DEFAULT_LANGUAGE = 'en';

i18n.use(initReactI18next).init({
    resources: {
        en: { translation: en },
        fr: { translation: fr },
    },
    lng: DEFAULT_LANGUAGE,
    fallbackLng: DEFAULT_LANGUAGE,
    interpolation: { escapeValue: false },
});

export default i18n;
```

`i18next` resolves region tags (`en-GB`, `fr-CA`) to their base language via
its fallback configuration, while `LocaleContext` remains the source of truth
for the detected/selected language and calls `i18n.changeLanguage(...)`.

## Using translations in components (proposed)

```tsx
// Proposed (not yet implemented)
import { useTranslation } from 'react-i18next';

const WelcomeScreen = () => {
    const { t } = useTranslation('auth');
    return <Text>{t('welcome.getStarted')}</Text>;
};
```

Nested keys use dot notation and are organised by namespace:

```json
{
  "welcome": {
    "tagline": "Take control of your finances",
    "getStarted": "Get Started",
    "signIn": "Sign In"
  }
}
```

## Interpolation and pluralisation

```json
{
  "transactions": {
    "count_one": "{{count}} transaction",
    "count_other": "{{count}} transactions"
  }
}
```

```tsx
// Proposed (not yet implemented)
t('transactions.count', { count: 3 }); // "3 transactions"
```

Backend `i18n-node` pluralisation follows its documented key suffix
convention; adopt it only where plural copy is actually required.

## Accessibility translations

Accessibility labels are translations too and must be extracted with the
visible text:

```tsx
// Proposed (not yet implemented)
<Pressable
    accessibilityRole="button"
    accessibilityLabel={t('welcome.getStarted')}
>
    <Text>{t('welcome.getStarted')}</Text>
</Pressable>
```

## Runtime language switching (proposed)

`LocaleContext` is the single entry point. It persists the choice and calls
`i18n.changeLanguage(language)` so all mounted `useTranslation` consumers
re-render immediately:

```tsx
// Proposed (not yet implemented)
const { language, setLanguage } = useLocale();
await setLanguage('fr'); // updates context + cache + i18next
```

No restart is required. Navigation titles, active screens, forms, validation
messages, and accessibility labels all react to the changed language.

## Backend error-code translation (proposed)

The backend emits a stable `code`; the mobile app maps codes to localised
messages:

```ts
// Proposed (not yet implemented)
const t = i18n.getFixedT(language, 'errors');
const message = t(error.code, {
    defaultValue: error.message,
    ...error.params,
});
```

Unknown codes fall back to `error.message`, then to a generic error string.

## Adding a new language

1. Add `src/backend/translations/<code>.js`.
2. Run `node --experimental-vm-modules src/backend/scripts/generate.locales.js`.
3. Add `src/mobile/src/i18n/locales/<code>/` with every namespace.
4. Add `<code>` to `src/backend/src/constants/localization.js` and
   `src/mobile/src/localization/registry.ts` (and to the mobile i18n
   resources).
5. Run the catalogue parity and CI checks.

## Running translation validation

```bash
cd src/backend && npm test                  # backend suites
cd src/mobile && npm test                   # node --test (API + localization)
cd src/mobile && npm run test:components    # Jest component suites
cd src/mobile && npm run test:typecheck
cd src/mobile && npm run lint
```

CI additionally enforces catalogue parity, missing-reference detection,
placeholder compatibility, and invalid-resource checks (see the gap-analysis
documentation).

## Avoiding hardcoded strings and anti-patterns

- Do not concatenate fragments that grammar order differs between languages
  (`"Delete " + name`) — use full strings with interpolation.
- Do not use the same key for a noun and a verb.
- Do not assume word order, plural rules, or separator symbols are identical
  across languages.
- Do not embed currency symbols in copy; format money with `Intl`.
- Do not translate user-generated content.
- Do not treat language as a proxy for currency, country, or timezone.
