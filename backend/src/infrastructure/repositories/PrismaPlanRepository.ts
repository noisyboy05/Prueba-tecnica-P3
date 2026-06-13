// PrismaPlanRepository — Infrastructure adapter implementing IPlanRepository
// Converts Prisma Decimal type to number when building domain entities.

import type { PrismaClient, Plan as PrismaPlan } from '@prisma/client';
import type {
  IPlanRepository,
  CreatePlanInput,
  UpdatePlanInput,
} from '../../domain/repositories/IPlanRepository';
import { Plan } from '../../domain/entities/Plan';
import { PlanName } from '../../domain/enums';

export class PrismaPlanRepository implements IPlanRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Plan | null> {
    const record = await this.prisma.plan.findUnique({ where: { id } });
    return record ? this.toDomain(record) : null;
  }

  async findByName(name: PlanName): Promise<Plan | null> {
    const record = await this.prisma.plan.findUnique({ where: { name } });
    return record ? this.toDomain(record) : null;
  }

  async findAll(): Promise<Plan[]> {
    const records = await this.prisma.plan.findMany({ orderBy: { createdAt: 'asc' } });
    return records.map((r) => this.toDomain(r));
  }

  async create(input: CreatePlanInput): Promise<Plan> {
    const record = await this.prisma.plan.create({
      data: {
        name: input.name,
        price: input.price,
        description: input.description,
      },
    });
    return this.toDomain(record);
  }

  async update(id: string, input: UpdatePlanInput): Promise<Plan> {
    const data: Parameters<typeof this.prisma.plan.update>[0]['data'] = {};
    if (input.price !== undefined) data.price = input.price;
    if (input.description !== undefined) data.description = input.description;

    const record = await this.prisma.plan.update({ where: { id }, data });
    return this.toDomain(record);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.plan.delete({ where: { id } });
  }

  private toDomain(record: PrismaPlan): Plan {
    return new Plan(
      record.id,
      record.name as PlanName,
      Number(record.price), // Prisma Decimal → number
      record.description,
      record.createdAt,
    );
  }
}
