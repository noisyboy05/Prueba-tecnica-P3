// UpdatePlanUseCase — ADMIN updates price and/or description of an existing plan
// Plan name (tier) is immutable after creation — enforced here, not in the DB.

import type { IPlanRepository } from '../../../domain/repositories/IPlanRepository';
import type { UpdatePlanDto } from '../../dtos/plans/UpdatePlanDto';
import type { PlanResponseDto } from '../../dtos/plans/PlanResponseDto';
import { PlanNotFoundError } from '../../../domain/errors/PlanErrors';
import { mapPlanToDto } from '../../mappers/planMapper';

export class UpdatePlanUseCase {
  constructor(private readonly planRepository: IPlanRepository) {}

  async execute(id: string, dto: UpdatePlanDto): Promise<PlanResponseDto> {
    const plan = await this.planRepository.findById(id);
    if (!plan) throw new PlanNotFoundError(id);

    // Build update payload safely (exactOptionalPropertyTypes compatibility)
    const input: { price?: number; description?: string } = {};
    if (dto.price !== undefined) input.price = dto.price;
    if (dto.description !== undefined) input.description = dto.description;

    const updated = await this.planRepository.update(id, input);
    return mapPlanToDto(updated);
  }
}
