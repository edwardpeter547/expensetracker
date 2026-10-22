/**
 * @file generate.locales.js
 * @author Peter Goteh Yaanwa <edwardpeter547@gmail.com>
 * @organization Retep Systems
 * @description Locale generation script — converts translation JS files to JSON for i18n
 *
 * Reads translation files from the translations/ directory (written as ES module .js files
 * with template literals for readability), cleans up whitespace, and writes them as JSON
 * files in the locales/ directory for consumption by the i18n library.
 *
 * Translations are authored in .js files to leverage template literals (multiline strings),
 * then this script converts them to the .json format that i18n-node requires.
 *
 * @module generate.locales
 * @usage node --experimental-vm-modules scripts/generate.locales.js
 */

import fs from 'fs'
import path from 'path';
import { getDirectory } from '../src/utils/helpers.js';
import logger from '../src/configurations/logger.config.js';

const __dirname = getDirectory(import.meta.url);

/**
 * Discovers all available language codes from the translations directory
 *
 * Reads the translations/ directory, extracts filenames, and returns
 * an array of language codes by stripping the .js extension.
 *
 * @returns {string[]} Array of language codes (e.g., ['en', 'fr', 'es'])
 *
 * @example
 * // If translations/ contains en.js, fr.js, es.js
 * getLanguages(); // Returns ['en', 'fr', 'es']
 */
const getLanguages = () => {
    const transDir = path.join(__dirname, '../translations');
    const transFiles = fs.readdirSync(transDir);
    return transFiles.map(language => (language.split('.')[0]));
}

/**
 * Cleans up whitespace from translation strings
 *
 * Removes leading/trailing whitespace and collapses all internal whitespace
 * (newlines, tabs, multiple spaces) into single spaces. This ensures the
 * JSON output is clean and compact, relying on HTML tags (p, br, etc.)
 * for visual formatting rather than raw whitespace.
 *
 * @param {string} str - The raw translation string from a template literal
 * @returns {string} Cleaned string with normalized whitespace
 *
 * @example
 * clean(`
 *     <h1>Welcome!</h1>
 *     <p>Hello.</p>
 * `);
 * // Returns: "<h1>Welcome!</h1> <p>Hello.</p>"
 */
const clean = (str) => {
    return str
        .trim()
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Converts all translation .js files to .json format
 *
 * Iterates over all language files in the translations/ directory,
 * dynamically imports each one, cleans the translations, and writes
 * them as formatted JSON files in the locales/ directory for i18n.
 *
 * @async
 * @returns {Promise<void>}
 *
 * @throws Will log an error and exit if a translation file fails to load
 *
 * @example
 * // Converts translations/en.js → src/locales/en.json
 * // Converts translations/fr.js → src/locales/fr.json
 * convert();
 */
const convert = async () => {
    const languages = [...getLanguages()];
    for (const language of languages) {
       const jsonFile = path.join(__dirname, `../src/locales/${language}.json`);

       // Dynamically import the JS translation file
       const { default: translations } = await import(
            path.join(__dirname, `../translations/${language}.js`)
       );

       // Clean whitespace from all translation values (preserve keys)
       const cleaned = Object.fromEntries(
            Object.entries(translations).map(([key, value]) => [key, clean(value)])
       );

       // Write as formatted JSON
       fs.writeFileSync(jsonFile, JSON.stringify(cleaned, null, 4) + '\n');
    }

    logger.info(`✅ Locales generated for the the following language: [${languages.join(', ')}]`);
    console.log(`✅ Locales generated for the the following languages: [${languages.join(', ')}]`);
}

convert();
