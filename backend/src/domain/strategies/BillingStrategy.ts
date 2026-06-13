// BillingStrategy — Strategy Pattern interface (port)
// Defines the contract for billing amount calculation per plan tier.
// OCP: new plan tiers extend the system by adding a new strategy, not modifying existing ones.
// DIP: use cases depend on this abstraction, never on concrete implementations.

import type { Plan } from '../entities/Plan';

export interface BillingStrategy {
  calculate(plan: Plan): number;
}
