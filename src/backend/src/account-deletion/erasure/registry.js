import { ErasureHandler } from './handler.js';

/**
 * Assembles erasure handlers and produces a dependency-safe execution plan.
 *
 * The registry is the single extension point for future data categories; the
 * coordinator only consumes the plan and never hardcodes handler names.
 */
export class ErasureRegistry {
    /**
     * @param {ErasureHandler[]} [handlers] Initial handlers to register.
     */
    constructor(handlers = []) {
        this.handlers = new Map();
        for (const handler of handlers) {
            this.register(handler);
        }
    }

    /**
     * Register a handler, rejecting duplicates.
     *
     * @param {ErasureHandler} handler The handler to register.
     * @returns {this} The registry for chaining.
     * @throws {Error} When a handler with the same name already exists.
     */
    register(handler) {
        if (!(handler instanceof ErasureHandler)) {
            throw new Error('registry only accepts ErasureHandler instances');
        }
        if (this.handlers.has(handler.name)) {
            throw new Error(`Duplicate erasure handler: ${handler.name}`);
        }
        this.handlers.set(handler.name, handler);
        return this;
    }

    /**
     * Whether a handler name is registered.
     *
     * @param {string} name The handler name.
     * @returns {boolean} True when registered.
     */
    has(name) {
        return this.handlers.has(name);
    }

    /**
     * Resolve a deterministic, dependency-safe handler execution plan.
     *
     * @returns {ErasureHandler[]} Handlers in execution order.
     * @throws {Error} On missing dependencies or a dependency cycle.
     */
    resolveExecutionPlan() {
        const names = [...this.handlers.keys()].sort();
        const inDegree = new Map();
        const dependents = new Map();

        for (const name of names) {
            inDegree.set(name, 0);
            dependents.set(name, []);
        }

        for (const handler of this.handlers.values()) {
            for (const dependency of handler.dependencies) {
                if (!this.handlers.has(dependency)) {
                    throw new Error(
                        `Erasure handler "${handler.name}" depends on missing handler "${dependency}"`
                    );
                }
                inDegree.set(handler.name, inDegree.get(handler.name) + 1);
                dependents.get(dependency).push(handler.name);
            }
        }

        const queue = names.filter((name) => inDegree.get(name) === 0);
        const plan = [];

        while (queue.length > 0) {
            queue.sort();
            const current = queue.shift();
            plan.push(current);

            for (const dependent of dependents.get(current)) {
                inDegree.set(dependent, inDegree.get(dependent) - 1);
                if (inDegree.get(dependent) === 0) {
                    queue.push(dependent);
                }
            }
        }

        if (plan.length !== names.length) {
            throw new Error('Circular dependency detected in erasure handlers');
        }

        return plan.map((name) => this.handlers.get(name));
    }
}
