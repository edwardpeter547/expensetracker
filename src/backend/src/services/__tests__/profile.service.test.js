import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { fileURLToPath } from 'url';
import path from 'path';

const mockUser = {
    id: 1,
    email: 'peter@example.com',
    username: 'peter',
    firstname: 'Peter',
    lastname: 'Yaanwa',
    avatar: null,
    language: 'en',
    currency: 'GBP',
    timezone: 'Europe/London',
    theme: 'light',
    isEmailVerified: true,
    lastLoginAt: new Date('2026-10-25T00:00:00Z'),
    createdAt: new Date('2026-10-01T00:00:00Z'),
    updatedAt: new Date('2026-10-25T00:00:00Z'),
};

const mockPrisma = {
    user: {
        findUnique: jest.fn(),
        update: jest.fn(),
    },
};

const prismaModulePath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../configurations/prisma.connect.js'
);

jest.unstable_mockModule(prismaModulePath, () => ({ default: mockPrisma }));

const profileService = await import('../profile.service.js');

describe('profile.service DTO mapping', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    /**
     * `toProfileDto` derives `displayName` and a stable avatar object, and
     * never carries credential or personal-identifier fields through.
     */
    test('maps a projected user to a safe, coherent profile DTO', () => {
        const dto = profileService.toProfileDto(mockUser);

        expect(dto).toMatchObject({
            id: 1,
            email: 'peter@example.com',
            username: 'peter',
            firstname: 'Peter',
            lastname: 'Yaanwa',
            displayName: 'Peter Yaanwa',
            language: 'en',
            currency: 'GBP',
            timezone: 'Europe/London',
            theme: 'light',
            isEmailVerified: true,
        });
        expect(dto.avatar).toMatchObject({ initials: 'PY', isDefault: true });
        expect(dto).not.toHaveProperty('tokenVersion');
        expect(dto).not.toHaveProperty('dateOfBirth');
        expect(dto).not.toHaveProperty('mobileNumber');
        expect(dto).not.toHaveProperty('password');
    });

    /**
     * A missing user maps to null, allowing the controller to return 404.
     */
    test('returns null for a missing user', () => {
        expect(profileService.toProfileDto(null)).toBeNull();
    });

    /**
     * `getUserProfileDto` selects the allowlisted fields and maps them through
     * the DTO transformer.
     */
    test('loads and maps the authenticated user profile DTO', async () => {
        mockPrisma.user.findUnique.mockResolvedValue(mockUser);

        const dto = await profileService.getUserProfileDto(1);

        expect(mockPrisma.user.findUnique).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: 1 } })
        );
        expect(dto.displayName).toBe('Peter Yaanwa');
    });

    /**
     * `updateUserProfile` normalizes usernames to lowercase before persisting
     * and returns the mapped DTO.
     */
    test('normalizes the username and maps the updated profile', async () => {
        mockPrisma.user.update.mockResolvedValue({ ...mockUser, username: 'peter' });

        const dto = await profileService.updateUserProfile(1, { username: 'Peter' });

        expect(mockPrisma.user.update).toHaveBeenCalledWith(
            expect.objectContaining({ data: { username: 'peter' } })
        );
        expect(dto.username).toBe('peter');
    });

    /**
     * A unique-constraint violation on the username is translated to a 409
     * conflict AppError.
     */
    test('translates a username unique violation to a 409 conflict', async () => {
        mockPrisma.user.update.mockRejectedValue(Object.assign(new Error('unique'), { code: 'P2002' }));

        await expect(profileService.updateUserProfile(1, { username: 'taken' }))
            .rejects.toMatchObject({ statusCode: 409 });
    });
});
