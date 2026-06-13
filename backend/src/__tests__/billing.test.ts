// Billing unit tests
// Covers: BronzeBillingStrategy, SilverBillingStrategy, GoldBillingStrategy,
//         BillingStrategyFactory
// No database, no network. Pure domain logic.

import { describe, it, expect } from 'vitest';
import { Plan } from '../domain/entities/Plan';
import { PlanName } from '../domain/enums';
import { BronzeBillingStrategy } from '../domain/strategies/BronzeBillingStrategy';
import { SilverBillingStrategy } from '../domain/strategies/SilverBillingStrategy';
import { GoldBillingStrategy } from '../domain/strategies/GoldBillingStrategy';
import { BillingStrategyFactory } from '../domain/factories/BillingStrategyFactory';

// ── Fixtures ─────────────────────────────────────────────────────────────────

const buildPlan = (name: PlanName, price: number): Plan =>
  new Plan(`plan-${name}`, name, price, `${name} plan`, new Date('2024-01-01'));

// ── BronzeBillingStrategy ─────────────────────────────────────────────────────

describe('BronzeBillingStrategy', () => {
  it('shouldCalculateBronzeInvoice — returns plan.price as-is', () => {
    const plan = buildPlan(PlanName.BRONZE, 100);
    const strategy = new BronzeBillingStrategy();
    expect(strategy.calculate(plan)).toBe(100);
  });

  it('shouldCalculateBronzeInvoice — works with decimal prices', () => {
    const plan = buildPlan(PlanName.BRONZE, 49.99);
    const strategy = new BronzeBillingStrategy();
    expect(strategy.calculate(plan)).toBeCloseTo(49.99);
  });
});

// ── SilverBillingStrategy ─────────────────────────────────────────────────────

describe('SilverBillingStrategy', () => {
  it('shouldCalculateSilverInvoice — applies 5% premium over plan.price', () => {
    const plan = buildPlan(PlanName.SILVER, 100);
    const strategy = new SilverBillingStrategy();
    expect(strategy.calculate(plan)).toBeCloseTo(105);
  });

  it('shouldCalculateSilverInvoice — multiplier is exactly 1.05', () => {
    const plan = buildPlan(PlanName.SILVER, 200);
    const strategy = new SilverBillingStrategy();
    expect(strategy.calculate(plan)).toBeCloseTo(210);
  });
});

// ── GoldBillingStrategy ───────────────────────────────────────────────────────

describe('GoldBillingStrategy', () => {
  it('shouldCalculateGoldInvoice — applies 10% premium over plan.price', () => {
    const plan = buildPlan(PlanName.GOLD, 100);
    const strategy = new GoldBillingStrategy();
    expect(strategy.calculate(plan)).toBeCloseTo(110);
  });

  it('shouldCalculateGoldInvoice — multiplier is exactly 1.10', () => {
    const plan = buildPlan(PlanName.GOLD, 300);
    const strategy = new GoldBillingStrategy();
    expect(strategy.calculate(plan)).toBeCloseTo(330);
  });
});

// ── BillingStrategyFactory ────────────────────────────────────────────────────

describe('BillingStrategyFactory', () => {
  it('creates BronzeBillingStrategy for BRONZE', () => {
    const strategy = BillingStrategyFactory.create(PlanName.BRONZE);
    expect(strategy).toBeInstanceOf(BronzeBillingStrategy);
  });

  it('creates SilverBillingStrategy for SILVER', () => {
    const strategy = BillingStrategyFactory.create(PlanName.SILVER);
    expect(strategy).toBeInstanceOf(SilverBillingStrategy);
  });

  it('creates GoldBillingStrategy for GOLD', () => {
    const strategy = BillingStrategyFactory.create(PlanName.GOLD);
    expect(strategy).toBeInstanceOf(GoldBillingStrategy);
  });

  it('applies the correct strategy amount end-to-end for each tier', () => {
    const price = 100;
    expect(BillingStrategyFactory.create(PlanName.BRONZE).calculate(buildPlan(PlanName.BRONZE, price))).toBeCloseTo(100);
    expect(BillingStrategyFactory.create(PlanName.SILVER).calculate(buildPlan(PlanName.SILVER, price))).toBeCloseTo(105);
    expect(BillingStrategyFactory.create(PlanName.GOLD).calculate(buildPlan(PlanName.GOLD, price))).toBeCloseTo(110);
  });
});
