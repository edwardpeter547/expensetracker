/**
 * Jest setup that silences application logging during tests.
 *
 * These environment variables are set before any backend module is imported so
 * that `env.config.js` (and therefore the integration tests' disposable
 * DATABASE_URL) are not loaded prematurely. The logger and dotenv honor the
 * flags at their own import time.
 */
process.env.DOTENV_CONFIG_QUIET = 'true';
process.env.LOG_SILENT = 'true';
