import { afterEach, describe, expect, jest, test } from '@jest/globals';

const STORAGE_KEYS = [
    'STORAGE_DRIVER',
    'STORAGE_LOCAL_ROOT',
    'STORAGE_S3_BUCKET',
    'STORAGE_S3_REGION',
    'STORAGE_S3_ENDPOINT',
];

/**
 * Remove storage configuration from the environment.
 *
 * @returns {void}
 */
const clearStorageEnv = () => {
    for (const key of STORAGE_KEYS) delete process.env[key];
};

/**
 * Reload the storage configuration module with a fresh module registry so it
 * re-reads the current environment.
 *
 * @returns {Promise<object>} The freshly imported storage.config module.
 */
const loadConfig = async () => {
    jest.resetModules();
    return import('../storage.config.js');
};

afterEach(clearStorageEnv);

describe('storage.config', () => {
    /**
     * With no driver configured, storage must be disabled and the adapter null,
     * so upload persistence is opt-in.
     */
    test('defaults to disabled when STORAGE_DRIVER is unset', async () => {
        clearStorageEnv();
        const { buildStorageConfig, getStorageAdapter } = await loadConfig();

        expect(buildStorageConfig().driver).toBe('disabled');
        expect(getStorageAdapter()).toBeNull();
    });

    /**
     * An absolute local root is used as-is by the local adapter.
     */
    test('builds a local adapter using the configured root', async () => {
        clearStorageEnv();
        process.env.STORAGE_DRIVER = 'local';
        process.env.STORAGE_LOCAL_ROOT = '/tmp/custom-uploads';
        const { buildStorageConfig, getStorageAdapter } = await loadConfig();

        expect(buildStorageConfig().local.rootDirectory).toBe('/tmp/custom-uploads');
        expect(getStorageAdapter().constructor.name).toBe('LocalStorageAdapter');
    });

    /**
     * Selecting S3 without a bucket and region must fail configuration rather
     * than leaving a permanently broken upload endpoint.
     */
    test('fails when s3 is selected without required configuration', async () => {
        clearStorageEnv();
        process.env.STORAGE_DRIVER = 's3';
        const { buildStorageConfig } = await loadConfig();

        expect(() => buildStorageConfig()).toThrow('STORAGE_S3_BUCKET and STORAGE_S3_REGION');
    });

    /**
     * An unknown driver must fail fast.
     */
    test('fails for an unknown driver', async () => {
        clearStorageEnv();
        process.env.STORAGE_DRIVER = 'ftp';
        const { buildStorageConfig } = await loadConfig();

        expect(() => buildStorageConfig()).toThrow('Unsupported storage driver: ftp');
    });
});
