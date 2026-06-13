// GoldBillingStrategy — Concrete Strategy
// GOLD tier: standard price + 10% premium.
// Independent class: billing logic evolves per tier without modifying others (OCP).

import type { Plan } from '../entities/Plan';
import type { BillingStrategy } from './BillingStrategy';

export class GoldBillingStrategy implements BillingStrategy {
  private static readonly MULTIPLIER = 1.1;

  calculate(plan: Plan): number {
    return plan.price * GoldBillingStrategy.MULTIPLIER;
  }
}
