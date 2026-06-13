// UpdateSubscriptionUseCase — ADMIN updates plan and/or dates of a subscription
// Business rules:
//   - Validates the subscription exists.
//   - Validates the new plan exists if planId is being changed.
//   - Historical invoices are preserved as-is (no recalculation).
// SRP: only updates subscription data; invoice lifecycle is separate.

import type { ISubscriptionRepository, UpdateSubscriptionInput } from '../../../domain/repositories/ISubscriptionRepository';
import type { IPlanRepository } from '../../../domain/repositories/IPlanRepository';
import type { UpdateSubscriptionDto } from '../../dtos/subscriptions/UpdateSubscriptionDto';
import type { SubscriptionResponseDto } from '../../dtos/subscriptions/SubscriptionResponseDto';
import { SubscriptionNotFoundError } from '../../../domain/errors/SubscriptionErrors';
import { PlanNotFoundError } from '../../../domain/errors/PlanErrors';
import { mapSubscriptionToDto } from '../../mappers/subscriptionMapper';

export class UpdateSubscriptionUseCase {
  constructor(
    private readonly subscriptionRepository: ISubscriptionRepository,
    private readonly planRepository: IPlanRepository,
  ) {}

  async execute(id: string, dto: UpdateSubscriptionDto): Promise<SubscriptionResponseDto> {
    const subscription = await this.subscriptionRepository.findById(id);
    if (!subscription) throw new SubscriptionNotFoundError(id);

    if (dto.planId !== undefined) {
      const plan = await this.planRepository.findById(dto.planId);
      if (!plan) throw new PlanNotFoundError(dto.planId);
    }

    // Build input safely for exactOptionalPropertyTypes
    const input: UpdateSubscriptionInput = {};
    if (dto.planId    !== undefined) { input.planId    = dto.planId;    }
    if (dto.startDate !== undefined) { input.startDate = dto.startDate; }
    if (dto.endDate   !== undefined) { input.endDate   = dto.endDate;   }

    const updated = await this.subscriptionRepository.update(id, input);
    const plan = await this.planRepository.findById(updated.planId);
    return mapSubscriptionToDto(updated, plan ?? undefined);
  }
}
