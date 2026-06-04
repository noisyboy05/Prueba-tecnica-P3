// CreateSubscriptionUseCase — ADMIN creates a subscription for a user
// Enforces:
//   1. User exists.
//   2. Plan exists.
//   3. User has no other ACTIVE subscription (business rule from ADR).
//   4. Automatically generates an invoice via GenerateInvoiceUseCase (ADR rule).
// The invoice generation delegates to GenerateInvoiceUseCase which owns
// BillingStrategyFactory usage (SRP, DRY).

import type { ISubscriptionRepository } from '../../../domain/repositories/ISubscriptionRepository';
import type { IPlanRepository } from '../../../domain/repositories/IPlanRepository';
import type { IUserRepository } from '../../../domain/repositories/IUserRepository';
import type { CreateSubscriptionDto } from '../../dtos/subscriptions/CreateSubscriptionDto';
import type { SubscriptionResponseDto } from '../../dtos/subscriptions/SubscriptionResponseDto';
import type { GenerateInvoiceUseCase } from '../invoices/GenerateInvoiceUseCase';
import { UserNotFoundError } from '../../../domain/errors/UserErrors';
import { PlanNotFoundError } from '../../../domain/errors/PlanErrors';
import { ActiveSubscriptionExistsError } from '../../../domain/errors/SubscriptionErrors';
import { mapSubscriptionToDto } from '../../mappers/subscriptionMapper';

export class CreateSubscriptionUseCase {
  constructor(
    private readonly subscriptionRepository: ISubscriptionRepository,
    private readonly planRepository: IPlanRepository,
    private readonly userRepository: IUserRepository,
    private readonly generateInvoiceUseCase: GenerateInvoiceUseCase,
  ) {}

  async execute(dto: CreateSubscriptionDto): Promise<SubscriptionResponseDto> {
    // 1. Verify user exists
    const user = await this.userRepository.findById(dto.userId);
    if (!user) throw new UserNotFoundError(dto.userId);

    // 2. Verify plan exists
    const plan = await this.planRepository.findById(dto.planId);
    if (!plan) throw new PlanNotFoundError(dto.planId);

    // 3. Enforce: one active subscription per user
    const activeSubscription = await this.subscriptionRepository.findActiveByUserId(dto.userId);
    if (activeSubscription) throw new ActiveSubscriptionExistsError(dto.userId);

    // 4. Create the subscription
    const subscription = await this.subscriptionRepository.create({
      userId: dto.userId,
      planId: dto.planId,
      startDate: dto.startDate,
      endDate: dto.endDate,
    });

    // 5. Automatically generate invoice (ADR rule)
    await this.generateInvoiceUseCase.execute(subscription.id);

    return mapSubscriptionToDto(subscription, plan);
  }
}
