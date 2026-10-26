import fs from 'fs';
import path from 'path';
import { StorageAdapter, StorageError, assertSafeStorageKey } from './storage.adapter.js';

const CONTENT_TYPES_BY_EXTENSION = {
    '.webp': 'image/webp',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
};

/**
 * Infer a content type from a file extension.
 *
 * @param {string} filePath The object path.
 * @returns {string} The inferred content type, or octet-stream when unknown.
 */
const inferContentType = (filePath) => {
    const extension = path.extname(filePath).toLowerCase();
    return CONTENT_TYPES_BY_EXTENSION[extension] || 'application/octet-stream';
};

/**
 * Normalize any filesystem error into a storage error.
 *
 * @param {Error} error The underlying error.
 * @returns {StorageError} A normalized storage failure.
 */
const toStorageError = (error) => {
    if (error instanceof StorageError) return error;
    return new StorageError('Storage operation failed', { statusCode: 503, code: 'STORAGE_FAILURE', cause: error });
};

/**
 * Local filesystem storage adapter.
 *
 * Intended for development, testing, and single-instance self-hosted
 * deployments. Object keys are validated with a strict allowlist and resolved
 * under the configured root, and new files are created with exclusive flags so
 * symlinks are never followed for writes.
 */
export class LocalStorageAdapter extends StorageAdapter {
    /**
     * @param {{rootDirectory: string}} options The storage root directory.
     */
    constructor({ rootDirectory }) {
        super();
        if (!rootDirectory) {
            throw new Error('LocalStorageAdapter requires a rootDirectory');
        }
        this.rootDirectory = path.resolve(rootDirectory);
    }

    /**
     * Resolve a validated key to an absolute path inside the storage root.
     *
     * @param {string} key The object key.
     * @returns {string} The absolute destination path.
     * @throws {StorageError} When the key is unsafe or escapes the root.
     */
    resolveSafePath(key) {
        assertSafeStorageKey(key);
        const destination = path.resolve(this.rootDirectory, key);
        const root = path.resolve(this.rootDirectory);

        if (destination !== root && !destination.startsWith(root + path.sep)) {
            throw new StorageError('Storage key escapes the storage root', { statusCode: 400, code: 'INVALID_KEY' });
        }

        return destination;
    }

    /**
     * Store bytes under a key with exclusive create semantics.
     *
     * @param {{key: string, buffer: Buffer, contentType: string}} params Object data.
     * @returns {Promise<{key: string, contentType: string}>} Stored object metadata.
     */
    async put({ key, buffer, contentType }) {
        const destination = this.resolveSafePath(key);
        try {
            await fs.promises.mkdir(path.dirname(destination), { recursive: true, mode: 0o700 });
            await fs.promises.writeFile(destination, buffer, { flag: 'wx', mode: 0o600 });
        } catch (error) {
            if (error.code === 'EEXIST') {
                throw new StorageError('Object already exists', { statusCode: 409, code: 'OBJECT_EXISTS', cause: error });
            }
            throw toStorageError(error);
        }
        return { key, contentType };
    }

    /**
     * Read a regular file by key.
     *
     * @param {string} key The object key.
     * @returns {Promise<{buffer: Buffer, contentType: string}>} Object bytes and type.
     */
    async get(key) {
        const destination = this.resolveSafePath(key);
        let stat;
        try {
            stat = await fs.promises.lstat(destination);
        } catch (error) {
            if (error.code === 'ENOENT') {
                throw new StorageError('Object not found', { statusCode: 404, code: 'NOT_FOUND', cause: error });
            }
            throw toStorageError(error);
        }

        // Reject symlinks and directories: only a regular file is ever read,
        // which prevents a planted symlink from escaping the storage root.
        if (!stat.isFile()) {
            throw new StorageError('Object not found', { statusCode: 404, code: 'NOT_FOUND' });
        }

        try {
            const buffer = await fs.promises.readFile(destination);
            return { buffer, contentType: inferContentType(destination) };
        } catch (error) {
            throw toStorageError(error);
        }
    }

    /**
     * Delete an object by key; a missing object is a no-op.
     *
     * @param {string} key The object key.
     * @returns {Promise<void>}
     */
    async delete(key) {
        const destination = this.resolveSafePath(key);
        try {
            await fs.promises.rm(destination, { force: true });
        } catch (error) {
            throw toStorageError(error);
        }
    }

    /**
     * Whether a regular file exists under a key.
     *
     * @param {string} key The object key.
     * @returns {Promise<boolean>} True for an existing regular file.
     */
    async exists(key) {
        const destination = this.resolveSafePath(key);
        try {
            const stat = await fs.promises.lstat(destination);
            return stat.isFile();
        } catch (error) {
            if (error.code === 'ENOENT') return false;
            throw toStorageError(error);
        }
    }
}
