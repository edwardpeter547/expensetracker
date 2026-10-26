import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import sharp from 'sharp';
import { fileURLToPath } from 'url';
import path from 'path';
import { StorageError } from '../../storage/storage.adapter.js';

const configDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../configurations');

const mockStorage = {
    put: jest.fn(),
    get: jest.fn(),
    delete: jest.fn(),
    exists: jest.fn(),
};
const mockGetStorageAdapter = jest.fn();

const mockTx = {
    $queryRaw: jest.fn(),
    user: { update: jest.fn() },
};
const mockPrisma = {
    user: { findUnique: jest.fn() },
    $transaction: jest.fn(async (callback) => callback(mockTx)),
};

jest.unstable_mockModule(path.join(configDirectory, 'prisma.connect.js'), () => ({ default: mockPrisma }));
jest.unstable_mockModule(path.join(configDirectory, 'storage.config.js'), () => ({
    getStorageAdapter: mockGetStorageAdapter,
}));

const avatarService = await import('../avatar.service.js');

/**
 * Generate a small valid PNG buffer for image-processing tests.
 *
 * @param {number} width The image width.
 * @param {number} height The image height.
 * @returns {Promise<Buffer>} A PNG buffer.
 */
const makePng = (width = 16, height = 16) => sharp({
    create: { width, height, channels: 3, background: { r: 10, g: 20, b: 30 } },
}).png().toBuffer();

describe('avatar.service helpers', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGetStorageAdapter.mockReturnValue(mockStorage);
    });

    /**
     * Initials are derived from the first letter of each name part, upper
     * cased, and capped at two characters; display names join available parts.
     */
    test('resolves initials and display names from name parts', () => {
        expect(avatarService.resolveInitials('peter', 'yaanwa')).toBe('PY');
        expect(avatarService.resolveInitials(undefined, undefined)).toBe('');
        expect(avatarService.buildDisplayName('peter', 'yaanwa')).toBe('peter yaanwa');
    });

    /**
     * A user without a stored avatar receives the default asset URL and a true
     * isDefault flag; a stored avatar points at the authenticated retrieval
     * endpoint instead.
     */
    test('builds the stable avatar DTO for default and custom avatars', () => {
        const defaultDto = avatarService.buildAvatarDto({ firstname: 'Peter', lastname: 'Yaanwa', avatar: null });
        expect(defaultDto.isDefault).toBe(true);
        expect(defaultDto.initials).toBe('PY');
        expect(defaultDto.url).toContain('default-avatar.svg');

        const customDto = avatarService.buildAvatarDto({ firstname: 'Peter', lastname: 'Yaanwa', avatar: 'avatars/1/x.webp' });
        expect(customDto.isDefault).toBe(false);
        expect(customDto.url).toContain('/api/v1/user/avatar');
    });

    /**
     * Object keys are opaque, namespaced, and never include the uploaded
     * filename.
     */
    test('creates opaque namespaced storage keys', () => {
        const key = avatarService.createOpaqueKey({ namespace: 'avatars', userId: 7, extension: 'webp' });

        expect(key).toMatch(/^avatars\/7\/[0-9a-f-]{36}\.webp$/);
    });

    /**
     * A valid PNG is decoded, resized to a 512px square, and re-encoded as
     * WebP with embedded metadata stripped.
     */
    test('normalizes a valid image to a 512px WebP', async () => {
        const result = await avatarService.normalizeAvatarImage(await makePng(100, 200));

        expect(result.contentType).toBe('image/webp');
        expect(result.extension).toBe('webp');
        const metadata = await sharp(result.buffer).metadata();
        expect(metadata.format).toBe('webp');
        expect(metadata.width).toBe(512);
        expect(metadata.height).toBe(512);
    });

    /**
     * Random bytes that cannot be decoded are rejected as unsupported.
     */
    test('rejects corrupt input with 415', async () => {
        await expect(avatarService.normalizeAvatarImage(Buffer.from('not-an-image')))
            .rejects.toMatchObject({ statusCode: 415 });
    });

    /**
     * SVG input is not in the supported format set and must be rejected.
     */
    test('rejects unsupported formats such as SVG', async () => {
        const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>');

        await expect(avatarService.normalizeAvatarImage(svg))
            .rejects.toMatchObject({ statusCode: 415 });
    });

    /**
     * An image whose dimensions exceed the limit is rejected with 413.
     */
    test('rejects an oversized image with 413', async () => {
        await expect(avatarService.normalizeAvatarImage(await makePng(16, 16), { maxDimension: 8 }))
            .rejects.toMatchObject({ statusCode: 413 });
    });

    /**
     * When storage is disabled, mutations must surface a 503.
     */
    test('throws 503 when storage is disabled', async () => {
        mockGetStorageAdapter.mockReturnValue(null);

        await expect(avatarService.replaceAvatar({ userId: 1, inputBuffer: await makePng() }))
            .rejects.toMatchObject({ statusCode: 503 });
    });
});

