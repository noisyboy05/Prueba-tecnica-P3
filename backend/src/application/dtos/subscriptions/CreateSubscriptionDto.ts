// CreateSubscriptionDto — Input DTO for subscription creation (ADMIN only)
// endDate must be strictly after startDate.

import { z } from 'zod';

export const CreateSubscriptionSchema = z
  .object({
    userId: z.string().uuid('userId must be a valid UUID'),
    planId: z.string().uuid('planId must be a valid UUID'),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
  })
  .refine((data) => data.endDate > data.startDate, {
    message: 'endDate must be after startDate',
    path: ['endDate'],
  });

export type CreateSubscriptionDto = z.infer<typeof CreateSubscriptionSchema>;
