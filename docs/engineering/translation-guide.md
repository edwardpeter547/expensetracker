# Translation Developer Guide

This guide explains how ExpenseTracker organises translations and how to add
and use them across the backend and the Expo mobile application.

The backend uses `i18n-node` with generated JSON catalogues. The mobile app
uses `i18next` / `react-i18next` with TypeScript catalogues. The mobile
`common`, `auth`, `dashboard`, `transactions`, `planning`, `teams`, `profile`,
and `notifications` namespaces are implemented.

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

Use a translation in a controller:

```js
response.status(201).json({
    success: true,
    message: request.__('RESPONSE_MSG_USER_CREATED'),
    data: { user, accessToken, refreshToken },
    errors: null,
});
```

Use a translation without a request, for example when rendering email:

```js
const subject = i18n.__(
    { phrase: 'WELCOME_EMAIL_SUBJECT', locale: user.language || 'en' },
    { brandName: Config.brandName },
);
```

## Mobile translation files

Mobile translation data lives in two folders:

```text
src/mobile/src/i18n/
  index.ts                                # i18next initialisation
  locales/
    en/
      auth.ts
      dashboard.ts
      transactions.ts
      planning.ts
      teams.ts
      profile.ts
      notifications.ts
      errors.ts
      index.ts
    fr/
      auth.ts
      dashboard.ts
      transactions.ts
      planning.ts
      teams.ts
      profile.ts
      notifications.ts
      errors.ts
      index.ts
  messages/
    auth.ts                               # generated
    dashboard.ts                          # generated
    transactions.ts                       # generated
    planning.ts                           # generated
    teams.ts                              # generated
    profile.ts                            # generated
    notifications.ts                      # generated
    common.ts                             # hand-maintained
    planningPlurals.ts                    # hand-maintained
    teamsPlurals.ts                       # hand-maintained
    types.ts
    build.ts
scripts/
  build-message-catalogues.mjs
```

### `locales/` — authoring layer

`locales/<language>/<namespace>.ts` is where translations are authored. Files
are keyed by a readable path, with one file per language:

```ts
// locales/en/auth.ts
export default {
    login: {
        title: 'Sign in',
        email: 'Email address',
    },
};
```

```ts
// locales/fr/auth.ts
export default {
    login: {
        title: 'Se connecter',
        email: 'Adresse e-mail',
    },
};
```

English is the canonical fallback. The English file is also the source of the
keys used at runtime.

### `messages/` — runtime layer

`messages/<namespace>.ts` is the generated catalogue consumed by the app.
Each English string is the runtime key and maps to every supported language:

```ts
// messages/auth.ts (generated)
const messages: MessageCatalogue = {
    "Sign in": { en: "Sign in", fr: "Se connecter" },
    "Email address": { en: "Email address", fr: "Adresse e-mail" },
};
```

Components therefore call `t('Sign in')` rather than `t('login.title')`.

`messages/common.ts`, `messages/planningPlurals.ts`, and
`messages/teamsPlurals.ts` are hand-maintained because they contain shared
strings and i18next plural forms respectively. They are not overwritten by
the generator.

## Generating mobile catalogues

Run from `src/mobile`:

```bash
node scripts/build-message-catalogues.mjs
```

Or use the Task orchestration from the repository root:

```bash
task mobile:translate
```

The script takes no command-line arguments. It:

1. Reads `SUPPORTED_LANGUAGES` from
   `src/mobile/src/localization/registry.ts`.
2. Loads every `locales/<language>/<namespace>.ts` file for the namespaces
   `auth`, `dashboard`, `transactions`, `planning`, `teams`, `profile`, and
   `notifications`.
3. Uses the English file as the source of runtime keys.
4. Looks up the same key path in every other language.
5. Writes the per-language source-as-key catalogues to `messages/`.

If a translation is missing in a language, the generator falls back to the
English source for that language so the catalogue stays complete. Missing
locale files are an error and fail the build.

## Initialising i18next

`src/mobile/src/i18n/index.ts` initialises i18next from the generated
catalogues and the key-based `errors` namespace:

