// SilverBillingStrategy — Concrete Strategy
// SILVER tier: standard price + 5% premium.
// Independent class: billing logic evolves per tier without modifying others (OCP).

import type { Plan } from '../entities/Plan';
import type { BillingStrategy } from './BillingStrategy';

export class SilverBillingStrategy implements BillingStrategy {
  private static readonly MULTIPLIER = 1.05;

  calculate(plan: Plan): number {
    return plan.price * SilverBillingStrategy.MULTIPLIER;
  }
}
