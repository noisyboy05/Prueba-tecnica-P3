// GetAllPlansUseCase — returns all plans (accessible by ADMIN and CLIENT)

import type { IPlanRepository } from '../../../domain/repositories/IPlanRepository';
import type { PlanResponseDto } from '../../dtos/plans/PlanResponseDto';
import { mapPlanToDto } from '../../mappers/planMapper';

export class GetAllPlansUseCase {
  constructor(private readonly planRepository: IPlanRepository) {}

  async execute(): Promise<PlanResponseDto[]> {
    const plans = await this.planRepository.findAll();
    return plans.map(mapPlanToDto);
  }
}
