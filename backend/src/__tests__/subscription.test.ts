// Subscription unit tests
// Covers: Subscription entity methods, CreateSubscriptionUseCase,
//         ExpireSubscriptionUseCase
// Repositories are fully mocked — no database required.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Subscription } from '../domain/entities/Subscription';
import { User } from '../domain/entities/User';
import { Plan } from '../domain/entities/Plan';
import { SubscriptionStatus, UserRole, PlanName } from '../domain/enums';
import { ActiveSubscriptionExistsError } from '../domain/errors/SubscriptionErrors';
import { SubscriptionNotFoundError } from '../domain/errors/SubscriptionErrors';
import type { ISubscriptionRepository } from '../domain/repositories/ISubscriptionRepository';
import type { IPlanRepository } from '../domain/repositories/IPlanRepository';
import type { IUserRepository } from '../domain/repositories/IUserRepository';
import type { GenerateInvoiceUseCase } from '../application/use-cases/invoices/GenerateInvoiceUseCase';
import { CreateSubscriptionUseCase } from '../application/use-cases/subscriptions/CreateSubscriptionUseCase';
import { ExpireSubscriptionUseCase } from '../application/use-cases/subscriptions/ExpireSubscriptionUseCase';

// ── Fixtures ─────────────────────────────────────────────────────────────────

const PAST   = new Date('2020-01-01');
const FUTURE = new Date(Date.now() + 86_400_000 * 30); // 30 days from now

const mockUser = new User('user-1', 'Alice', 'alice@example.com', 'hashed', UserRole.CLIENT, new Date());
const mockPlan = new Plan('plan-1', PlanName.SILVER, 100, 'Silver plan', new Date());

const buildActiveSub = (): Subscription =>
  new Subscription('sub-1', 'user-1', 'plan-1', new Date(), FUTURE, SubscriptionStatus.ACTIVE, new Date());

const buildExpiredSub = (): Subscription =>
  new Subscription('sub-2', 'user-1', 'plan-1', PAST, PAST, SubscriptionStatus.ACTIVE, PAST);

const buildSubRepo = (
  partial: Partial<ISubscriptionRepository> = {},
): ISubscriptionRepository =>
  ({
    findById: vi.fn().mockResolvedValue(null),
    findByUserId: vi.fn().mockResolvedValue([]),
    findActiveByUserId: vi.fn().mockResolvedValue(null),
    findAll: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue(buildActiveSub()),
    updateStatus: vi.fn().mockResolvedValue(buildActiveSub()),
    existsActiveByPlanId: vi.fn().mockResolvedValue(false),
    ...partial,
  }) as unknown as ISubscriptionRepository;

const buildPlanRepo = (plan: Plan | null = mockPlan): IPlanRepository =>
  ({
    findById: vi.fn().mockResolvedValue(plan),
    findByName: vi.fn().mockResolvedValue(plan),
    findAll: vi.fn().mockResolvedValue(plan ? [plan] : []),
    create: vi.fn().mockResolvedValue(plan),
    update: vi.fn().mockResolvedValue(plan),
    delete: vi.fn().mockResolvedValue(undefined),
  }) as unknown as IPlanRepository;

const buildUserRepo = (user: User | null = mockUser): IUserRepository =>
  ({
    findById: vi.fn().mockResolvedValue(user),
    findByEmail: vi.fn().mockResolvedValue(user),
    findAll: vi.fn().mockResolvedValue(user ? [user] : []),
    create: vi.fn().mockResolvedValue(user),
    update: vi.fn().mockResolvedValue(user),
  }) as unknown as IUserRepository;

const buildMockGenerateInvoice = (): GenerateInvoiceUseCase =>
  ({ execute: vi.fn().mockResolvedValue({ id: 'inv-1', amount: 105 }) }) as unknown as GenerateInvoiceUseCase;

// ── Subscription entity ───────────────────────────────────────────────────────

