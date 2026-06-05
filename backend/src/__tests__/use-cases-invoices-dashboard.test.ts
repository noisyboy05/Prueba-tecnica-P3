// Invoice + Dashboard use-case unit tests
// GenerateInvoiceUseCase, GetUserInvoicesUseCase, GetAllInvoicesUseCase,
// AdminUpdateInvoiceStatusUseCase, GetDashboardMetricsUseCase

import { describe, it, expect, vi } from 'vitest';
import { GenerateInvoiceUseCase }          from '../application/use-cases/invoices/GenerateInvoiceUseCase';
import { GetUserInvoicesUseCase }          from '../application/use-cases/invoices/GetUserInvoicesUseCase';
import { GetAllInvoicesUseCase }           from '../application/use-cases/invoices/GetAllInvoicesUseCase';
import { AdminUpdateInvoiceStatusUseCase } from '../application/use-cases/invoices/AdminUpdateInvoiceStatusUseCase';
import { GetDashboardMetricsUseCase }      from '../application/use-cases/dashboard/GetDashboardMetricsUseCase';
import { Plan }         from '../domain/entities/Plan';
import { Subscription } from '../domain/entities/Subscription';
import { Invoice }      from '../domain/entities/Invoice';
import { User }         from '../domain/entities/User';
import { PlanName, SubscriptionStatus, InvoiceStatus, UserRole } from '../domain/enums';
import type { ISubscriptionRepository } from '../domain/repositories/ISubscriptionRepository';
import type { IPlanRepository }         from '../domain/repositories/IPlanRepository';
import type { IInvoiceRepository }      from '../domain/repositories/IInvoiceRepository';
import type { IUserRepository }         from '../domain/repositories/IUserRepository';
import { SubscriptionNotFoundError }    from '../domain/errors/SubscriptionErrors';
import { PlanNotFoundError }            from '../domain/errors/PlanErrors';
import { InvoiceNotFoundError }         from '../domain/errors/InvoiceErrors';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const FUTURE = new Date(Date.now() + 86_400_000 * 30);
const PAST   = new Date('2020-01-01');

const mkUser    = () => new User('u-1', 'Alice', 'alice@ex.com', 'h', UserRole.CLIENT, new Date());
const mkPlan    = (name: PlanName, price: number) => new Plan(`p-${name}`, name, price, `${name} plan`, new Date());
const mkSub     = (planId = `p-${PlanName.SILVER}`, end = FUTURE) =>
  new Subscription('s-1', 'u-1', planId, new Date(), end, SubscriptionStatus.ACTIVE, new Date());
const mkInvoice = (status = InvoiceStatus.PENDING, amount = 105) =>
  new Invoice('i-1', 's-1', amount, status, FUTURE, new Date());

const buildSubRepo = (p: Partial<ISubscriptionRepository> = {}): ISubscriptionRepository =>
  ({
    findById:             vi.fn().mockResolvedValue(null),
    findByUserId:         vi.fn().mockResolvedValue([]),
    findActiveByUserId:   vi.fn().mockResolvedValue(null),
    findAll:              vi.fn().mockResolvedValue([]),
    create:               vi.fn(),
    update:               vi.fn(),
    updateStatus:         vi.fn(),
    existsActiveByPlanId: vi.fn().mockResolvedValue(false),
    ...p,
  }) as unknown as ISubscriptionRepository;

const buildPlanRepo = (p: Partial<IPlanRepository> = {}): IPlanRepository =>
  ({
    findById:   vi.fn().mockResolvedValue(null),
    findByName: vi.fn().mockResolvedValue(null),
    findAll:    vi.fn().mockResolvedValue([]),
    create:     vi.fn(),
    update:     vi.fn(),
    delete:     vi.fn(),
    ...p,
  }) as unknown as IPlanRepository;

const buildInvRepo = (p: Partial<IInvoiceRepository> = {}): IInvoiceRepository =>
  ({
    findById:             vi.fn().mockResolvedValue(null),
    findBySubscriptionId: vi.fn().mockResolvedValue([]),
    findByUserId:         vi.fn().mockResolvedValue([]),
    findAll:              vi.fn().mockResolvedValue([]),
    create:               vi.fn().mockResolvedValue(mkInvoice()),
    updateStatus:         vi.fn().mockResolvedValue(mkInvoice(InvoiceStatus.PAID)),
    ...p,
  }) as unknown as IInvoiceRepository;

