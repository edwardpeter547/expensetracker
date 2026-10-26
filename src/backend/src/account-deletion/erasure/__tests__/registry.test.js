import { describe, expect, test } from '@jest/globals';
import { ErasureHandler } from '../handler.js';
import { ErasureRegistry } from '../registry.js';
import {
    AuthenticationErasureHandler,
    AvatarErasureHandler,
    BudgetErasureHandler,
    CategoryErasureHandler,
    NotificationErasureHandler,
    ProfileErasureHandler,
    TransactionErasureHandler,
} from '../handlers.js';

class FakeHandler extends ErasureHandler {
    constructor(name, dependencies = []) {
        super({ name, dependencies });
    }

    async erase() {}
}

describe('ErasureRegistry', () => {
    /**
     * The abstract handler contract cannot be instantiated directly.
     */
    test('rejects direct instantiation of the abstract handler', () => {
        expect(() => new ErasureHandler({ name: 'x' })).toThrow();
    });

    /**
     * All concrete handlers are exported from one module and register cleanly.
     */
    test('registers the concrete handlers exported from one module', () => {
        const registry = new ErasureRegistry([
            new TransactionErasureHandler({ prisma: {} }),
            new BudgetErasureHandler({ prisma: {} }),
            new CategoryErasureHandler({ prisma: {} }),
            new NotificationErasureHandler({ prisma: {} }),
            new AuthenticationErasureHandler({ prisma: {} }),
            new AvatarErasureHandler({ storageAdapter: null }),
            new ProfileErasureHandler({ prisma: {} }),
        ]);

        expect(registry.has('transactions')).toBe(true);
        expect(registry.has('profile')).toBe(true);
    });

    /**
     * A deterministic plan orders transactions and budgets before categories,
     * and puts profile last.
     */
    test('produces a dependency-safe deterministic execution plan', () => {
        const registry = new ErasureRegistry([
            new FakeHandler('profile', ['categories']),
            new FakeHandler('categories', ['transactions', 'budgets']),
            new FakeHandler('budgets'),
            new FakeHandler('transactions'),
        ]);

        const plan = registry.resolveExecutionPlan().map((handler) => handler.name);

        expect(plan.indexOf('transactions')).toBeLessThan(plan.indexOf('categories'));
        expect(plan.indexOf('budgets')).toBeLessThan(plan.indexOf('categories'));
        expect(plan[plan.length - 1]).toBe('profile');
    });

    /**
     * Registering two handlers with the same name must fail.
     */
    test('rejects duplicate handler names', () => {
        const registry = new ErasureRegistry();
        registry.register(new FakeHandler('duplicate'));

        expect(() => registry.register(new FakeHandler('duplicate'))).toThrow('Duplicate erasure handler');
    });

    /**
     * A handler that depends on a missing handler must fail plan resolution.
     */
    test('rejects missing dependencies', () => {
        const registry = new ErasureRegistry([new FakeHandler('broken', ['missing'])]);

        expect(() => registry.resolveExecutionPlan()).toThrow('missing handler');
    });

    /**
     * Circular dependencies must be detected rather than looping forever.
     */
    test('rejects circular dependencies', () => {
        const registry = new ErasureRegistry([
            new FakeHandler('a', ['b']),
            new FakeHandler('b', ['a']),
        ]);

        expect(() => registry.resolveExecutionPlan()).toThrow('Circular dependency');
    });

    /**
     * Registering a new handler extends the plan without touching any
     * coordinator code.
     */
    test('supports registering a new handler without modifying the coordinator', () => {
        const registry = new ErasureRegistry([new TransactionErasureHandler({ prisma: {} })]);
        registry.register(new FakeHandler('receipts'));

        expect(registry.resolveExecutionPlan().map((h) => h.name)).toEqual(
            expect.arrayContaining(['transactions', 'receipts'])
        );
    });
});
