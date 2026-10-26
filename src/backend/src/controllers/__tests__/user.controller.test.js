import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { fileURLToPath } from 'url';
import path from 'path';
import {getDirectory} from '../../utils/helpers.js';

const servicesDirectory = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../services'
);

const mockProfileService = {
    getUserSummary: jest.fn(),
    getUserProfileDto: jest.fn(),
    updateUserProfile: jest.fn(),
};
const mockAuthService = {
    changeUserPassword: jest.fn(),
};
const mockAvatarService = {
    getAvatar: jest.fn(),
    removeAvatar: jest.fn(),
    replaceAvatar: jest.fn(),
};
const mockDeletionService = {
    requestVoluntaryDeletion: jest.fn(),
    getDeletionStatus: jest.fn(),
    cancelDeletion: jest.fn(),
    exportUserData: jest.fn(),
};

jest.unstable_mockModule(path.join(servicesDirectory, 'profile.service.js'), () => mockProfileService);
jest.unstable_mockModule(path.join(servicesDirectory, 'auth.service.js'), () => mockAuthService);
jest.unstable_mockModule(path.join(servicesDirectory, 'avatar.service.js'), () => mockAvatarService);
jest.unstable_mockModule(
    path.resolve(getDirectory(import.meta.url), '../../account-deletion/deletion/service.js'),
    () => mockDeletionService
);

const userController = await import('../user.controller.js');

const makeResponse = () => {
    const json = jest.fn();
    const status = jest.fn(() => ({ json }));
    return { json, status };
};

const flushAsync = () => new Promise((resolve) => setImmediate(resolve));

