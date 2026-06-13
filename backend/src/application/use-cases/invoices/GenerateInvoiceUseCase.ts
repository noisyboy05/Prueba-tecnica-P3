// GenerateInvoiceUseCase — generates an invoice for an existing subscription
// Uses BillingStrategyFactory to select the correct calculation strategy per plan tier.
// Factory Pattern + Strategy Pattern: centralized strategy creation, decoupled calculation.
// This use case is called by CreateSubscriptionUseCase (automatic invoice on subscription creation).
// It can also be invoked independently for invoice regeneration scenarios.

import type { ISubscriptionRepository } from '../../../domain/repositories/ISubscriptionRepository';
import type { IPlanRepository } from '../../../domain/repositories/IPlanRepository';
import type { IInvoiceRepository } from '../../../domain/repositories/IInvoiceRepository';
import type { InvoiceResponseDto } from '../../dtos/invoices/InvoiceResponseDto';
import { BillingStrategyFactory } from '../../../domain/factories/BillingStrategyFactory';
import { SubscriptionNotFoundError } from '../../../domain/errors/SubscriptionErrors';
import { PlanNotFoundError } from '../../../domain/errors/PlanErrors';
import { mapInvoiceToDto } from '../../mappers/invoiceMapper';

export class GenerateInvoiceUseCase {
  constructor(
    private readonly subscriptionRepository: ISubscriptionRepository,
    private readonly planRepository: IPlanRepository,
    private readonly invoiceRepository: IInvoiceRepository,
  ) {}

  async execute(subscriptionId: string): Promise<InvoiceResponseDto> {
    const subscription = await this.subscriptionRepository.findById(subscriptionId);
    if (!subscription) throw new SubscriptionNotFoundError(subscriptionId);

    const plan = await this.planRepository.findById(subscription.planId);
    if (!plan) throw new PlanNotFoundError(subscription.planId);

    // Factory selects the strategy; strategy calculates the amount
    const strategy = BillingStrategyFactory.create(plan.name);
    const amount = strategy.calculate(plan);

    // Invoice due date aligns with the end of the subscription period
    const invoice = await this.invoiceRepository.create({
      subscriptionId: subscription.id,
      amount,
      dueDate: subscription.endDate,
    });

    return mapInvoiceToDto(invoice);
  }
}
