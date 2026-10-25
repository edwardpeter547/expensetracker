/**
 * Regression tests for build-time Prisma configuration loading.
 *
 * `npx prisma generate` runs inside the Docker image without JWT_SECRET, so
 * the Prisma config must not import the runtime environment module that
 * validates that secret. These tests load the config with an empty JWT_SECRET
 * and confirm the build-time datasource URL is used.
 */
import { afterAll, beforeEach, describe, expect, jest, test } from '@jest/globals';

const originalJwtSecret = process.env.JWT_SECRET;
const originalMigrationUrl = process.env.MIGRATION_DATABASE_URL;
const originalDatabaseUrl = process.env.DATABASE_URL;

describe('prisma.config build-time loading', () => {
    beforeEach(() => {
        jest.resetModules();
        process.env.JWT_SECRET = '';
        process.env.MIGRATION_DATABASE_URL = 'postgresql://placeholder:placeholder@127.0.0.1:5432/placeholder';
        process.env.DATABASE_URL = '';
    });

    afterAll(() => {
        restoreEnv('JWT_SECRET', originalJwtSecret);
        restoreEnv('MIGRATION_DATABASE_URL', originalMigrationUrl);
        restoreEnv('DATABASE_URL', originalDatabaseUrl);
    });

    test('loads without JWT_SECRET and uses the build-time MIGRATION_DATABASE_URL', async () => {
        const { default: config } = await import('../../../prisma.config.js');

        expect(config.datasource.url).toBe(
            'postgresql://placeholder:placeholder@127.0.0.1:5432/placeholder'
        );
    });
});

/**
 * Restore an environment variable to its original value or remove it.
 *
 * @param {string} name The environment variable name.
 * @param {string|undefined} value The original value, if any.
 * @returns {void}
 */
function restoreEnv(name, value) {
    if (value === undefined) {
        delete process.env[name];
    } else {
        process.env[name] = value;
    }
}