const buildUserRepo = (p: Partial<IUserRepository> = {}): IUserRepository =>
  ({
    findById:    vi.fn().mockResolvedValue(mkUser()),
    findByEmail: vi.fn().mockResolvedValue(null),
    findAll:     vi.fn().mockResolvedValue([mkUser()]),
    create:      vi.fn(),
    update:      vi.fn(),
    ...p,
  }) as unknown as IUserRepository;

// ── GenerateInvoiceUseCase ────────────────────────────────────────────────────

describe('GenerateInvoiceUseCase', () => {
  it('BRONZE — amount equals plan.price exactly', async () => {
    const bronzePlan = mkPlan(PlanName.BRONZE, 100);
    const sub        = mkSub(`p-${PlanName.BRONZE}`);
    const subRepo    = buildSubRepo({ findById: vi.fn().mockResolvedValue(sub) });
    const planRepo   = buildPlanRepo({ findById: vi.fn().mockResolvedValue(bronzePlan) });
    const invRepo    = buildInvRepo({ create: vi.fn().mockResolvedValue(mkInvoice(InvoiceStatus.PENDING, 100)) });
    const uc = new GenerateInvoiceUseCase(subRepo, planRepo, invRepo);

    const result = await uc.execute('s-1');

    const createCall = (invRepo.create as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as Record<string, unknown>;
    expect(createCall?.['amount']).toBe(100);
  });

  it('SILVER — amount equals plan.price * 1.05', async () => {
    const silverPlan = mkPlan(PlanName.SILVER, 100);
    const sub        = mkSub(`p-${PlanName.SILVER}`);
    const subRepo    = buildSubRepo({ findById: vi.fn().mockResolvedValue(sub) });
    const planRepo   = buildPlanRepo({ findById: vi.fn().mockResolvedValue(silverPlan) });
    const invRepo    = buildInvRepo({ create: vi.fn().mockResolvedValue(mkInvoice(InvoiceStatus.PENDING, 105)) });
    const uc = new GenerateInvoiceUseCase(subRepo, planRepo, invRepo);

    await uc.execute('s-1');

    const createCall = (invRepo.create as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as Record<string, unknown>;
    expect((createCall?.['amount'] as number)).toBeCloseTo(105);
  });

  it('GOLD — amount equals plan.price * 1.10', async () => {
    const goldPlan = mkPlan(PlanName.GOLD, 100);
    const sub      = mkSub(`p-${PlanName.GOLD}`);
    const subRepo  = buildSubRepo({ findById: vi.fn().mockResolvedValue(sub) });
    const planRepo = buildPlanRepo({ findById: vi.fn().mockResolvedValue(goldPlan) });
    const invRepo  = buildInvRepo({ create: vi.fn().mockResolvedValue(mkInvoice(InvoiceStatus.PENDING, 110)) });
    const uc = new GenerateInvoiceUseCase(subRepo, planRepo, invRepo);

    await uc.execute('s-1');

    const createCall = (invRepo.create as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as Record<string, unknown>;
    expect((createCall?.['amount'] as number)).toBeCloseTo(110);
  });

  it('subscription not found — throws SubscriptionNotFoundError', async () => {
    const subRepo  = buildSubRepo({ findById: vi.fn().mockResolvedValue(null) });
    const uc = new GenerateInvoiceUseCase(subRepo, buildPlanRepo(), buildInvRepo());

    await expect(uc.execute('ghost')).rejects.toBeInstanceOf(SubscriptionNotFoundError);
  });

  it('plan not found — throws PlanNotFoundError', async () => {
    const sub      = mkSub();
    const subRepo  = buildSubRepo({ findById: vi.fn().mockResolvedValue(sub) });
    const planRepo = buildPlanRepo({ findById: vi.fn().mockResolvedValue(null) });
    const uc = new GenerateInvoiceUseCase(subRepo, planRepo, buildInvRepo());

    await expect(uc.execute('s-1')).rejects.toBeInstanceOf(PlanNotFoundError);
  });

  it('due date is set to subscription endDate', async () => {
    const customEnd   = new Date('2027-12-31');
    const silverPlan  = mkPlan(PlanName.SILVER, 20);
    const sub         = mkSub(`p-${PlanName.SILVER}`, customEnd);
    const subRepo     = buildSubRepo({ findById: vi.fn().mockResolvedValue(sub) });
    const planRepo    = buildPlanRepo({ findById: vi.fn().mockResolvedValue(silverPlan) });
    const invRepo     = buildInvRepo({ create: vi.fn().mockResolvedValue(mkInvoice()) });
    const uc = new GenerateInvoiceUseCase(subRepo, planRepo, invRepo);

    await uc.execute('s-1');

    const createCall = (invRepo.create as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as Record<string, unknown>;
    expect((createCall?.['dueDate'] as Date).toISOString()).toBe(customEnd.toISOString());
  });
});

// ── GetUserInvoicesUseCase ────────────────────────────────────────────────────

describe('GetUserInvoicesUseCase', () => {
  it('returns invoices for the user', async () => {
    const invRepo = buildInvRepo({ findByUserId: vi.fn().mockResolvedValue([mkInvoice()]) });
    const uc = new GetUserInvoicesUseCase(invRepo);

    const result = await uc.execute('u-1');

    expect(result).toHaveLength(1);
    expect(result[0]?.status).toBe(InvoiceStatus.PENDING);
    expect(invRepo.findByUserId).toHaveBeenCalledWith('u-1');
  });

  it('no invoices — returns empty array', async () => {
    const invRepo = buildInvRepo({ findByUserId: vi.fn().mockResolvedValue([]) });
    const result  = await new GetUserInvoicesUseCase(invRepo).execute('u-1');
    expect(result).toHaveLength(0);
  });
});

// ── GetAllInvoicesUseCase ─────────────────────────────────────────────────────

describe('GetAllInvoicesUseCase', () => {
  it('returns all invoices', async () => {
    const invoices = [mkInvoice(InvoiceStatus.PENDING, 105), mkInvoice(InvoiceStatus.PAID, 210)];
    const invRepo  = buildInvRepo({ findAll: vi.fn().mockResolvedValue(invoices) });
    const result   = await new GetAllInvoicesUseCase(invRepo).execute();
    expect(result).toHaveLength(2);
  });

  it('empty — returns empty array', async () => {
    const invRepo = buildInvRepo({ findAll: vi.fn().mockResolvedValue([]) });
    const result  = await new GetAllInvoicesUseCase(invRepo).execute();
    expect(result).toHaveLength(0);
  });
});

// ── AdminUpdateInvoiceStatusUseCase ───────────────────────────────────────────

describe('AdminUpdateInvoiceStatusUseCase', () => {
  it('PENDING → PAID', async () => {
    const pending = mkInvoice(InvoiceStatus.PENDING);
    const paid    = mkInvoice(InvoiceStatus.PAID);
    const invRepo = buildInvRepo({
      findById:     vi.fn().mockResolvedValue(pending),
      updateStatus: vi.fn().mockResolvedValue(paid),
    });
    const uc = new AdminUpdateInvoiceStatusUseCase(invRepo);

    const result = await uc.execute('i-1', InvoiceStatus.PAID);

    expect(invRepo.updateStatus).toHaveBeenCalledWith('i-1', InvoiceStatus.PAID);
    expect(result.status).toBe(InvoiceStatus.PAID);
  });

  it('PENDING → OVERDUE', async () => {
    const pending  = mkInvoice(InvoiceStatus.PENDING);
    const overdue  = mkInvoice(InvoiceStatus.OVERDUE);
    const invRepo  = buildInvRepo({
      findById:     vi.fn().mockResolvedValue(pending),
      updateStatus: vi.fn().mockResolvedValue(overdue),
    });
    const uc = new AdminUpdateInvoiceStatusUseCase(invRepo);

    await uc.execute('i-1', InvoiceStatus.OVERDUE);
    expect(invRepo.updateStatus).toHaveBeenCalledWith('i-1', InvoiceStatus.OVERDUE);
  });

  it('PAID → PENDING (restore)', async () => {
    const paid    = mkInvoice(InvoiceStatus.PAID);
    const pending = mkInvoice(InvoiceStatus.PENDING);
    const invRepo = buildInvRepo({
      findById:     vi.fn().mockResolvedValue(paid),
      updateStatus: vi.fn().mockResolvedValue(pending),
    });
    const uc = new AdminUpdateInvoiceStatusUseCase(invRepo);

    await uc.execute('i-1', InvoiceStatus.PENDING);
    expect(invRepo.updateStatus).toHaveBeenCalledWith('i-1', InvoiceStatus.PENDING);
  });

  it('not found — throws InvoiceNotFoundError', async () => {
    const invRepo = buildInvRepo({ findById: vi.fn().mockResolvedValue(null) });
    const uc = new AdminUpdateInvoiceStatusUseCase(invRepo);

    await expect(uc.execute('ghost', InvoiceStatus.PAID)).rejects.toBeInstanceOf(InvoiceNotFoundError);
    expect(invRepo.updateStatus).not.toHaveBeenCalled();
  });
});

// ── GetDashboardMetricsUseCase ────────────────────────────────────────────────

describe('GetDashboardMetricsUseCase', () => {
  const buildDashboardUC = (
    users: User[], plans: Plan[], subs: Subscription[], invoices: Invoice[],
  ) => new GetDashboardMetricsUseCase(
    buildUserRepo({ findAll: vi.fn().mockResolvedValue(users) }),
    buildPlanRepo({ findAll: vi.fn().mockResolvedValue(plans) }),
    buildSubRepo({  findAll: vi.fn().mockResolvedValue(subs) }),
    buildInvRepo({  findAll: vi.fn().mockResolvedValue(invoices) }),
  );

  it('happy path — returns correct aggregated metrics', async () => {
    const activeSub  = new Subscription('s-a', 'u-1', 'p-1', new Date(), FUTURE, SubscriptionStatus.ACTIVE, new Date());
    const expiredSub = new Subscription('s-e', 'u-1', 'p-1', PAST, PAST, SubscriptionStatus.EXPIRED, PAST);
    const paidInv    = mkInvoice(InvoiceStatus.PAID, 105);
    const pendingInv = mkInvoice(InvoiceStatus.PENDING, 210);
    const overdueInv = new Invoice('i-3', 's-1', 30, InvoiceStatus.OVERDUE, PAST, new Date());

    const uc = buildDashboardUC(
      [mkUser()],
      [mkPlan(PlanName.BRONZE, 9.99), mkPlan(PlanName.SILVER, 19.99), mkPlan(PlanName.GOLD, 39.99)],
      [activeSub, expiredSub],
      [paidInv, pendingInv, overdueInv],
    );

    const result = await uc.execute();

    expect(result.totalUsers).toBe(1);
    expect(result.totalPlans).toBe(3);
    expect(result.activeSubscriptions).toBe(1);
    expect(result.expiredSubscriptions).toBe(1); // expiredSub has status=EXPIRED → isExpired() true
    expect(result.totalInvoices).toBe(3);
    expect(result.paidInvoices).toBe(1);
    expect(result.pendingInvoices).toBe(1);
    expect(result.overdueInvoices).toBe(1);
    expect(result.totalRevenue).toBeCloseTo(105);
  });

  it('empty platform — all zeros', async () => {
    const uc = buildDashboardUC([], [], [], []);

    const result = await uc.execute();

    expect(result.totalUsers).toBe(0);
    expect(result.totalPlans).toBe(0);
    expect(result.activeSubscriptions).toBe(0);
    expect(result.expiredSubscriptions).toBe(0);
    expect(result.totalInvoices).toBe(0);
    expect(result.totalRevenue).toBe(0);
  });

  it('revenue — only PAID invoices count toward total', async () => {
    const paid1    = mkInvoice(InvoiceStatus.PAID, 100);
    const paid2    = mkInvoice(InvoiceStatus.PAID, 200);
    const pending  = mkInvoice(InvoiceStatus.PENDING, 999);
    const uc = buildDashboardUC([], [], [], [paid1, paid2, pending]);

    const result = await uc.execute();

    expect(result.totalRevenue).toBeCloseTo(300);
  });

  it('overdue count — excludes PAID invoices even if past dueDate', async () => {
    const paidOld = new Invoice('i-1', 's-1', 50, InvoiceStatus.PAID, PAST, PAST);
    const uc = buildDashboardUC([], [], [], [paidOld]);

    const result = await uc.execute();

    expect(result.overdueInvoices).toBe(0);
    expect(result.paidInvoices).toBe(1);
  });
});
