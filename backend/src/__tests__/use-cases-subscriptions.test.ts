// Subscription use-case unit tests (6 use cases)
// No Prisma, no DB — mock-only.

import { describe, it, expect, vi } from 'vitest';
import { CreateSubscriptionUseCase }    from '../application/use-cases/subscriptions/CreateSubscriptionUseCase';
import { GetUserSubscriptionUseCase }   from '../application/use-cases/subscriptions/GetUserSubscriptionUseCase';
import { GetAllSubscriptionsUseCase }   from '../application/use-cases/subscriptions/GetAllSubscriptionsUseCase';
import { UpdateSubscriptionUseCase }    from '../application/use-cases/subscriptions/UpdateSubscriptionUseCase';
import { CancelSubscriptionUseCase }    from '../application/use-cases/subscriptions/CancelSubscriptionUseCase';
import { GenerateInvoiceUseCase }       from '../application/use-cases/invoices/GenerateInvoiceUseCase';
import { User }          from '../domain/entities/User';
import { Plan }          from '../domain/entities/Plan';
import { Subscription }  from '../domain/entities/Subscription';
import { Invoice }       from '../domain/entities/Invoice';
import { UserRole, PlanName, SubscriptionStatus, InvoiceStatus } from '../domain/enums';
import type { ISubscriptionRepository } from '../domain/repositories/ISubscriptionRepository';
import type { IPlanRepository }         from '../domain/repositories/IPlanRepository';
import type { IUserRepository }         from '../domain/repositories/IUserRepository';
import type { IInvoiceRepository }      from '../domain/repositories/IInvoiceRepository';
import { UserNotFoundError }                from '../domain/errors/UserErrors';
import { PlanNotFoundError }                from '../domain/errors/PlanErrors';
import { ActiveSubscriptionExistsError, SubscriptionNotFoundError } from '../domain/errors/SubscriptionErrors';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const FUTURE = new Date(Date.now() + 86_400_000 * 30);
const PAST   = new Date('2020-01-01');

const mkUser   = () => new User('u-1', 'Alice', 'alice@ex.com', 'h', UserRole.CLIENT, new Date());
const mkPlan   = (name = PlanName.SILVER, price = 100) => new Plan(`p-${name}`, name, price, `${name} desc`, new Date());
const mkSub    = (status = SubscriptionStatus.ACTIVE) =>
  new Subscription('s-1', 'u-1', `p-${PlanName.SILVER}`, new Date(), FUTURE, status, new Date());
const mkInvoice = () => new Invoice('i-1', 's-1', 105, InvoiceStatus.PENDING, FUTURE, new Date());

const buildSubRepo  = (p: Partial<ISubscriptionRepository> = {}): ISubscriptionRepository =>
  ({
    findById:              vi.fn().mockResolvedValue(null),
    findByUserId:          vi.fn().mockResolvedValue([]),
    findActiveByUserId:    vi.fn().mockResolvedValue(null),
    findAll:               vi.fn().mockResolvedValue([]),
    create:                vi.fn().mockResolvedValue(mkSub()),
    update:                vi.fn().mockResolvedValue(mkSub()),
    updateStatus:          vi.fn().mockResolvedValue(mkSub(SubscriptionStatus.EXPIRED)),
    existsActiveByPlanId:  vi.fn().mockResolvedValue(false),
    ...p,
  }) as unknown as ISubscriptionRepository;

const buildPlanRepo = (p: Partial<IPlanRepository> = {}): IPlanRepository =>
  ({
    findById:   vi.fn().mockResolvedValue(mkPlan()),
    findByName: vi.fn().mockResolvedValue(null),
    findAll:    vi.fn().mockResolvedValue([mkPlan(PlanName.BRONZE, 9.99), mkPlan(PlanName.SILVER, 19.99), mkPlan(PlanName.GOLD, 39.99)]),
    create:     vi.fn(),
    update:     vi.fn(),
    delete:     vi.fn(),
    ...p,
  }) as unknown as IPlanRepository;

const buildUserRepo = (p: Partial<IUserRepository> = {}): IUserRepository =>
  ({
    findById:    vi.fn().mockResolvedValue(mkUser()),
    findByEmail: vi.fn().mockResolvedValue(null),
    findAll:     vi.fn().mockResolvedValue([mkUser()]),
    create:      vi.fn(),
    update:      vi.fn(),
    ...p,
  }) as unknown as IUserRepository;

const buildInvoiceRepo = (p: Partial<IInvoiceRepository> = {}): IInvoiceRepository =>
  ({
    findById:              vi.fn().mockResolvedValue(null),
    findBySubscriptionId:  vi.fn().mockResolvedValue([]),
    findByUserId:          vi.fn().mockResolvedValue([]),
    findAll:               vi.fn().mockResolvedValue([]),
    create:                vi.fn().mockResolvedValue(mkInvoice()),
    updateStatus:          vi.fn(),
    ...p,
  }) as unknown as IInvoiceRepository;

