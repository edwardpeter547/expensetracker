import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { fileURLToPath } from 'url';
import path from 'path';

const prismaModulePath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../../configurations/prisma.connect.js'
);

const storageAdapter = { delete: jest.fn(async () => {}) };

let steps = {};
let requestRecord = {
    id: 'req-1',
    userId: 7,
    requestType: 'VOLUNTARY',
    scope: 'ALL',
    context: { userId: 7, avatarKey: null },
};

const mockPrisma = {
    accountDeletionRequest: {
        findUnique: jest.fn(async () => ({ ...requestRecord, steps: Object.values(steps) })),
        update: jest.fn(async ({ data }) => {
            requestRecord = { ...requestRecord, ...data };
            return requestRecord;
        }),
    },
    deletionStep: {
        upsert: jest.fn(async ({ where, create }) => {
            const key = where.requestId_category;
            if (!steps[key.category]) {
                steps[key.category] = { requestId: key.requestId, category: key.category, ...create };
            }
            return steps[key.category];
        }),
        update: jest.fn(async ({ where, data }) => {
            const step = steps[where.requestId_category.category];
            Object.assign(step, data);
            return step;
        }),
    },
    transaction: { deleteMany: jest.fn(async () => ({ count: 1 })) },
    budget: { deleteMany: jest.fn(async () => ({ count: 1 })) },
    category: { deleteMany: jest.fn(async () => ({ count: 1 })) },
    notification: { deleteMany: jest.fn(async () => ({ count: 1 })) },
    loginAttempt: { deleteMany: jest.fn(async () => ({ count: 1 })) },
    refreshToken: { deleteMany: jest.fn(async () => ({ count: 1 })) },
    verificationToken: { deleteMany: jest.fn(async () => ({ count: 1 })) },
    passwordResetToken: { deleteMany: jest.fn(async () => ({ count: 1 })) },
    passwordHistory: { deleteMany: jest.fn(async () => ({ count: 1 })) },
    user: { deleteMany: jest.fn(async () => ({ count: 1 })) },
};

jest.unstable_mockModule(prismaModulePath, () => ({ default: mockPrisma }));

const service = await import('../service.js');

describe('deletion coordinator with the real progress repository', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        steps = {};
        requestRecord = {
            id: 'req-1',
            userId: 7,
            requestType: 'VOLUNTARY',
            scope: 'ALL',
            context: { userId: 7, avatarKey: null },
        };
    });

    /**
     * Executing the full coordinator against a Prisma-shaped mock erases every
     * category in dependency order and finalizes the request as COMPLETED.
     */
    test('erases all categories and finalizes the request', async () => {
        const coordinator = service.buildDeletionCoordinator({
            prisma: mockPrisma,
            storageAdapter,
        });

        const status = await coordinator.execute('req-1');

        expect(mockPrisma.transaction.deleteMany).toHaveBeenCalledWith({ where: { userId: 7 } });
        expect(mockPrisma.user.deleteMany).toHaveBeenCalledWith({ where: { id: 7 } });
        expect(status.status).toBe('COMPLETED');
        expect(Object.keys(steps).length).toBe(8);
    });
});
