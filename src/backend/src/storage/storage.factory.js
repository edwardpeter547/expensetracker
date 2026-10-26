import { S3Client } from '@aws-sdk/client-s3';
import { LocalStorageAdapter } from './local.storage.js';
import { S3StorageAdapter } from './s3.storage.js';

/**
 * Build an S3 client for an S3-compatible endpoint.
 *
 * Credentials are intentionally not passed here so the AWS SDK resolves them
 * through its standard provider chain. When an endpoint is supplied the client
 * uses path-style addressing, which is required by most S3-compatible stores.
 *
 * @param {{region: string, endpoint?: string}} s3Config S3 settings.
 * @returns {object} A configured S3 client.
 */
export const createS3Client = (s3Config) => {
    const options = { region: s3Config.region };
    if (s3Config.endpoint) {
        options.endpoint = s3Config.endpoint;
        options.forcePathStyle = true;
    }
    return new S3Client(options);
};

/**
 * Select and construct the configured storage adapter.
 *
 * @param {object} config Validated storage configuration.
 * @returns {object|null} The adapter instance, or null when storage is disabled.
 * @throws {Error} When the driver is unknown or required S3 config is missing.
 */
export const createStorageAdapter = (config) => {
    switch (config.driver) {
        case 'local':
            return new LocalStorageAdapter({ rootDirectory: config.local.rootDirectory });
        case 's3':
            return new S3StorageAdapter({
                client: createS3Client(config.s3),
                bucket: config.s3.bucket,
            });
        case 'disabled':
            return null;
        default:
            throw new Error(`Unsupported storage driver: ${config.driver}`);
    }
};
