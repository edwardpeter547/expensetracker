import path from 'path';
import Config from './env.config.js';
import { createStorageAdapter } from '../storage/storage.factory.js';
import { getDirectory } from '../utils/helpers.js';

/**
 * The backend package root, used to resolve relative storage roots against a
 * fixed location instead of the process working directory.
 */
const BACKEND_ROOT = path.resolve(getDirectory(import.meta.url), '../..');

/**
 * Resolve the local storage root.
 *
 * Relative roots are resolved against the backend package root; absolute roots
 * are used as-is. The default is `<backend>/uploads`.
 *
 * @param {string} configured The configured root, possibly empty.
 * @returns {string} The absolute storage root.
 */
const resolveLocalRoot = (configured) => {
    if (!configured) return path.join(BACKEND_ROOT, 'uploads');
    return path.isAbsolute(configured) ? configured : path.resolve(BACKEND_ROOT, configured);
};

/**
 * Build and validate the active storage configuration.
 *
 * @returns {{driver: string, local: {rootDirectory: string}, s3: {bucket: string, region: string, endpoint: string}}}
 *   The validated configuration.
 * @throws {Error} When the driver is unknown or S3 configuration is incomplete.
 */
export const buildStorageConfig = () => {
    const driver = Config.storageDriver;

    const config = {
        driver,
        local: {
            rootDirectory: resolveLocalRoot(Config.storageLocalRoot),
        },
        s3: {
            bucket: Config.storageS3Bucket,
            region: Config.storageS3Region,
            endpoint: Config.storageS3Endpoint,
        },
    };

    if (!['local', 's3', 'disabled'].includes(driver)) {
        throw new Error(`Unsupported storage driver: ${driver}`);
    }

    if (driver === 's3' && (!config.s3.bucket || !config.s3.region)) {
        throw new Error('STORAGE_S3_BUCKET and STORAGE_S3_REGION are required when STORAGE_DRIVER=s3');
    }

    return config;
};

let adapterInstance;

/**
 * Lazily construct and cache the active storage adapter.
 *
 * @returns {object|null} The adapter, or null when storage is disabled.
 */
export const getStorageAdapter = () => {
    if (adapterInstance === undefined) {
        adapterInstance = createStorageAdapter(buildStorageConfig());
    }
    return adapterInstance;
};

/**
 * Reset the cached adapter. Used by tests that reconfigure storage.
 *
 * @returns {void}
 */
export const resetStorageAdapter = () => {
    adapterInstance = undefined;
};
