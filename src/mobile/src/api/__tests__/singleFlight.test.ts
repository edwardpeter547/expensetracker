import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { createSingleFlight } from '../singleFlight.ts';

describe('createSingleFlight', () => {
    test('coalesces concurrent calls into one task execution', async () => {
        const run = createSingleFlight<number>();
        let executions = 0;

        const task = async (): Promise<number> => {
            executions += 1;
            await new Promise((resolve) => setTimeout(resolve, 10));
            return 7;
        };

        const [first, second] = await Promise.all([run(task), run(task)]);

        assert.equal(executions, 1);
        assert.equal(first, 7);
        assert.equal(second, 7);
    });

    test('runs a new task after the previous one settles', async () => {
        const run = createSingleFlight<number>();

        const first = await run(async () => 1);
        const second = await run(async () => 2);

        assert.equal(first, 1);
        assert.equal(second, 2);
    });
});
