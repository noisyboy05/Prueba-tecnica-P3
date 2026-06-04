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

export interface ISubscriptionRepository {
  findById(id: string): Promise<Subscription | null>;
  findByUserId(userId: string): Promise<Subscription[]>;
  findActiveByUserId(userId: string): Promise<Subscription | null>;
  findAll(): Promise<Subscription[]>;
  create(input: CreateSubscriptionInput): Promise<Subscription>;
  updateStatus(id: string, status: SubscriptionStatus): Promise<Subscription>;
}
