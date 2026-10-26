import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import {
    DeleteObjectCommand,
    GetObjectCommand,
    HeadObjectCommand,
    PutObjectCommand,
} from '@aws-sdk/client-s3';
import { S3StorageAdapter } from '../s3.storage.js';

describe('S3StorageAdapter', () => {
    let client;
    let adapter;

    beforeEach(() => {
        jest.clearAllMocks();
        client = { send: jest.fn() };
        adapter = new S3StorageAdapter({ client, bucket: 'private-bucket' });
    });

    /**
     * put issues a PutObjectCommand with the bucket, key, bytes, and content
     * type, and returns stable object metadata.
     */
    test('put stores bytes through PutObjectCommand', async () => {
        client.send.mockResolvedValue({});

        const result = await adapter.put({
            key: 'avatars/1/x.webp',
            buffer: Buffer.from('bytes'),
            contentType: 'image/webp',
        });

        expect(client.send).toHaveBeenCalledWith(expect.any(PutObjectCommand));
        const command = client.send.mock.calls[0][0];
        expect(command.input).toMatchObject({
            Bucket: 'private-bucket',
            Key: 'avatars/1/x.webp',
            ContentType: 'image/webp',
        });
        expect(result).toEqual({ key: 'avatars/1/x.webp', contentType: 'image/webp' });
    });

    /**
     * get resolves the SDK byte array back into a Buffer and returns the
     * object's content type.
     */
    test('get returns object bytes and content type', async () => {
        client.send.mockResolvedValue({
            Body: { transformToByteArray: jest.fn(async () => Buffer.from('bytes')) },
            ContentType: 'image/webp',
        });

        const result = await adapter.get('avatars/1/x.webp');

        expect(client.send).toHaveBeenCalledWith(expect.any(GetObjectCommand));
        expect(result.buffer).toEqual(Buffer.from('bytes'));
        expect(result.contentType).toBe('image/webp');
    });

    /**
     * A missing S3 object surfaces as a 404 storage error.
     */
    test('get reports a missing object as not found', async () => {
        client.send.mockRejectedValue(Object.assign(new Error('NoSuchKey'), {
            name: 'NoSuchKey',
            $metadata: { httpStatusCode: 404 },
        }));

        await expect(adapter.get('avatars/1/missing.webp'))
            .rejects.toMatchObject({ code: 'NOT_FOUND', statusCode: 404 });
    });

    /**
     * delete issues a DeleteObjectCommand and is idempotent from the caller's
     * perspective.
     */
    test('delete issues a DeleteObjectCommand', async () => {
        client.send.mockResolvedValue({});

        await adapter.delete('avatars/1/x.webp');

        expect(client.send).toHaveBeenCalledWith(expect.any(DeleteObjectCommand));
    });

    /**
     * exists returns false only for a confirmed missing object and propagates
     * other service errors.
     */
    test('exists distinguishes missing objects from service errors', async () => {
        client.send.mockResolvedValue({});
        expect(await adapter.exists('avatars/1/x.webp')).toBe(true);

        client.send.mockRejectedValue(Object.assign(new Error('NotFound'), {
            name: 'NotFound',
            $metadata: { httpStatusCode: 404 },
        }));
        expect(await adapter.exists('avatars/1/missing.webp')).toBe(false);

        client.send.mockRejectedValue(new Error('AccessDenied'));
        await expect(adapter.exists('avatars/1/denied.webp'))
            .rejects.toMatchObject({ statusCode: 503 });
    });
});
