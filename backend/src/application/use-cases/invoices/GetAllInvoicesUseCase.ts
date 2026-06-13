// GetAllInvoicesUseCase — ADMIN retrieves all invoices across all users

import type { IInvoiceRepository } from '../../../domain/repositories/IInvoiceRepository';
import type { InvoiceResponseDto } from '../../dtos/invoices/InvoiceResponseDto';
import { mapInvoiceToDto } from '../../mappers/invoiceMapper';

export class GetAllInvoicesUseCase {
  constructor(private readonly invoiceRepository: IInvoiceRepository) {}

  async execute(): Promise<InvoiceResponseDto[]> {
    const invoices = await this.invoiceRepository.findAll();
    return invoices.map(mapInvoiceToDto);
  }
}
