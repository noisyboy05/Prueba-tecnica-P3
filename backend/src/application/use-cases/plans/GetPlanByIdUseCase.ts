// GetPlanByIdUseCase — returns a single plan by ID

import type { IPlanRepository } from '../../../domain/repositories/IPlanRepository';
import type { PlanResponseDto } from '../../dtos/plans/PlanResponseDto';
import { PlanNotFoundError } from '../../../domain/errors/PlanErrors';
import { mapPlanToDto } from '../../mappers/planMapper';

export class GetPlanByIdUseCase {
  constructor(private readonly planRepository: IPlanRepository) {}

  async execute(id: string): Promise<PlanResponseDto> {
    const plan = await this.planRepository.findById(id);
    if (!plan) throw new PlanNotFoundError(id);
    return mapPlanToDto(plan);
  }
}
