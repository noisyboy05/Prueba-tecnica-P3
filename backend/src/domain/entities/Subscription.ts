// Subscription — Domain entity
// Pure TypeScript. No framework or ORM dependencies.
// Business rules:
//   - A subscription is active only when status=ACTIVE AND endDate is in the future.
//   - Expiration is determined by status OR endDate, whichever occurs first.

import { SubscriptionStatus } from '../enums';

export class Subscription {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly planId: string,
    public readonly startDate: Date,
    public readonly endDate: Date,
    public readonly status: SubscriptionStatus,
    public readonly createdAt: Date,
  ) {}

  isActive(): boolean {
    return this.status === SubscriptionStatus.ACTIVE && this.endDate > new Date();
  }

  isExpired(): boolean {
    return this.status === SubscriptionStatus.EXPIRED || this.endDate <= new Date();
  }
}
