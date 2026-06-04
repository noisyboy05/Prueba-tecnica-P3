// invoiceMapper — converts domain Invoice entity to InvoiceResponseDto

import type { Invoice } from '../../domain/entities/Invoice';
import type { InvoiceResponseDto } from '../dtos/invoices/InvoiceResponseDto';

export const mapInvoiceToDto = (invoice: Invoice): InvoiceResponseDto => ({
  id: invoice.id,
  subscriptionId: invoice.subscriptionId,
  amount: invoice.amount,
  status: invoice.status,
  dueDate: invoice.dueDate.toISOString(),
  createdAt: invoice.createdAt.toISOString(),
});
