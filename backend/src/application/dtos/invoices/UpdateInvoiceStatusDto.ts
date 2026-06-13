// UpdateInvoiceStatusDto — Input DTO for invoice status transitions
// CLIENT can only move an invoice to PAID.
// OVERDUE transition is system-driven (middleware / use case), not user input.

import { z } from 'zod';
import { InvoiceStatus } from '../../../domain/enums';

export const UpdateInvoiceStatusSchema = z.object({
  status: z.literal(InvoiceStatus.PAID, {
    errorMap: () => ({ message: 'Only PAID status is accepted via this endpoint' }),
  }),
});

export type UpdateInvoiceStatusDto = z.infer<typeof UpdateInvoiceStatusSchema>;
