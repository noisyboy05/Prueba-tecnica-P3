// GoldBillingStrategy — Concrete Strategy
// GOLD tier: standard price.
// The strategy exists as an independent class to allow independent evolution
// of billing logic per tier without modifying other strategies (OCP).

import type { Plan } from '../entities/Plan';
import type { BillingStrategy } from './BillingStrategy';

export class GoldBillingStrategy implements BillingStrategy {
  calculate(plan: Plan): number {
    return plan.price;
  }
}
