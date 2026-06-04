// GetUserSubscriptionUseCase — CLIENT retrieves their active subscription
// Returns null if the user has no active subscription (no error, just empty state).

import type { ISubscriptionRepository } from '../../../domain/repositories/ISubscriptionRepository';
import type { IPlanRepository } from '../../../domain/repositories/IPlanRepository';
import type { SubscriptionResponseDto } from '../../dtos/subscriptions/SubscriptionResponseDto';
import { mapSubscriptionToDto } from '../../mappers/subscriptionMapper';

export class GetUserSubscriptionUseCase {
  constructor(
    private readonly subscriptionRepository: ISubscriptionRepository,
    private readonly planRepository: IPlanRepository,
  ) {}

  async execute(userId: string): Promise<SubscriptionResponseDto | null> {
    const subscription = await this.subscriptionRepository.findActiveByUserId(userId);
    if (!subscription) return null;

    const plan = await this.planRepository.findById(subscription.planId);
    return mapSubscriptionToDto(subscription, plan ?? undefined);
  }
}
