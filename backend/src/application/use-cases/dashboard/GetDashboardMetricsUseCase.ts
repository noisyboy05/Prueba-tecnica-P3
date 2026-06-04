// GetDashboardMetricsUseCase — ADMIN retrieves aggregated platform metrics
// Uses entity methods (isActive, isExpired, isPaid, etc.) for status calculation,
// keeping business logic in the domain, not in the use case or DB query.

import type { IUserRepository } from '../../../domain/repositories/IUserRepository';
import type { IPlanRepository } from '../../../domain/repositories/IPlanRepository';
import type { ISubscriptionRepository } from '../../../domain/repositories/ISubscriptionRepository';
import type { IInvoiceRepository } from '../../../domain/repositories/IInvoiceRepository';
import type { DashboardResponseDto } from '../../dtos/dashboard/DashboardResponseDto';

export class GetDashboardMetricsUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly planRepository: IPlanRepository,
    private readonly subscriptionRepository: ISubscriptionRepository,
    private readonly invoiceRepository: IInvoiceRepository,
  ) {}

  async execute(): Promise<DashboardResponseDto> {
    const [users, plans, subscriptions, invoices] = await Promise.all([
      this.userRepository.findAll(),
      this.planRepository.findAll(),
      this.subscriptionRepository.findAll(),
      this.invoiceRepository.findAll(),
    ]);

    const paidInvoices = invoices.filter((i) => i.isPaid());

    return {
      totalUsers: users.length,
      totalPlans: plans.length,
      activeSubscriptions: subscriptions.filter((s) => s.isActive()).length,
      expiredSubscriptions: subscriptions.filter((s) => s.isExpired()).length,
      totalInvoices: invoices.length,
      pendingInvoices: invoices.filter((i) => i.isPending()).length,
      paidInvoices: paidInvoices.length,
      overdueInvoices: invoices.filter((i) => i.isOverdue() && !i.isPaid()).length,
      totalRevenue: paidInvoices.reduce((sum, i) => sum + i.amount, 0),
    };
  }
}
