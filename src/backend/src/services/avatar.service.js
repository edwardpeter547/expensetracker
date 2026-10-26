import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { StatusCodes } from 'http-status-codes';
import sharp from 'sharp';
import Config from '../configurations/env.config.js';
import logger from '../configurations/logger.config.js';
import prisma from '../configurations/prisma.connect.js';
import { getStorageAdapter } from '../configurations/storage.config.js';
import {
    AVATAR_MAX_DIMENSION,
    AVATAR_MAX_INPUT_PIXELS,
    AVATAR_NAMESPACE,
    AVATAR_OUTPUT_CONTENT_TYPE,
    AVATAR_OUTPUT_SIZE,
    SUPPORTED_AVATAR_FORMATS,
} from '../constants/avatar.constants.js';
import { StorageError } from '../storage/storage.adapter.js';
import AppError from '../utils/appError.js';
import { getDirectory } from '../utils/helpers.js';

const DEFAULT_AVATAR_FILE = path.resolve(getDirectory(import.meta.url), '../../public/images/default-avatar.svg');

/**
 * Resolve a user's initials from their given and family names.
 *
 * At most two uppercase initials are returned; an empty string is returned
 * when no name parts are available. Initials are used only for client-side
 * rendering hints and never depend on sensitive identifiers.
 *
 * @param {string|undefined} firstname The user's first name.
 * @param {string|undefined} lastname The user's last name.
 * @returns {string} Up to two uppercase initials, or an empty string.
 */
export const resolveInitials = (firstname, lastname) => {
    const parts = [firstname, lastname]
        .map((part) => (typeof part === 'string' ? part.trim() : ''))
        .filter(Boolean);

    if (parts.length === 0) return '';

    return parts
        .map((part) => part[0].toUpperCase())
        .join('')
        .slice(0, 2);
};

/**
 * Build a user's display name from their name parts.
 *
 * @param {string|undefined} firstname The user's first name.
 * @param {string|undefined} lastname The user's last name.
 * @returns {string} The joined, trimmed display name.
 */
export const buildDisplayName = (firstname, lastname) => {
    return [firstname, lastname]
        .map((part) => (typeof part === 'string' ? part.trim() : ''))
        .filter(Boolean)
        .join(' ');
};

/**
 * Build the stable avatar representation exposed on a profile DTO.
 *
 * The effective URL is the authenticated retrieval endpoint when a custom
 * avatar is stored, otherwise the bundled default asset. `initials` is always
 * present so clients can render a local fallback.
 *
 * @param {{firstname?: string, lastname?: string, avatar?: string|null}} user
 *   The safely projected user record.
 * @returns {{url: string, initials: string, isDefault: boolean}} The avatar DTO.
 */
export const buildAvatarDto = (user) => {
    const initials = resolveInitials(user?.firstname, user?.lastname);
    const hasCustomAvatar = Boolean(user?.avatar);

    return {
        url: hasCustomAvatar ? Config.avatarRetrievalUrl : Config.avatarDefaultUrl,
        initials,
        isDefault: !hasCustomAvatar,
    };
};

/**
 * Generate a collision-resistant, provider-independent object key.
 *
 * Keys never incorporate the uploaded filename and are not an authorization
 * mechanism; retrieval is authenticated and owner-scoped.
 *
 * @param {{namespace: string, userId: number, extension: string}} params Key parts.
 * @returns {string} An opaque storage key.
 */
export const createOpaqueKey = ({ namespace, userId, extension }) => {
    return `${namespace}/${userId}/${crypto.randomUUID()}.${extension}`;
};

/**
 * Validate and normalize an uploaded avatar image.
 *
 * The raw input is decoded to confirm it is a supported image, checked against
 * dimension and pixel limits, then re-encoded as a 512px square WebP. The
 * re-encode strips EXIF and other embedded metadata.
 *
 * @param {Buffer} inputBuffer The raw uploaded bytes.
 * @param {{maxDimension?: number, maxInputPixels?: number, outputSize?: number}} [options]
 *   Optional limits, overridable for tests.
 * @returns {Promise<{buffer: Buffer, contentType: string, extension: string}>}
 *   The normalized image.
 * @throws {AppError} With 400/413/415 for invalid or unsupported input.
 */
export const normalizeAvatarImage = async (inputBuffer, options = {}) => {
    const {
        maxDimension = AVATAR_MAX_DIMENSION,
        maxInputPixels = AVATAR_MAX_INPUT_PIXELS,
        outputSize = AVATAR_OUTPUT_SIZE,
    } = options;

    if (!Buffer.isBuffer(inputBuffer) || inputBuffer.length === 0) {
        throw new AppError('Avatar image is required', StatusCodes.BAD_REQUEST);
    }

    let metadata;
    try {
        metadata = await sharp(inputBuffer, { limitInputPixels: maxInputPixels, failOn: 'error' }).metadata();
    } catch {
        throw new AppError('Unsupported or corrupt image', StatusCodes.UNSUPPORTED_MEDIA_TYPE);
    }

    if (!metadata.format || !SUPPORTED_AVATAR_FORMATS.has(metadata.format)) {
        throw new AppError('Unsupported image format', StatusCodes.UNSUPPORTED_MEDIA_TYPE);
    }

    if ((metadata.width ?? 0) > maxDimension || (metadata.height ?? 0) > maxDimension) {
        throw new AppError('Image dimensions are too large', 413);
    }

    let buffer;
    try {
        buffer = await sharp(inputBuffer, { limitInputPixels: maxInputPixels, failOn: 'error' })
            .rotate()
            .resize(outputSize, outputSize, { fit: 'cover' })
            .webp({ quality: 85 })
            .toBuffer();
    } catch {
        throw new AppError('Unable to process image', StatusCodes.UNSUPPORTED_MEDIA_TYPE);
    }

    return { buffer, contentType: AVATAR_OUTPUT_CONTENT_TYPE, extension: 'webp' };
};

