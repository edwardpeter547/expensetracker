import { describe, expect, test } from '@jest/globals';
import { LocalStorageAdapter } from '../local.storage.js';
import { S3StorageAdapter } from '../s3.storage.js';
import { createS3Client, createStorageAdapter } from '../storage.factory.js';

describe('storage.factory', () => {
    /**
     * The `local` driver constructs the local filesystem adapter with the
     * configured root.
     */
    test('builds a local adapter for the local driver', () => {
        const adapter = createStorageAdapter({
            driver: 'local',
            local: { rootDirectory: '/tmp/uploads' },
            s3: {},
        });

        expect(adapter).toBeInstanceOf(LocalStorageAdapter);
        expect(adapter.rootDirectory).toBe('/tmp/uploads');
    });

    /**
     * The `s3` driver constructs an S3 adapter around an SDK client and bucket.
     */
    test('builds an S3 adapter for the s3 driver', () => {
        const adapter = createStorageAdapter({
            driver: 's3',
            local: {},
            s3: { bucket: 'bucket', region: 'eu-west-2', endpoint: '' },
        });

        expect(adapter).toBeInstanceOf(S3StorageAdapter);
        expect(adapter.bucket).toBe('bucket');
    });

    /**
     * The `disabled` driver yields null, signalling storage-dependent
     * operations to return a documented unavailable response.
     */
    test('returns null for the disabled driver', () => {
        expect(createStorageAdapter({ driver: 'disabled', local: {}, s3: {} })).toBeNull();
    });

    /**
     * An unknown driver fails fast rather than defaulting to a broken adapter.
     */
    test('throws for an unknown driver', () => {
        expect(() => createStorageAdapter({ driver: 'ftp', local: {}, s3: {} }))
            .toThrow('Unsupported storage driver: ftp');
    });

    /**
     * An S3-compatible endpoint enables path-style addressing, which most
     * S3-compatible stores require.
     */
    test('enables path-style addressing for custom endpoints', () => {
        const client = createS3Client({ region: 'eu-west-2', endpoint: 'http://minio:9000' });

        expect(client.config.endpoint).toBeDefined();
        expect(client.config.forcePathStyle).toBe(true);
    });
});
