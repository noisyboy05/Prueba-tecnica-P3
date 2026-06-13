// DeletePlanUseCase — ADMIN deletes a plan
// Business rule: a plan cannot be deleted if it has active subscriptions.
// Uses ISubscriptionRepository.existsActiveByPlanId to enforce this check
// before hitting the database constraint.

import type { IPlanRepository } from '../../../domain/repositories/IPlanRepository';
import type { ISubscriptionRepository } from '../../../domain/repositories/ISubscriptionRepository';
import { PlanNotFoundError, PlanInUseError } from '../../../domain/errors/PlanErrors';

export class DeletePlanUseCase {
  constructor(
    private readonly planRepository: IPlanRepository,
    private readonly subscriptionRepository: ISubscriptionRepository,
  ) {}

  async execute(id: string): Promise<void> {
    const plan = await this.planRepository.findById(id);
    if (!plan) throw new PlanNotFoundError(id);

    const inUse = await this.subscriptionRepository.existsActiveByPlanId(id);
    if (inUse) throw new PlanInUseError(id);

    await this.planRepository.delete(id);
  }
}
