// AdminUpdateInvoiceStatusUseCase — ADMIN manually overrides an invoice's status
// No ownership check, no transition restrictions — ADMIN has full override rights.
// Mutable: only status.
// Immutable: amount, dueDate, subscriptionId (preserved for trazabilidad).
// Idempotent: setting the same status twice is a no-op in terms of side effects.

import type { IInvoiceRepository } from '../../../domain/repositories/IInvoiceRepository';
import type { InvoiceResponseDto } from '../../dtos/invoices/InvoiceResponseDto';
import type { InvoiceStatus } from '../../../domain/enums';
import { InvoiceNotFoundError } from '../../../domain/errors/InvoiceErrors';
import { mapInvoiceToDto } from '../../mappers/invoiceMapper';

export class AdminUpdateInvoiceStatusUseCase {
  constructor(private readonly invoiceRepository: IInvoiceRepository) {}

  async execute(invoiceId: string, status: InvoiceStatus): Promise<InvoiceResponseDto> {
    const invoice = await this.invoiceRepository.findById(invoiceId);
    if (!invoice) throw new InvoiceNotFoundError(invoiceId);

    const updated = await this.invoiceRepository.updateStatus(invoiceId, status);
    return mapInvoiceToDto(updated);
  }
}
