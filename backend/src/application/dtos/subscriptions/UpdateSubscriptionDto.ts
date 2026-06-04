// UpdateSubscriptionDto — ADMIN updates an existing subscription
// Only plan, startDate and endDate are mutable.
// Historical invoices are NOT recalculated — preserved as-is.

import { z } from 'zod';

export const UpdateSubscriptionSchema = z
  .object({
    planId:    z.string().uuid('planId must be a valid UUID').optional(),
    startDate: z.coerce.date().optional(),
    endDate:   z.coerce.date().optional(),
  })
  .refine(
    (data) => {
      if (data.startDate !== undefined && data.endDate !== undefined) {
        return data.endDate > data.startDate;
      }
      return true;
    },
    { message: 'endDate must be after startDate', path: ['endDate'] },
  )
  .refine(
    (data) =>
      data.planId !== undefined ||
      data.startDate !== undefined ||
      data.endDate !== undefined,
    { message: 'At least one field must be provided' },
  );

export type UpdateSubscriptionDto = z.infer<typeof UpdateSubscriptionSchema>;
