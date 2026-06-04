// BillingStrategyFactory — Factory Pattern
// Centralizes creation of BillingStrategy instances by plan name.
// Clients request a strategy by plan tier and receive the correct implementation.
// SRP: single responsibility — strategy instantiation.
// OCP: adding a new tier adds a new entry to the map and a new strategy class.
// DIP: callers depend on BillingStrategy (interface), not on concrete classes.

import { PlanName } from '../enums';
import type { BillingStrategy } from '../strategies/BillingStrategy';
import { BronzeBillingStrategy } from '../strategies/BronzeBillingStrategy';
import { SilverBillingStrategy } from '../strategies/SilverBillingStrategy';
import { GoldBillingStrategy } from '../strategies/GoldBillingStrategy';

export class BillingStrategyFactory {
  private static readonly strategies: Record<PlanName, BillingStrategy> = {
    [PlanName.BRONZE]: new BronzeBillingStrategy(),
    [PlanName.SILVER]: new SilverBillingStrategy(),
    [PlanName.GOLD]: new GoldBillingStrategy(),
  };

  static create(planName: PlanName): BillingStrategy {
    const strategy = BillingStrategyFactory.strategies[planName];

    if (!strategy) {
      throw new Error(`No billing strategy registered for plan: ${planName}`);
    }

    return strategy;
  }
}
