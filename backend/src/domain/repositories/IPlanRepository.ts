// IPlanRepository — Domain port (Repository Pattern)
// Defines persistence operations for Plan aggregate.
// Infrastructure (Prisma) implements this interface as an adapter.

import type { Plan } from '../entities/Plan';
import type { PlanName } from '../enums';

export interface CreatePlanInput {
  name: PlanName;
  price: number;
  description: string;
}

export interface UpdatePlanInput {
  price?: number;
  description?: string;
}

export interface IPlanRepository {
  findById(id: string): Promise<Plan | null>;
  findByName(name: PlanName): Promise<Plan | null>;
  findAll(): Promise<Plan[]>;
  create(input: CreatePlanInput): Promise<Plan>;
  update(id: string, input: UpdatePlanInput): Promise<Plan>;
  delete(id: string): Promise<void>;
}
