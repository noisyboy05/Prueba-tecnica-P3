// CreatePlanDto — Input DTO for plan creation (ADMIN only)
// Validates plan name against allowed tiers defined in domain enums.

import { z } from 'zod';
import { PlanName } from '../../../domain/enums';

export const CreatePlanSchema = z.object({
  name: z.nativeEnum(PlanName, {
    errorMap: () => ({ message: `Plan name must be one of: ${Object.values(PlanName).join(', ')}` }),
  }),
  price: z.number().positive('Price must be a positive number').multipleOf(0.01),
  description: z.string().min(1, 'Description is required').trim(),
});

export type CreatePlanDto = z.infer<typeof CreatePlanSchema>;
