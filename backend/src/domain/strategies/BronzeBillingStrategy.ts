// BronzeBillingStrategy — Concrete Strategy
// BRONZE tier: standard price, no modifications.

import type { Plan } from '../entities/Plan';
import type { BillingStrategy } from './BillingStrategy';

export class BronzeBillingStrategy implements BillingStrategy {
  calculate(plan: Plan): number {
    return plan.price;
  }
}
