// MarkInvoiceOverdueUseCase — marks a PENDING invoice as OVERDUE when dueDate has passed
// Idempotent: if the invoice is already OVERDUE or PAID, no operation is performed.
// Triggered by a scheduled job or by the middleware on each request.

import type { IInvoiceRepository } from '../../../domain/repositories/IInvoiceRepository';
import { InvoiceStatus } from '../../../domain/enums';
import { InvoiceNotFoundError } from '../../../domain/errors/InvoiceErrors';

export class MarkInvoiceOverdueUseCase {
  constructor(private readonly invoiceRepository: IInvoiceRepository) {}

  async execute(invoiceId: string): Promise<void> {
    const invoice = await this.invoiceRepository.findById(invoiceId);
    if (!invoice) throw new InvoiceNotFoundError(invoiceId);

    // Only PENDING invoices past dueDate transition to OVERDUE
    if (invoice.isPending() && invoice.isOverdue()) {
      await this.invoiceRepository.updateStatus(invoiceId, InvoiceStatus.OVERDUE);
    }
  }
}