describe('avatar.service lifecycle', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGetStorageAdapter.mockReturnValue(mockStorage);
        mockStorage.put.mockResolvedValue({ key: 'new', contentType: 'image/webp' });
        mockStorage.delete.mockResolvedValue(undefined);
        mockTx.$queryRaw.mockResolvedValue([{ avatar: null }]);
        mockTx.user.update.mockResolvedValue({});
    });

    /**
     * Replacing an avatar stores the new object, swaps the database reference
     * under a row lock, and cleans up the previous object.
     */
    test('replaces an avatar and cleans up the previous object', async () => {
        mockTx.$queryRaw.mockResolvedValue([{ avatar: 'avatars/1/old.webp' }]);

        const previousKey = await avatarService.replaceAvatar({ userId: 1, inputBuffer: await makePng() });

        expect(mockStorage.put).toHaveBeenCalled();
        expect(mockTx.user.update).toHaveBeenCalledWith(
            expect.objectContaining({ data: { avatar: expect.stringMatching(/^avatars\/1\//) } })
        );
        expect(mockStorage.delete).toHaveBeenCalledWith('avatars/1/old.webp');
        expect(previousKey).toBe('avatars/1/old.webp');
    });

    /**
     * If the database update fails after the object is stored, the new object
     * is cleaned up and the original error propagates.
     */
    test('cleans up the new object when the database update fails', async () => {
        const failure = new Error('database failure');
        mockPrisma.$transaction.mockRejectedValueOnce(failure);

        await expect(avatarService.replaceAvatar({ userId: 1, inputBuffer: await makePng() }))
            .rejects.toBe(failure);
        expect(mockStorage.delete).toHaveBeenCalled();
    });

    /**
     * Removing an avatar clears the reference before deleting the object.
     */
    test('removes a custom avatar and restores the default', async () => {
        mockTx.$queryRaw.mockResolvedValue([{ avatar: 'avatars/1/current.webp' }]);

        const previousKey = await avatarService.removeAvatar({ userId: 1 });

        expect(mockTx.user.update).toHaveBeenCalledWith(
            expect.objectContaining({ data: { avatar: null } })
        );
        expect(mockStorage.delete).toHaveBeenCalledWith('avatars/1/current.webp');
        expect(previousKey).toBe('avatars/1/current.webp');
    });

    /**
     * Retrieval returns the stored object bytes with a key-derived ETag.
     */
    test('retrieves a custom avatar by its stored key', async () => {
        mockPrisma.user.findUnique.mockResolvedValue({ avatar: 'avatars/1/x.webp' });
        mockStorage.get.mockResolvedValue({ buffer: Buffer.from('img'), contentType: 'image/webp' });

        const result = await avatarService.getAvatar({ userId: 1 });

        expect(result).toEqual({
            buffer: Buffer.from('img'),
            contentType: 'image/webp',
            etag: '"avatars/1/x.webp"',
        });
    });

    /**
     * A user without a custom avatar receives the bundled default asset.
     */
    test('falls back to the default avatar when none is stored', async () => {
        mockPrisma.user.findUnique.mockResolvedValue({ avatar: null });

        const result = await avatarService.getAvatar({ userId: 1 });

        expect(result.contentType).toBe('image/svg+xml');
        expect(result.etag).toBe('"default-avatar"');
    });

    /**
     * A missing stored object falls back to the default rather than failing
     * the request.
     */
    test('falls back to the default when the stored object is missing', async () => {
        mockPrisma.user.findUnique.mockResolvedValue({ avatar: 'avatars/1/missing.webp' });
        mockStorage.get.mockRejectedValue(new StorageError('Object not found', { statusCode: 404, code: 'NOT_FOUND' }));

        const result = await avatarService.getAvatar({ userId: 1 });

        expect(result.contentType).toBe('image/svg+xml');
    });
});
