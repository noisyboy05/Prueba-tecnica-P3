// AdminUpdateInvoiceStatusDto — ADMIN manual override of invoice status
// Unlike UpdateInvoiceStatusDto (CLIENT pay — only PAID allowed),
// this DTO allows all three statuses: PENDING, PAID, OVERDUE.
// Use cases: correct data entry errors, mark operational overdue invoices,
// restore a mistakenly paid invoice to PENDING.

import { z } from 'zod';
import { InvoiceStatus } from '../../../domain/enums';

export const AdminUpdateInvoiceStatusSchema = z.object({
  status: z.nativeEnum(InvoiceStatus, {
    errorMap: () => ({
      message: `Status must be one of: ${Object.values(InvoiceStatus).join(', ')}`,
    }),
  }),
});

export type AdminUpdateInvoiceStatusDto = z.infer<typeof AdminUpdateInvoiceStatusSchema>;
