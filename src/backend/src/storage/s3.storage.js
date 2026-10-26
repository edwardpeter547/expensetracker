import {
    DeleteObjectCommand,
    GetObjectCommand,
    HeadObjectCommand,
    PutObjectCommand,
} from '@aws-sdk/client-s3';
import { StorageAdapter, StorageError, assertSafeStorageKey } from './storage.adapter.js';

/**
 * Normalize any SDK error into a storage error.
 *
 * @param {Error} error The underlying error.
 * @returns {StorageError} A normalized storage failure.
 */
const toStorageError = (error) => {
    if (error instanceof StorageError) return error;
    return new StorageError('Storage operation failed', { statusCode: 503, code: 'STORAGE_FAILURE', cause: error });
};

/**
 * Amazon S3 and S3-compatible storage adapter.
 *
 * The SDK client is injected so credentials and endpoints live in
 * configuration, never in adapter or business logic. Objects are private by
 * default; no public-read ACL is ever applied.
 */
export class S3StorageAdapter extends StorageAdapter {
    /**
     * @param {{client: object, bucket: string}} options SDK client and bucket.
     */
    constructor({ client, bucket }) {
        super();
        if (!client) throw new Error('S3StorageAdapter requires a client');
        if (!bucket) throw new Error('S3StorageAdapter requires a bucket');
        this.client = client;
        this.bucket = bucket;
    }

    /**
     * Store bytes under a key.
     *
     * @param {{key: string, buffer: Buffer, contentType: string}} params Object data.
     * @returns {Promise<{key: string, contentType: string}>} Stored object metadata.
     */
    async put({ key, buffer, contentType }) {
        assertSafeStorageKey(key);
        try {
            await this.client.send(new PutObjectCommand({
                Bucket: this.bucket,
                Key: key,
                Body: buffer,
                ContentType: contentType,
            }));
        } catch (error) {
            throw toStorageError(error);
        }
        return { key, contentType };
    }

    /**
     * Read an object by key.
     *
     * @param {string} key The object key.
     * @returns {Promise<{buffer: Buffer, contentType: string}>} Object bytes and type.
     */
    async get(key) {
        assertSafeStorageKey(key);
        let result;
        try {
            result = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
        } catch (error) {
            if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
                throw new StorageError('Object not found', { statusCode: 404, code: 'NOT_FOUND', cause: error });
            }
            throw toStorageError(error);
        }

        try {
            const bytes = await result.Body.transformToByteArray();
            return { buffer: Buffer.from(bytes), contentType: result.ContentType || 'application/octet-stream' };
        } catch (error) {
            throw toStorageError(error);
        }
    }

    /**
     * Delete an object by key; S3 delete is idempotent.
     *
     * @param {string} key The object key.
     * @returns {Promise<void>}
     */
    async delete(key) {
        assertSafeStorageKey(key);
        try {
            await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
        } catch (error) {
            throw toStorageError(error);
        }
    }

    /**
     * Whether an object exists under a key.
     *
     * Only a confirmed missing object returns false; permission and service
     * errors are propagated.
     *
     * @param {string} key The object key.
     * @returns {Promise<boolean>} True when the object exists.
     */
    async exists(key) {
        assertSafeStorageKey(key);
        try {
            await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
            return true;
        } catch (error) {
            if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
                return false;
            }
            throw toStorageError(error);
        }
    }
}
