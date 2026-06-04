// IInvoiceRepository — Domain port (Repository Pattern)
// Defines persistence operations for Invoice aggregate.
// findByUserId resolves via subscription join; implementation detail left to adapter.

import type { Invoice } from '../entities/Invoice';
import type { InvoiceStatus } from '../enums';

export interface CreateInvoiceInput {
  subscriptionId: string;
  amount: number;
  dueDate: Date;
}

export interface IInvoiceRepository {
  findById(id: string): Promise<Invoice | null>;
  findBySubscriptionId(subscriptionId: string): Promise<Invoice[]>;
  findByUserId(userId: string): Promise<Invoice[]>;
  findAll(): Promise<Invoice[]>;
  create(input: CreateInvoiceInput): Promise<Invoice>;
  updateStatus(id: string, status: InvoiceStatus): Promise<Invoice>;
}
