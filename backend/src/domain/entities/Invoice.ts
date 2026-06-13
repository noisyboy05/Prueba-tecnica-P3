// Invoice — Domain entity
// Pure TypeScript. No framework or ORM dependencies.
// Business rules:
//   - Cannot exist without a subscription.
//   - Transitions: PENDING → PAID (by CLIENT payment) or PENDING → OVERDUE (past dueDate).

import { InvoiceStatus } from '../enums';

export class Invoice {
  constructor(
    public readonly id: string,
    public readonly subscriptionId: string,
    public readonly amount: number,
    public readonly status: InvoiceStatus,
    public readonly dueDate: Date,
    public readonly createdAt: Date,
  ) {}

  isPending(): boolean {
    return this.status === InvoiceStatus.PENDING;
  }

  isPaid(): boolean {
    return this.status === InvoiceStatus.PAID;
  }

  isOverdue(): boolean {
    return (
      this.status === InvoiceStatus.OVERDUE ||
      (this.status === InvoiceStatus.PENDING && this.dueDate < new Date())
    );
  }
}
