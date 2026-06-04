// CancelSubscriptionUseCase — ADMIN forcibly expires a subscription
// Differs from ExpireSubscriptionUseCase (which only expires when endDate has passed).
// This use case sets EXPIRED regardless of endDate — admin override.
// Historical invoices and subscription records are preserved (soft cancel).
// Idempotent: no-op if already EXPIRED.

import type { ISubscriptionRepository } from '../../../domain/repositories/ISubscriptionRepository';
import { SubscriptionStatus } from '../../../domain/enums';
import { SubscriptionNotFoundError } from '../../../domain/errors/SubscriptionErrors';

export class CancelSubscriptionUseCase {
  constructor(private readonly subscriptionRepository: ISubscriptionRepository) {}

  async execute(subscriptionId: string): Promise<void> {
    const subscription = await this.subscriptionRepository.findById(subscriptionId);
    if (!subscription) throw new SubscriptionNotFoundError(subscriptionId);

    if (subscription.status === SubscriptionStatus.EXPIRED) return;

    await this.subscriptionRepository.updateStatus(subscriptionId, SubscriptionStatus.EXPIRED);
  }
}
