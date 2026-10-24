import path from 'path';
import { fileURLToPath } from 'url';
import i18n from 'i18n';
import { getDirectory } from '../utils/helpers.js';
import Config from './env.config.js';
import { APPLICATION_MODE } from '../constants/audit.actions.js';
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from '../constants/localization.js';

/**
 * Configure and export the shared `i18n` instance for request translation.
 */

// Configure i18n
i18n.configure({
    locales: SUPPORTED_LANGUAGES,
    defaultLocale: DEFAULT_LANGUAGE,
    directory: path.join(getDirectory(import.meta.url), '../locales'),
    queryParameter: 'lang',
    autoReload: Config.nodeEnv === APPLICATION_MODE.DEVELOPMENT,
    updateFiles: false,
    objectNotation: true
});


export default i18n;