/**
 * Throw a 503 when storage is disabled.
 *
 * @returns {void}
 * @throws {AppError} When no storage adapter is configured.
 */
export const assertStorageAvailable = () => {
    if (!getStorageAdapter()) {
        throw new AppError('Avatar storage is not configured', StatusCodes.SERVICE_UNAVAILABLE);
    }
};

/**
 * Load the authenticated user's stored avatar key.
 *
 * @param {number} userId The owning user id.
 * @returns {Promise<string|null>} The stored key, or null when none exists.
 */
const getStoredAvatarKey = async (userId) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { avatar: true },
    });
    return user?.avatar ?? null;
};

/**
 * Atomically swap the user's avatar reference and return the previous key.
 *
 * The user row is locked first so concurrent replaces and removals serialize;
 * the returned previous key is therefore the object the caller may clean up.
 *
 * @param {number} userId The owning user id.
 * @param {string|null} nextKey The new key, or null to clear the avatar.
 * @returns {Promise<string|null>} The previously referenced key.
 */
const swapAvatarKey = async (userId, nextKey) => {
    return prisma.$transaction(async (tx) => {
        const rows = await tx.$queryRaw`SELECT "avatar" FROM "user" WHERE "id" = ${userId} FOR UPDATE`;
        const row = rows[0];
        if (!row) {
            throw new AppError('User not found', StatusCodes.NOT_FOUND);
        }
        const previousKey = row.avatar ?? null;
        await tx.user.update({
            where: { id: userId },
            data: { avatar: nextKey },
        });
        return previousKey;
    });
};

/**
 * Best-effort removal of an orphaned storage object.
 *
 * Cleanup failures are logged rather than surfaced: the database no longer
 * references the object, so a failed delete only leaves an orphan that a
 * documented reconciliation sweep can later remove.
 *
 * @param {string|null} key The object key to remove, if any.
 * @returns {Promise<void>}
 */
const cleanupObject = async (key) => {
    if (!key) return;
    const storage = getStorageAdapter();
    if (!storage) return;
    try {
        await storage.delete(key);
    } catch (error) {
        logger.warn('Failed to remove orphaned storage object', { key, error: error.message });
    }
};

/**
 * Upload or replace the authenticated user's avatar.
 *
 * The new object is stored before the database reference changes, so the
 * existing avatar remains available if the database update fails. Row locking
 * in `swapAvatarKey` prevents concurrent updates from deleting an object still
 * referenced by the winning update.
 *
 * @param {{userId: number, inputBuffer: Buffer}} params User and image bytes.
 * @returns {Promise<string|null>} The previous avatar key that was cleaned up.
 */
export const replaceAvatar = async ({ userId, inputBuffer }) => {
    assertStorageAvailable();
    const storage = getStorageAdapter();
    const image = await normalizeAvatarImage(inputBuffer);
    const newKey = createOpaqueKey({ namespace: AVATAR_NAMESPACE, userId, extension: image.extension });

    try {
        await storage.put({ key: newKey, buffer: image.buffer, contentType: image.contentType });
    } catch {
        throw new AppError('Unable to store avatar', StatusCodes.SERVICE_UNAVAILABLE);
    }

    let previousKey;
    try {
        previousKey = await swapAvatarKey(userId, newKey);
    } catch (error) {
        await cleanupObject(newKey);
        throw error;
    }

    await cleanupObject(previousKey);
    return previousKey;
};

/**
 * Remove the authenticated user's custom avatar and restore the default.
 *
 * The database reference is cleared before the physical object is deleted, so
 * a failed delete cannot leave a referenced object missing.
 *
 * @param {{userId: number}} params The owning user id.
 * @returns {Promise<string|null>} The previous avatar key that was cleaned up.
 */
export const removeAvatar = async ({ userId }) => {
    assertStorageAvailable();
    const previousKey = await swapAvatarKey(userId, null);
    await cleanupObject(previousKey);
    return previousKey;
};

/**
 * Read the bundled neutral default avatar.
 *
 * @returns {Promise<{buffer: Buffer, contentType: string, etag: string}>} The default asset.
 */
export const getDefaultAvatar = async () => {
    const buffer = await fs.promises.readFile(DEFAULT_AVATAR_FILE);
    return { buffer, contentType: 'image/svg+xml', etag: '"default-avatar"' };
};

/**
 * Retrieve the authenticated user's effective avatar image.
 *
 * A user without a custom avatar, or with an unreadable custom object, falls
 * back to the bundled default. Retrieval is owner-scoped and never accepts an
 * arbitrary object key.
 *
 * @param {{userId: number}} params The owning user id.
 * @returns {Promise<{buffer: Buffer, contentType: string, etag: string}>} The image.
 */
export const getAvatar = async ({ userId }) => {
    const key = await getStoredAvatarKey(userId);
    const storage = getStorageAdapter();

    if (!key || !storage) {
        return getDefaultAvatar();
    }

    try {
        const result = await storage.get(key);
        return { buffer: result.buffer, contentType: result.contentType, etag: `"${key}"` };
    } catch (error) {
        if (error instanceof StorageError && error.statusCode === 404) {
            return getDefaultAvatar();
        }
        throw new AppError('Unable to retrieve avatar', StatusCodes.SERVICE_UNAVAILABLE);
    }
};
