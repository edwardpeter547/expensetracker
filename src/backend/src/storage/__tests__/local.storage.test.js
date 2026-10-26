import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { LocalStorageAdapter } from '../local.storage.js';
import { StorageError } from '../storage.adapter.js';

let rootDirectory;
let adapter;

beforeAll(async () => {
    rootDirectory = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'expensetracker-local-'));
    adapter = new LocalStorageAdapter({ rootDirectory });
});

afterAll(async () => {
    await fs.promises.rm(rootDirectory, { recursive: true, force: true });
});

describe('LocalStorageAdapter', () => {
    /**
     * A written object must round-trip through get with the same bytes and an
     * inferred content type, and exists must report true.
     */
    test('puts and gets an object with inferred content type', async () => {
        const key = 'avatars/1/object.webp';
        const buffer = Buffer.from('avatar-bytes');

        await adapter.put({ key, buffer, contentType: 'image/webp' });

        expect(await adapter.exists(key)).toBe(true);
        const result = await adapter.get(key);
        expect(result.buffer).toEqual(buffer);
        expect(result.contentType).toBe('image/webp');
    });

    /**
     * Deleting an object removes it; a second delete and a delete of a missing
     * object must both be silent no-ops.
     */
    test('delete is idempotent for present and missing objects', async () => {
        const key = 'avatars/1/deletable.webp';
        await adapter.put({ key, buffer: Buffer.from('x'), contentType: 'image/webp' });

        await adapter.delete(key);
        expect(await adapter.exists(key)).toBe(false);
        await expect(adapter.delete(key)).resolves.toBeUndefined();
    });

    /**
     * Writing the same key twice must fail with a conflict instead of silently
     * overwriting.
     */
    test('rejects overwriting an existing object', async () => {
        const key = 'avatars/1/unique.webp';
        await adapter.put({ key, buffer: Buffer.from('first'), contentType: 'image/webp' });

        await expect(
            adapter.put({ key, buffer: Buffer.from('second'), contentType: 'image/webp' })
        ).rejects.toMatchObject({ code: 'OBJECT_EXISTS', statusCode: 409 });
    });

    /**
     * Reading a missing object returns a 404 storage error.
     */
    test('get reports a missing object as not found', async () => {
        await expect(adapter.get('avatars/1/missing.webp'))
            .rejects.toMatchObject({ code: 'NOT_FOUND', statusCode: 404 });
    });

    /**
     * Unsafe keys (traversal, absolute paths, backslashes, and empty segments)
     * must be rejected with a 400 before touching the filesystem.
     */
    test('rejects unsafe and traversal keys', async () => {
        const unsafeKeys = [
            '../escape.webp',
            'avatars/../../escape.webp',
            '/etc/passwd',
            'avatars\\1\\x.webp',
            'avatars//double.webp',
            'avatars/1/.hidden.webp',
            '',
        ];

        for (const key of unsafeKeys) {
            await expect(adapter.put({ key, buffer: Buffer.from('x'), contentType: 'image/webp' }))
                .rejects.toMatchObject({ code: 'INVALID_KEY', statusCode: 400 });
        }
    });

    /**
     * A symlink planted at an object key must never be followed: reads treat it
     * as missing rather than returning the target's bytes.
     */
    test('does not follow symlinks when reading', async () => {
        const outsideFile = path.join(os.tmpdir(), `escape-${Date.now()}.txt`);
        await fs.promises.writeFile(outsideFile, 'secret');

        const key = 'avatars/1/link.webp';
        const linkPath = adapter.resolveSafePath(key);
        await fs.promises.mkdir(path.dirname(linkPath), { recursive: true });
        await fs.promises.symlink(outsideFile, linkPath);

        await expect(adapter.get(key)).rejects.toBeInstanceOf(StorageError);
        expect(await adapter.exists(key)).toBe(false);

        await fs.promises.rm(outsideFile, { force: true });
    });
});
