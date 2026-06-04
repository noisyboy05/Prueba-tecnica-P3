// PayInvoiceUseCase — CLIENT pays a PENDING invoice (transitions status to PAID)
// Validates:
//   1. Invoice exists.
//   2. Invoice belongs to the requesting user (via subscription ownership check).
//   3. State transition is valid: only PENDING → PAID is allowed here.
// OVERDUE → PAID is intentionally also permitted: a CLIENT may pay a late invoice.

import type { IInvoiceRepository } from '../../../domain/repositories/IInvoiceRepository';
import type { ISubscriptionRepository } from '../../../domain/repositories/ISubscriptionRepository';
import type { InvoiceResponseDto } from '../../dtos/invoices/InvoiceResponseDto';
import { InvoiceStatus } from '../../../domain/enums';
import { InvoiceNotFoundError, InvoiceAlreadyPaidError } from '../../../domain/errors/InvoiceErrors';
import { ForbiddenError } from '../../../domain/errors/AuthErrors';
import { mapInvoiceToDto } from '../../mappers/invoiceMapper';

export class PayInvoiceUseCase {
  constructor(
    private readonly invoiceRepository: IInvoiceRepository,
    private readonly subscriptionRepository: ISubscriptionRepository,
  ) {}

  async execute(invoiceId: string, requestingUserId: string): Promise<InvoiceResponseDto> {
    const invoice = await this.invoiceRepository.findById(invoiceId);
    if (!invoice) throw new InvoiceNotFoundError(invoiceId);

    // Verify ownership: invoice → subscription → userId
    const subscription = await this.subscriptionRepository.findById(invoice.subscriptionId);
    if (!subscription || subscription.userId !== requestingUserId) {
      throw new ForbiddenError('You do not have permission to pay this invoice');
    }

    // Validate state transition
    if (invoice.isPaid()) throw new InvoiceAlreadyPaidError(invoiceId);

    const updated = await this.invoiceRepository.updateStatus(invoiceId, InvoiceStatus.PAID);
    return mapInvoiceToDto(updated);
  }
}