describe('user.controller', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    /**
     * `getProfile` returns the mapped profile DTO in the standard envelope.
     */
    test('getProfile returns the profile DTO', async () => {
        mockProfileService.getUserProfileDto.mockResolvedValue({ id: 1, username: 'peter' });
        const { json, status } = makeResponse();

        await userController.getProfile({ user: { id: 1 } }, { status, json }, jest.fn());
        await flushAsync();

        expect(mockProfileService.getUserProfileDto).toHaveBeenCalledWith(1);
        expect(status).toHaveBeenCalledWith(200);
        expect(json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    /**
     * A missing profile maps to a 404 AppError passed to the error handler.
     */
    test('getProfile passes a 404 error when the user is missing', async () => {
        mockProfileService.getUserProfileDto.mockResolvedValue(null);
        const next = jest.fn();

        await userController.getProfile({ user: { id: 1, email: 'a@b.c' } }, makeResponse(), next);
        await flushAsync();

        expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
    });

    /**
     * `updateProfile` forwards the validated editable fields and returns the
     * updated DTO.
     */
    test('updateProfile updates only writable fields', async () => {
        mockProfileService.updateUserProfile.mockResolvedValue({ id: 1, firstname: 'Updated' });
        const { json, status } = makeResponse();

        await userController.updateProfile(
            {
                user: { id: 1, email: 'a@b.c' },
                body: { firstname: 'Updated', timezone: 'Europe/London' },
            },
            { status, json },
            jest.fn()
        );
        await flushAsync();

        expect(mockProfileService.updateUserProfile).toHaveBeenCalledWith(1, {
            firstname: 'Updated',
            timezone: 'Europe/London',
        });
        expect(status).toHaveBeenCalledWith(200);
    });

    /**
     * `changePassword` delegates to the service and returns a null-data
     * success envelope.
     */
    test('changePassword delegates and returns success', async () => {
        mockAuthService.changeUserPassword.mockResolvedValue({});
        const { json, status } = makeResponse();

        await userController.changePassword(
            {
                user: { id: 1, email: 'a@b.c' },
                body: { currentPassword: 'old', newPassword: 'new-password' },
            },
            { status, json },
            jest.fn()
        );
        await flushAsync();

        expect(mockAuthService.changeUserPassword).toHaveBeenCalledWith(1, 'old', 'new-password');
        expect(status).toHaveBeenCalledWith(200);
        expect(json).toHaveBeenCalledWith(expect.objectContaining({ data: null }));
    });

    /**
     * `uploadAvatar` requires the parsed file, delegates to the service, and
     * returns the refreshed profile DTO.
     */
    test('uploadAvatar requires a file and returns the updated profile', async () => {
        mockAvatarService.replaceAvatar.mockResolvedValue('avatars/1/old.webp');
        mockProfileService.getUserProfileDto.mockResolvedValue({ id: 1, avatar: { isDefault: false } });
        const { json, status } = makeResponse();

        await userController.uploadAvatar(
            { user: { id: 1 }, file: { buffer: Buffer.from('img') } },
            { status, json },
            jest.fn()
        );
        await flushAsync();

        expect(mockAvatarService.replaceAvatar).toHaveBeenCalledWith({ userId: 1, inputBuffer: Buffer.from('img') });
        expect(status).toHaveBeenCalledWith(200);
        expect(json).toHaveBeenCalledWith(expect.objectContaining({ data: { profile: { id: 1, avatar: { isDefault: false } } } }));
    });

    /**
     * `uploadAvatar` rejects a request without a parsed file.
     */
    test('uploadAvatar passes a 400 error when no file is present', async () => {
        const next = jest.fn();

        await userController.uploadAvatar({ user: { id: 1 } }, makeResponse(), next);
        await flushAsync();

        expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
    });

    /**
     * `removeAvatar` delegates to the service and returns the refreshed profile
     * DTO.
     */
    test('removeAvatar returns the updated profile', async () => {
        mockAvatarService.removeAvatar.mockResolvedValue('avatars/1/old.webp');
        mockProfileService.getUserProfileDto.mockResolvedValue({ id: 1, avatar: { isDefault: true } });
        const { json, status } = makeResponse();

        await userController.removeAvatar({ user: { id: 1 } }, { status, json }, jest.fn());
        await flushAsync();

        expect(mockAvatarService.removeAvatar).toHaveBeenCalledWith({ userId: 1 });
        expect(status).toHaveBeenCalledWith(200);
    });

    /**
     * `getAvatar` streams the effective avatar with content type, cache, and
     * ETag headers.
     */
    test('getAvatar streams the avatar image with headers', async () => {
        mockAvatarService.getAvatar.mockResolvedValue({
            buffer: Buffer.from('img'),
            contentType: 'image/webp',
            etag: '"key"',
        });
        const set = jest.fn().mockReturnThis();
        const send = jest.fn();
        const status = jest.fn(() => ({ set, send }));

        await userController.getAvatar({ user: { id: 1 } }, { status, set, send }, jest.fn());
        await flushAsync();

        expect(mockAvatarService.getAvatar).toHaveBeenCalledWith({ userId: 1 });
        expect(status).toHaveBeenCalledWith(200);
        expect(set).toHaveBeenCalledWith('Content-Type', 'image/webp');
        expect(send).toHaveBeenCalledWith(Buffer.from('img'));
    });

    /**
     * `requestDeletion` delegates the reauthentication and confirmation to the
     * service and returns 202 with the request id and deadline.
     */
    test('requestDeletion returns 202 with the recovery deadline', async () => {
        mockDeletionService.requestVoluntaryDeletion.mockResolvedValue({
            requestId: 'req-1',
            recoveryDeadline: new Date('2026-11-09T00:00:00Z'),
        });
        const { json, status } = makeResponse();

        await userController.requestDeletion(
            { user: { id: 1 }, body: { password: 'Password123', confirmation: 'DELETE' } },
            { status, json },
            jest.fn()
        );
        await flushAsync();

        expect(mockDeletionService.requestVoluntaryDeletion).toHaveBeenCalledWith({ userId: 1, password: 'Password123' });
        expect(status).toHaveBeenCalledWith(202);
    });

    /**
     * `getDeletionStatus` returns the latest request (or null) in the envelope.
     */
    test('getDeletionStatus returns the latest request status', async () => {
        mockDeletionService.getDeletionStatus.mockResolvedValue({ requestId: 'req-1', status: 'PENDING_DELETION' });
        const { json, status } = makeResponse();

        await userController.getDeletionStatus({ user: { id: 1 } }, { status, json }, jest.fn());
        await flushAsync();

        expect(mockDeletionService.getDeletionStatus).toHaveBeenCalledWith({ userId: 1 });
        expect(status).toHaveBeenCalledWith(200);
    });

    /**
     * `cancelDeletion` delegates email/password reauthentication to the service.
     */
    test('cancelDeletion delegates reauthentication', async () => {
        mockDeletionService.cancelDeletion.mockResolvedValue({ requestId: 'req-1' });
        const { json, status } = makeResponse();

        await userController.cancelDeletion(
            { body: { email: 'a@b.c', password: 'Password123' } },
            { status, json },
            jest.fn()
        );
        await flushAsync();

        expect(mockDeletionService.cancelDeletion).toHaveBeenCalledWith({ email: 'a@b.c', password: 'Password123' });
        expect(status).toHaveBeenCalledWith(200);
    });

    /**
     * `exportData` returns the export document as a downloadable attachment.
     */
    test('exportData returns the export document with attachment headers', async () => {
        mockDeletionService.exportUserData.mockResolvedValue({ schemaVersion: 1, transactions: [] });
        const json = jest.fn();
        const set = jest.fn().mockReturnThis();
        const status = jest.fn(() => ({ set, json }));

        await userController.exportData({ user: { id: 1 } }, { status, set, json }, jest.fn());
        await flushAsync();

        expect(mockDeletionService.exportUserData).toHaveBeenCalledWith({ userId: 1 });
        expect(set).toHaveBeenCalledWith('Content-Disposition', expect.stringContaining('attachment'));
        expect(json).toHaveBeenCalledWith({ schemaVersion: 1, transactions: [] });
    });
});