const buildGenerateInvoice = (): GenerateInvoiceUseCase =>
  ({ execute: vi.fn().mockResolvedValue({ id: 'i-1', amount: 105, status: 'PENDING' }) }) as unknown as GenerateInvoiceUseCase;

// ── CreateSubscriptionUseCase ─────────────────────────────────────────────────

describe('CreateSubscriptionUseCase', () => {
  const dto = { userId: 'u-1', planId: `p-${PlanName.SILVER}`, startDate: new Date(), endDate: FUTURE };

  it('happy path — creates subscription and triggers invoice generation', async () => {
    const subRepo  = buildSubRepo({ findActiveByUserId: vi.fn().mockResolvedValue(null) });
    const genInv   = buildGenerateInvoice();
    const uc = new CreateSubscriptionUseCase(subRepo, buildPlanRepo(), buildUserRepo(), genInv);

    const result = await uc.execute(dto);

    expect(subRepo.create).toHaveBeenCalled();
    expect(genInv.execute).toHaveBeenCalled();
    expect(result.userId).toBe('u-1');
  });

  it('user not found — throws UserNotFoundError', async () => {
    const userRepo = buildUserRepo({ findById: vi.fn().mockResolvedValue(null) });
    const uc = new CreateSubscriptionUseCase(buildSubRepo(), buildPlanRepo(), userRepo, buildGenerateInvoice());

    await expect(uc.execute(dto)).rejects.toBeInstanceOf(UserNotFoundError);
  });

  it('plan not found — throws PlanNotFoundError', async () => {
    const planRepo = buildPlanRepo({ findById: vi.fn().mockResolvedValue(null) });
    const uc = new CreateSubscriptionUseCase(buildSubRepo(), planRepo, buildUserRepo(), buildGenerateInvoice());

    await expect(uc.execute(dto)).rejects.toBeInstanceOf(PlanNotFoundError);
  });

  it('already active — throws ActiveSubscriptionExistsError', async () => {
    const subRepo = buildSubRepo({ findActiveByUserId: vi.fn().mockResolvedValue(mkSub()) });
    const genInv  = buildGenerateInvoice();
    const uc = new CreateSubscriptionUseCase(subRepo, buildPlanRepo(), buildUserRepo(), genInv);

    await expect(uc.execute(dto)).rejects.toBeInstanceOf(ActiveSubscriptionExistsError);
    expect(subRepo.create).not.toHaveBeenCalled();
    expect(genInv.execute).not.toHaveBeenCalled();
  });
});

// ── GetUserSubscriptionUseCase ────────────────────────────────────────────────

describe('GetUserSubscriptionUseCase', () => {
  it('has active subscription with plan — returns DTO with plan', async () => {
    const sub  = mkSub();
    const plan = mkPlan(PlanName.SILVER, 19.99);
    const subRepo  = buildSubRepo({ findActiveByUserId: vi.fn().mockResolvedValue(sub) });
    const planRepo = buildPlanRepo({ findById: vi.fn().mockResolvedValue(plan) });
    const uc = new GetUserSubscriptionUseCase(subRepo, planRepo);

    const result = await uc.execute('u-1');

    expect(result).not.toBeNull();
    expect(result?.userId).toBe('u-1');
    expect(result?.plan?.name).toBe(PlanName.SILVER);
  });

  it('has active subscription but plan not found — returns DTO without plan', async () => {
    const sub      = mkSub();
    const subRepo  = buildSubRepo({ findActiveByUserId: vi.fn().mockResolvedValue(sub) });
    const planRepo = buildPlanRepo({ findById: vi.fn().mockResolvedValue(null) });
    const uc = new GetUserSubscriptionUseCase(subRepo, planRepo);

    const result = await uc.execute('u-1');

    expect(result).not.toBeNull();
    expect(result?.plan).toBeUndefined();
  });

  it('no active subscription — returns null', async () => {
    const subRepo  = buildSubRepo({ findActiveByUserId: vi.fn().mockResolvedValue(null) });
    const uc = new GetUserSubscriptionUseCase(subRepo, buildPlanRepo());

    const result = await uc.execute('u-1');
    expect(result).toBeNull();
  });
});

// ── GetAllSubscriptionsUseCase ────────────────────────────────────────────────

