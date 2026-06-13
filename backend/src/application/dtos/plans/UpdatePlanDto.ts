// UpdatePlanDto — Input DTO for plan updates (ADMIN only)
// Only price and description are mutable; plan name (tier) is immutable after creation.

import { z } from 'zod';

export const UpdatePlanSchema = z
  .object({
    price: z.number().positive('Price must be a positive number').multipleOf(0.01).optional(),
    description: z.string().min(1, 'Description cannot be empty').trim().optional(),
  })
  .refine((data) => data.price !== undefined || data.description !== undefined, {
    message: 'At least one field (price or description) must be provided',
  });

export type UpdatePlanDto = z.infer<typeof UpdatePlanSchema>;
