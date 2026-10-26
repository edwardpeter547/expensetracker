/**
 * Orchestrates erasure handlers without knowing any concrete data category.
 *
 * The coordinator receives a registry (execution plan), a policy (decision
 * authority), and a progress repository (durable state), then drives each
 * pending step and finalizes the request. It contains no Prisma model logic.
 */
export class DeletionCoordinator {
    /**
     * @param {{registry: object, policy: object, progressRepository: object}} deps
     *   The registry, policy, and progress repository.
     */
    constructor({ registry, policy, progressRepository }) {
        this.registry = registry;
        this.policy = policy;
        this.progressRepository = progressRepository;
    }

    /**
     * Execute all due steps for a deletion request.
     *
     * Steps that are already completed, retained, or awaiting review are
     * skipped so the coordinator is safe to re-run after a crash.
     *
     * @param {string} requestId The deletion request id.
     * @returns {Promise<object>} The request status after execution.
     */
    async execute(requestId) {
        const context = await this.progressRepository.loadContext(requestId);
        const plan = this.registry.resolveExecutionPlan();

        for (const handler of plan) {
            const step = await this.progressRepository.getOrCreateStep(requestId, handler.name);
            if (['COMPLETED', 'RETAINED', 'REVIEW_REQUIRED'].includes(step.status)) {
                continue;
            }

            const decision = this.policy.resolve({
                requestType: context.requestType,
                dataCategory: handler.name,
            });

            if (decision.action === 'RETAIN') {
                await this.progressRepository.recordRetained(requestId, handler.name, decision);
                continue;
            }

            if (decision.action === 'REVIEW') {
                await this.progressRepository.markReviewRequired(requestId, handler.name);
                continue;
            }

            try {
                await handler.erase(context);
            } catch (error) {
                await this.progressRepository
                    .recordStepError(requestId, handler.name, error?.message ?? String(error))
                    .catch(() => {});
                throw error;
            }
            await this.progressRepository.markCompleted(requestId, handler.name);
        }

        await this.progressRepository.finalizeIfComplete(requestId);
        return this.progressRepository.getStatus(requestId);
    }
}
