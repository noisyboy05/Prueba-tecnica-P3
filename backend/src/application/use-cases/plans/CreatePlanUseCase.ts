// CreatePlanUseCase — ADMIN creates a new billing plan
// SRP: only creates plans; existence check prevents duplicate tiers.

import type { IPlanRepository } from '../../../domain/repositories/IPlanRepository';
import type { CreatePlanDto } from '../../dtos/plans/CreatePlanDto';
import type { PlanResponseDto } from '../../dtos/plans/PlanResponseDto';
import { PlanAlreadyExistsError } from '../../../domain/errors/PlanErrors';
import { mapPlanToDto } from '../../mappers/planMapper';

export class CreatePlanUseCase {
  constructor(private readonly planRepository: IPlanRepository) {}

  async execute(dto: CreatePlanDto): Promise<PlanResponseDto> {
    const existing = await this.planRepository.findByName(dto.name);
    if (existing) throw new PlanAlreadyExistsError(dto.name);

    const plan = await this.planRepository.create({
      name: dto.name,
      price: dto.price,
      description: dto.description,
    });

    return mapPlanToDto(plan);
  }
}
