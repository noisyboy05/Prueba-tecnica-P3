// subscriptionMapper — converts domain Subscription entity to SubscriptionResponseDto
// Optionally embeds a plan snapshot when the caller has already loaded it (avoids N+1).

import type { Subscription } from '../../domain/entities/Subscription';
import type { Plan } from '../../domain/entities/Plan';
import type { SubscriptionResponseDto } from '../dtos/subscriptions/SubscriptionResponseDto';
import { mapPlanToDto } from './planMapper';

export const mapSubscriptionToDto = (
  subscription: Subscription,
  plan?: Plan,
): SubscriptionResponseDto => ({
  id: subscription.id,
  userId: subscription.userId,
  planId: subscription.planId,
  startDate: subscription.startDate.toISOString(),
  endDate: subscription.endDate.toISOString(),
  status: subscription.status,
  createdAt: subscription.createdAt.toISOString(),
  ...(plan !== undefined && { plan: mapPlanToDto(plan) }),
});
