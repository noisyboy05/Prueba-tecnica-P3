// ExpireSubscriptionUseCase — transitions a subscription to EXPIRED status
// Called by the checkSubscriptionStatus middleware when endDate has passed.
// Idempotent: if already EXPIRED, no operation is performed.

import type { ISubscriptionRepository } from '../../../domain/repositories/ISubscriptionRepository';
import { SubscriptionStatus } from '../../../domain/enums';
import { SubscriptionNotFoundError } from '../../../domain/errors/SubscriptionErrors';

export class ExpireSubscriptionUseCase {
  constructor(private readonly subscriptionRepository: ISubscriptionRepository) {}

  async execute(subscriptionId: string): Promise<void> {
    const subscription = await this.subscriptionRepository.findById(subscriptionId);
    if (!subscription) throw new SubscriptionNotFoundError(subscriptionId);

    if (subscription.isExpired()) {
      await this.subscriptionRepository.updateStatus(subscriptionId, SubscriptionStatus.EXPIRED);
    }
  }
}
