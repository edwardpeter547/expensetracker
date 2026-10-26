import { describe, expect, test } from '@jest/globals';
import { DeletionCoordinator } from '../coordinator.js';
import { DeletionPolicy } from '../../policies/policy.js';
import { ErasureHandler } from '../../erasure/handler.js';
import { ErasureRegistry } from '../../erasure/registry.js';

class FakeHandler extends ErasureHandler {
    constructor(name, dependencies = [], calls = []) {
        super({ name, dependencies });
        this.calls = calls;
    }

    async erase() {
        this.calls.push(this.name);
    }
}

const makeProgress = ({ initial = {}, failOn } = {}) => {
    const steps = { ...initial };
    const errors = [];
    return {
        errors,
        steps,
        async loadContext() {
            return { userId: 1, avatarKey: null, requestType: 'VOLUNTARY' };
        },
        async getOrCreateStep(requestId, category) {
            if (!steps[category]) steps[category] = { status: 'PENDING' };
            return steps[category];
        },
        async markCompleted(requestId, category) {
            steps[category] = { status: 'COMPLETED' };
        },
        async markReviewRequired(requestId, category) {
            steps[category] = { status: 'REVIEW_REQUIRED' };
        },
        async recordRetained(requestId, category) {
            steps[category] = { status: 'RETAINED' };
        },
        async recordStepError(requestId, category, message) {
            errors.push({ category, message });
        },
        async finalizeIfComplete() {
            return { status: 'COMPLETED' };
        },
        async getStatus() {
            return { status: 'COMPLETED' };
        },
    };
};

describe('DeletionCoordinator', () => {
    /**
     * Pending handlers run in dependency order and each is marked completed.
     */
    test('executes handlers in dependency order', async () => {
        const calls = [];
        const registry = new ErasureRegistry([
            new FakeHandler('b', ['a'], calls),
            new FakeHandler('a', [], calls),
        ]);
        const progress = makeProgress();
        const coordinator = new DeletionCoordinator({
            registry,
            policy: new DeletionPolicy(),
            progressRepository: progress,
        });

        await coordinator.execute('req-1');

        expect(calls).toEqual(['a', 'b']);
        expect(progress.steps.a.status).toBe('COMPLETED');
        expect(progress.steps.b.status).toBe('COMPLETED');
    });

    /**
     * Re-running the coordinator skips already-completed steps, making the
     * workflow idempotent after a crash.
     */
    test('skips completed steps on re-execution', async () => {
        const calls = [];
        const registry = new ErasureRegistry([new FakeHandler('a', [], calls)]);
        const progress = makeProgress({ initial: { a: { status: 'COMPLETED' } } });
        const coordinator = new DeletionCoordinator({
            registry,
            policy: new DeletionPolicy(),
            progressRepository: progress,
        });

        await coordinator.execute('req-1');

        expect(calls).toEqual([]);
    });

    /**
     * A handler failure records the step error and propagates the failure.
     */
    test('records a step error and propagates the failure', async () => {
        const registry = new ErasureRegistry([new FakeHandler('a')]);
        registry.handlers.get('a').erase = async () => {
            throw new Error('boom');
        };
        const progress = makeProgress();
        const coordinator = new DeletionCoordinator({
            registry,
            policy: new DeletionPolicy(),
            progressRepository: progress,
        });

        await expect(coordinator.execute('req-1')).rejects.toThrow('boom');
        expect(progress.errors).toEqual([{ category: 'a', message: 'boom' }]);
    });
});
