// PrismaSubscriptionRepository — Infrastructure adapter implementing ISubscriptionRepository
// findActiveByUserId checks both status=ACTIVE and endDate > now, mirroring
// the domain entity's isActive() method to ensure consistency.

import type { PrismaClient, Subscription as PrismaSubscription } from '@prisma/client';
import type {
  ISubscriptionRepository,
  CreateSubscriptionInput,
} from '../../domain/repositories/ISubscriptionRepository';
import { Subscription } from '../../domain/entities/Subscription';
import { SubscriptionStatus } from '../../domain/enums';

export class PrismaSubscriptionRepository implements ISubscriptionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Subscription | null> {
    const record = await this.prisma.subscription.findUnique({ where: { id } });
    return record ? this.toDomain(record) : null;
  }

  async findByUserId(userId: string): Promise<Subscription[]> {
    const records = await this.prisma.subscription.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return records.map((r) => this.toDomain(r));
  }

  async findActiveByUserId(userId: string): Promise<Subscription | null> {
    const record = await this.prisma.subscription.findFirst({
      where: {
        userId,
        status: SubscriptionStatus.ACTIVE,
        endDate: { gt: new Date() },
      },
    });
    return record ? this.toDomain(record) : null;
  }

  async findAll(): Promise<Subscription[]> {
    const records = await this.prisma.subscription.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return records.map((r) => this.toDomain(r));
  }

  async create(input: CreateSubscriptionInput): Promise<Subscription> {
    const record = await this.prisma.subscription.create({
      data: {
        userId: input.userId,
        planId: input.planId,
        startDate: input.startDate,
        endDate: input.endDate,
        // status defaults to ACTIVE per schema
      },
    });
    return this.toDomain(record);
  }

  async updateStatus(id: string, status: SubscriptionStatus): Promise<Subscription> {
    const record = await this.prisma.subscription.update({
      where: { id },
      data: { status },
    });
    return this.toDomain(record);
  }

  async existsActiveByPlanId(planId: string): Promise<boolean> {
    const count = await this.prisma.subscription.count({
      where: { planId, status: SubscriptionStatus.ACTIVE },
    });
    return count > 0;
  }

  private toDomain(record: PrismaSubscription): Subscription {
    return new Subscription(
      record.id,
      record.userId,
      record.planId,
      record.startDate,
      record.endDate,
      record.status as SubscriptionStatus,
      record.createdAt,
    );
  }
}
