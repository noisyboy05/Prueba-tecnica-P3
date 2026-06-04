// GetUserInvoicesUseCase — CLIENT retrieves all invoices associated with their subscriptions

import type { IInvoiceRepository } from '../../../domain/repositories/IInvoiceRepository';
import type { InvoiceResponseDto } from '../../dtos/invoices/InvoiceResponseDto';
import { mapInvoiceToDto } from '../../mappers/invoiceMapper';

export class GetUserInvoicesUseCase {
  constructor(private readonly invoiceRepository: IInvoiceRepository) {}

  async execute(userId: string): Promise<InvoiceResponseDto[]> {
    const invoices = await this.invoiceRepository.findByUserId(userId);
    return invoices.map(mapInvoiceToDto);
  }
}