describe('Subscription entity', () => {
  it('shouldValidateActiveSubscription — isActive() is true when ACTIVE and endDate in future', () => {
    const sub = buildActiveSub();
    expect(sub.isActive()).toBe(true);
    expect(sub.isExpired()).toBe(false);
  });

  it('shouldValidateExpiredSubscription — isExpired() is true when status is EXPIRED', () => {
    const sub = new Subscription('id', 'u', 'p', PAST, FUTURE, SubscriptionStatus.EXPIRED, PAST);
    expect(sub.isExpired()).toBe(true);
    expect(sub.isActive()).toBe(false);
  });

  it('shouldValidateExpiredSubscription — isExpired() is true when endDate has passed even if status=ACTIVE', () => {
    const sub = buildExpiredSub(); // endDate=PAST, status=ACTIVE
    expect(sub.isExpired()).toBe(true);
    expect(sub.isActive()).toBe(false);
  });

  it('isActive() requires BOTH status=ACTIVE AND endDate in future', () => {
    const expiredByDate = buildExpiredSub();
    expect(expiredByDate.isActive()).toBe(false);

    const expiredByStatus = new Subscription('id', 'u', 'p', PAST, FUTURE, SubscriptionStatus.EXPIRED, PAST);
    expect(expiredByStatus.isActive()).toBe(false);
  });
});

// ── ExpireSubscriptionUseCase ─────────────────────────────────────────────────

describe('ExpireSubscriptionUseCase', () => {
  it('shouldBlockExpiredSubscription — calls updateStatus(EXPIRED) when endDate has passed', async () => {
    const expiredSub = buildExpiredSub();
    const repo = buildSubRepo({ findById: vi.fn().mockResolvedValue(expiredSub) });

    await new ExpireSubscriptionUseCase(repo).execute('sub-2');

    expect(repo.updateStatus).toHaveBeenCalledWith('sub-2', SubscriptionStatus.EXPIRED);
  });

  it('does NOT call updateStatus when subscription is still active', async () => {
    const activeSub = buildActiveSub();
    const repo = buildSubRepo({ findById: vi.fn().mockResolvedValue(activeSub) });

    await new ExpireSubscriptionUseCase(repo).execute('sub-1');

    expect(repo.updateStatus).not.toHaveBeenCalled();
  });

  it('throws SubscriptionNotFoundError when subscription does not exist', async () => {
    const repo = buildSubRepo({ findById: vi.fn().mockResolvedValue(null) });

    await expect(new ExpireSubscriptionUseCase(repo).execute('ghost')).rejects.toBeInstanceOf(
      SubscriptionNotFoundError,
    );
  });
});

// ── CreateSubscriptionUseCase ─────────────────────────────────────────────────

describe('CreateSubscriptionUseCase', () => {
  const validInput = {
    userId: 'user-1',
    planId: 'plan-1',
    startDate: new Date(),
    endDate: FUTURE,
  };

  it('shouldPreventMultipleActiveSubscriptions — throws when user already has an active subscription', async () => {
    const activeSub = buildActiveSub();
    const subRepo = buildSubRepo({
      findActiveByUserId: vi.fn().mockResolvedValue(activeSub), // already has one
    });

    const useCase = new CreateSubscriptionUseCase(
      subRepo,
      buildPlanRepo(),
      buildUserRepo(),
      buildMockGenerateInvoice(),
    );

    await expect(useCase.execute(validInput)).rejects.toBeInstanceOf(ActiveSubscriptionExistsError);
    expect(subRepo.create).not.toHaveBeenCalled();
  });

  it('creates subscription and generates invoice when user has no active subscription', async () => {
    const subRepo = buildSubRepo({
      findActiveByUserId: vi.fn().mockResolvedValue(null), // no active subscription
    });
    const generateInvoice = buildMockGenerateInvoice();

    const useCase = new CreateSubscriptionUseCase(
      subRepo,
      buildPlanRepo(),
      buildUserRepo(),
      generateInvoice,
    );

    await useCase.execute(validInput);

    expect(subRepo.create).toHaveBeenCalled();
    expect(generateInvoice.execute).toHaveBeenCalled();
  });
});
