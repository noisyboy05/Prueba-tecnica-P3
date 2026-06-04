// planMapper — converts domain Plan entity to PlanResponseDto
// Pure function, no side effects. Decouples domain types from transport layer.

import type { Plan } from '../../domain/entities/Plan';
import type { PlanResponseDto } from '../dtos/plans/PlanResponseDto';

export const mapPlanToDto = (plan: Plan): PlanResponseDto => ({
  id: plan.id,
  name: plan.name,
  price: plan.price,
  description: plan.description,
  createdAt: plan.createdAt.toISOString(),
});
