/**
 * Generate source-as-key message catalogues from the key-based locale files.
 *
 * Reads `src/i18n/locales/<language>/<ns>.ts` for every supported language and
 * writes `src/i18n/messages/<ns>.ts` where each English string is the key and
 * its value is a per-language translation map. Plural resources are skipped
 * because they are already expressed in the hand-authored plural catalogues.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const locales = path.join(root, 'src', 'i18n', 'locales');
const messages = path.join(root, 'src', 'i18n', 'messages');

const namespaces = ['auth', 'dashboard', 'transactions', 'planning', 'teams', 'profile', 'notifications'];

const { SUPPORTED_LANGUAGES } = await import(
    path.join(root, 'src', 'localization', 'registry.ts')
);

const localeFiles = {};
for (const language of SUPPORTED_LANGUAGES) {
    localeFiles[language] = {};
    for (const namespace of namespaces) {
        localeFiles[language][namespace] = (
            await import(path.join(locales, language, `${namespace}.ts`))
        ).default;
    }
}

for (const namespace of namespaces) {
    const en = localeFiles.en[namespace];
    const sourcePaths = {};

    const flatten = (source, prefix = '') => {
        for (const [key, value] of Object.entries(source)) {
            const fullKey = prefix ? `${prefix}.${key}` : key;
            if (value && typeof value === 'object') {
                flatten(value, fullKey);
            } else if (typeof value === 'string') {
                sourcePaths[value] = fullKey;
            }
        }
    };

    flatten(en);

    const lines = Object.entries(sourcePaths)
        .map(([source, sourcePath]) => {
            const translations = { en: source };
            for (const language of SUPPORTED_LANGUAGES) {
                if (language === 'en') continue;
                const translation = sourcePath
                    .split('.')
                    .reduce(
                        (node, part) => node?.[part],
                        localeFiles[language][namespace],
                    );
                translations[language] =
                    typeof translation === 'string' ? translation : source;
            }
            const entries = SUPPORTED_LANGUAGES.map(
                (language) =>
                    `${JSON.stringify(language)}: ${JSON.stringify(translations[language])}`,
            ).join(', ');
            return `    ${JSON.stringify(source)}: { ${entries} },`;
        })
        .join('\n');

    const content = `import type { MessageCatalogue } from './types';\n\n/**\n * \`${namespace}\` message catalogue (English source -> per-language translation).\n */\nconst messages: MessageCatalogue = {\n${lines}\n};\n\nexport default messages;\n`;

    fs.writeFileSync(path.join(messages, `${namespace}.ts`), content);
    console.log(`Wrote ${namespace}`);
}
