// GetAllSubscriptionsUseCase — ADMIN retrieves all subscriptions with plan details
// Avoids N+1: fetches all plans once and builds a lookup map before enriching subscriptions.

import type { ISubscriptionRepository } from '../../../domain/repositories/ISubscriptionRepository';
import type { IPlanRepository } from '../../../domain/repositories/IPlanRepository';
import type { SubscriptionResponseDto } from '../../dtos/subscriptions/SubscriptionResponseDto';
import { mapSubscriptionToDto } from '../../mappers/subscriptionMapper';

export class GetAllSubscriptionsUseCase {
  constructor(
    private readonly subscriptionRepository: ISubscriptionRepository,
    private readonly planRepository: IPlanRepository,
  ) {}

  async execute(): Promise<SubscriptionResponseDto[]> {
    const [subscriptions, plans] = await Promise.all([
      this.subscriptionRepository.findAll(),
      this.planRepository.findAll(),
    ]);

    const planMap = new Map(plans.map((p) => [p.id, p]));

    return subscriptions.map((sub) => mapSubscriptionToDto(sub, planMap.get(sub.planId)));
  }
}
