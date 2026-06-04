// ISubscriptionRepository — Domain port (Repository Pattern)
// Defines persistence operations for Subscription aggregate.
// findActiveByUserId enforces the business rule: one active subscription per user.

import type { Subscription } from '../entities/Subscription';
import type { SubscriptionStatus } from '../enums';

export interface CreateSubscriptionInput {
  userId: string;
  planId: string;
  startDate: Date;
  endDate: Date;
}

export interface UpdateSubscriptionInput {
  planId?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface ISubscriptionRepository {
  findById(id: string): Promise<Subscription | null>;
  findByUserId(userId: string): Promise<Subscription[]>;
  findActiveByUserId(userId: string): Promise<Subscription | null>;
  findAll(): Promise<Subscription[]>;
  create(input: CreateSubscriptionInput): Promise<Subscription>;
  /** Updates mutable fields (plan, dates). Historical invoices are preserved. */
  update(id: string, input: UpdateSubscriptionInput): Promise<Subscription>;
  updateStatus(id: string, status: SubscriptionStatus): Promise<Subscription>;
  /** Used by DeletePlanUseCase to prevent deletion of plans in use */
  existsActiveByPlanId(planId: string): Promise<boolean>;
}
