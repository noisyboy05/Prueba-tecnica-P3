// SubscriptionResponseDto — Output DTO for subscription data
// Includes an optional nested plan snapshot for convenience.

import type { PlanResponseDto } from '../plans/PlanResponseDto';

export interface SubscriptionResponseDto {
  id: string;
  userId: string;
  planId: string;
  startDate: string;
  endDate: string;
  status: string;
  createdAt: string;
  plan?: PlanResponseDto;
}