describe('GetAllSubscriptionsUseCase', () => {
  it('happy path — returns all subscriptions with plan data', async () => {
    const sub      = mkSub();
    const plan     = mkPlan(PlanName.SILVER, 19.99);
    const subRepo  = buildSubRepo({ findAll: vi.fn().mockResolvedValue([sub]) });
    const planRepo = buildPlanRepo({ findAll: vi.fn().mockResolvedValue([plan]) });
    const uc = new GetAllSubscriptionsUseCase(subRepo, planRepo);

    const result = await uc.execute();

    expect(result).toHaveLength(1);
  });

  it('empty platform — returns empty array', async () => {
    const subRepo  = buildSubRepo({ findAll: vi.fn().mockResolvedValue([]) });
    const planRepo = buildPlanRepo({ findAll: vi.fn().mockResolvedValue([]) });
    const result = await new GetAllSubscriptionsUseCase(subRepo, planRepo).execute();
    expect(result).toHaveLength(0);
  });

  it('subscription with no matching plan — still returns subscription', async () => {
    const sub      = mkSub();
    // Plan list doesn't contain the subscription's planId
    const subRepo  = buildSubRepo({ findAll: vi.fn().mockResolvedValue([sub]) });
    const planRepo = buildPlanRepo({ findAll: vi.fn().mockResolvedValue([]) });
    const result = await new GetAllSubscriptionsUseCase(subRepo, planRepo).execute();
    expect(result).toHaveLength(1);
    expect(result[0]?.plan).toBeUndefined();
  });
});

// ── UpdateSubscriptionUseCase ─────────────────────────────────────────────────

describe('UpdateSubscriptionUseCase', () => {
  it('happy path — updates planId and dates', async () => {
    const sub      = mkSub();
    const newPlan  = mkPlan(PlanName.GOLD, 39.99);
    const subRepo  = buildSubRepo({
      findById: vi.fn().mockResolvedValue(sub),
      update:   vi.fn().mockResolvedValue(mkSub()),
    });
    const planRepo = buildPlanRepo({ findById: vi.fn().mockResolvedValue(newPlan) });
    const uc = new UpdateSubscriptionUseCase(subRepo, planRepo);

    const result = await uc.execute('s-1', {
      planId:    `p-${PlanName.GOLD}`,
      startDate: new Date(),
      endDate:   FUTURE,
    });

    expect(subRepo.update).toHaveBeenCalled();
    expect(result).toBeDefined();
  });

  it('subscription not found — throws SubscriptionNotFoundError', async () => {
    const subRepo = buildSubRepo({ findById: vi.fn().mockResolvedValue(null) });
    const uc = new UpdateSubscriptionUseCase(subRepo, buildPlanRepo());

    await expect(uc.execute('ghost', { endDate: FUTURE })).rejects.toBeInstanceOf(SubscriptionNotFoundError);
  });

  it('new plan not found — throws PlanNotFoundError', async () => {
    const subRepo  = buildSubRepo({ findById: vi.fn().mockResolvedValue(mkSub()) });
    const planRepo = buildPlanRepo({ findById: vi.fn().mockResolvedValue(null) });
    const uc = new UpdateSubscriptionUseCase(subRepo, planRepo);

    await expect(uc.execute('s-1', { planId: 'ghost-plan' })).rejects.toBeInstanceOf(PlanNotFoundError);
  });

  it('only dates — skips plan validation when planId is not provided', async () => {
    const sub      = mkSub();
    const subRepo  = buildSubRepo({
      findById: vi.fn().mockResolvedValue(sub),
      update:   vi.fn().mockResolvedValue(sub),
    });
    const planRepo = buildPlanRepo({ findById: vi.fn().mockResolvedValue(mkPlan()) });
    const uc = new UpdateSubscriptionUseCase(subRepo, planRepo);

    await uc.execute('s-1', { endDate: FUTURE });

    // planId not given → should still call update once for the final plan fetch
    expect(subRepo.update).toHaveBeenCalled();
  });
});

// ── CancelSubscriptionUseCase ─────────────────────────────────────────────────

describe('CancelSubscriptionUseCase', () => {
  it('happy path — ACTIVE subscription is set to EXPIRED', async () => {
    const active  = mkSub(SubscriptionStatus.ACTIVE);
    const subRepo = buildSubRepo({ findById: vi.fn().mockResolvedValue(active) });
    const uc = new CancelSubscriptionUseCase(subRepo);

    await uc.execute('s-1');

    expect(subRepo.updateStatus).toHaveBeenCalledWith('s-1', SubscriptionStatus.EXPIRED);
  });

  it('already EXPIRED — idempotent, no updateStatus called', async () => {
    const expired = mkSub(SubscriptionStatus.EXPIRED);
    const subRepo = buildSubRepo({ findById: vi.fn().mockResolvedValue(expired) });
    const uc = new CancelSubscriptionUseCase(subRepo);

    await uc.execute('s-1');

    expect(subRepo.updateStatus).not.toHaveBeenCalled();
  });

  it('not found — throws SubscriptionNotFoundError', async () => {
    const subRepo = buildSubRepo({ findById: vi.fn().mockResolvedValue(null) });
    const uc = new CancelSubscriptionUseCase(subRepo);

    await expect(uc.execute('ghost')).rejects.toBeInstanceOf(SubscriptionNotFoundError);
  });
});