```ts
const sourceResources = buildLanguageResources(catalogues, plurals, SUPPORTED_LANGUAGES);

i18n.use(initReactI18next).init({
    resources: sourceResources,
    lng: DEFAULT_LANGUAGE,
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: [...SUPPORTED_LANGUAGES],
    ns: [...I18N_NAMESPACES],
    defaultNS: 'common',
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
});
```

## Using translations in components

```tsx
import { useTranslation } from 'react-i18next';

const WelcomeScreen = () => {
    const { t } = useTranslation('auth');
    return <Text>{t('Sign in')}</Text>;
};
```

Use the English source string as the key. Do not use the key path from the
`locales/` authoring files.

## Interpolation and pluralisation

Interpolation is part of the source string:

```ts
t('We sent a 6-digit code to {{channel}}', { channel });
```

i18next plural forms use `_one` and `_other` suffixes. Shared plurals live in
`messages/common.ts`; planning-specific plurals live in
`messages/planningPlurals.ts`; team-specific plurals live in
`messages/teamsPlurals.ts`:

```ts
// messages/planningPlurals.ts
export default {
    en: {
        activeGoals_one: '{{count}} active goal',
        activeGoals_other: '{{count}} active goals',
    },
    fr: {
        activeGoals_one: '{{count}} objectif actif',
        activeGoals_other: '{{count}} objectifs actifs',
    },
};
```

```tsx
t('activeGoals', { count: goals.length });
```

## Accessibility translations

Accessibility labels and hints are translations too and use the same source
keys as visible text:

```tsx
<Pressable
    accessibilityRole="button"
    accessibilityLabel={t('Create account')}
>
    <Text>{t('Create account')}</Text>
</Pressable>
```

## Runtime language switching

`LocaleContext` persists the choice and calls `i18n.changeLanguage(language)`.
Mounted `useTranslation` consumers re-render without a restart.

## Adding a new language

1. Add the language to both supported-language registries:

   - `src/backend/src/constants/localization.js`
   - `src/mobile/src/localization/registry.ts`

2. Add the backend source file and regenerate backend JSON:

   ```bash
   # create src/backend/translations/<code>.js
   node --experimental-vm-modules src/backend/scripts/generate.locales.js
   ```

3. Add the mobile authoring files:

   ```text
   src/mobile/src/i18n/locales/<code>/auth.ts
   src/mobile/src/i18n/locales/<code>/dashboard.ts
   src/mobile/src/i18n/locales/<code>/transactions.ts
   src/mobile/src/i18n/locales/<code>/planning.ts
   src/mobile/src/i18n/locales/<code>/teams.ts
   src/mobile/src/i18n/locales/<code>/profile.ts
   src/mobile/src/i18n/locales/<code>/notifications.ts
   src/mobile/src/i18n/locales/<code>/errors.ts
   src/mobile/src/i18n/locales/<code>/index.ts
   ```

4. Add the new language's entries to the hand-maintained catalogues:

   - `src/mobile/src/i18n/messages/common.ts`
   - `src/mobile/src/i18n/messages/planningPlurals.ts`
   - `src/mobile/src/i18n/messages/teamsPlurals.ts`

5. Register the new language's keyed resources in
   `src/mobile/src/i18n/index.ts`.

6. Regenerate the mobile feature catalogues:

   ```bash
   cd src/mobile
   node scripts/build-message-catalogues.mjs
   ```

7. Run validation and CI parity checks.

The generator and resource builder iterate over `SUPPORTED_LANGUAGES`, so no
two-language logic needs changing.

## Running translation validation

```bash
cd src/backend && npm test                  # backend suites
cd src/mobile && npm test                   # node --test (API + localization)
cd src/mobile && npm run test:components    # Jest component suites
cd src/mobile && npm run test:typecheck
cd src/mobile && npm run lint
```

CI additionally enforces catalogue parity, missing-reference detection,
placeholder compatibility, and invalid-resource checks.

## Avoiding hardcoded strings and anti-patterns

- Do not concatenate fragments whose grammar order differs between languages
  (`"Delete " + name`); use a full source string with interpolation.
- Do not use the same source string for a noun and a verb.
- Do not assume word order, plural rules, or separators are identical across
  languages.
- Do not embed currency symbols in copy; format money with `Intl`.
- Do not translate user-generated content.
- Do not treat language as a proxy for currency, country, or timezone.
