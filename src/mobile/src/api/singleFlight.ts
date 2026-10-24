/**
 * Minimal single-flight helper used to deduplicate concurrent token refreshes.
 *
 * Only one task is ever in flight at a time; later callers join the same
 * promise so a burst of 401 responses cannot issue overlapping refresh calls.
 */

/**
 * Create a single-flight runner for an async task.
 *
 * @returns {(task: () => Promise<T>) => Promise<T>} A function that coalesces
 *   concurrent calls into one shared promise.
 */
export const createSingleFlight = <T>() => {
    let inFlight: Promise<T> | null = null;

    return (task: () => Promise<T>): Promise<T> => {
        if (!inFlight) {
            inFlight = task().finally(() => {
                inFlight = null;
            });
        }
        return inFlight;
    };
};
