// Plan use-case unit tests: CreatePlan, UpdatePlan, DeletePlan, GetAllPlans, GetPlanById
// No Prisma, no DB — mock-only.

import { describe, it, expect, vi } from 'vitest';
import { CreatePlanUseCase }   from '../application/use-cases/plans/CreatePlanUseCase';
import { UpdatePlanUseCase }   from '../application/use-cases/plans/UpdatePlanUseCase';
import { DeletePlanUseCase }   from '../application/use-cases/plans/DeletePlanUseCase';
import { GetAllPlansUseCase }  from '../application/use-cases/plans/GetAllPlansUseCase';
import { GetPlanByIdUseCase }  from '../application/use-cases/plans/GetPlanByIdUseCase';
import { Plan }                from '../domain/entities/Plan';
import { PlanName }            from '../domain/enums';
import type { IPlanRepository }         from '../domain/repositories/IPlanRepository';
import type { ISubscriptionRepository } from '../domain/repositories/ISubscriptionRepository';
import {
  PlanAlreadyExistsError,
  PlanNotFoundError,
  PlanInUseError,
} from '../domain/errors/PlanErrors';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mkPlan = (name = PlanName.SILVER, price = 19.99): Plan =>
  new Plan(`plan-${name}`, name, price, `${name} plan description`, new Date());

const buildPlanRepo = (partial: Partial<IPlanRepository> = {}): IPlanRepository =>
  ({
    findById:   vi.fn().mockResolvedValue(null),
    findByName: vi.fn().mockResolvedValue(null),
    findAll:    vi.fn().mockResolvedValue([]),
    create:     vi.fn().mockResolvedValue(mkPlan()),
    update:     vi.fn().mockResolvedValue(mkPlan()),
    delete:     vi.fn().mockResolvedValue(undefined),
    ...partial,
  }) as unknown as IPlanRepository;

const buildSubRepo = (inUse = false): ISubscriptionRepository =>
  ({
    findById:            vi.fn().mockResolvedValue(null),
    findByUserId:        vi.fn().mockResolvedValue([]),
    findActiveByUserId:  vi.fn().mockResolvedValue(null),
    findAll:             vi.fn().mockResolvedValue([]),
    create:              vi.fn(),
    update:              vi.fn(),
    updateStatus:        vi.fn(),
    existsActiveByPlanId: vi.fn().mockResolvedValue(inUse),
  }) as unknown as ISubscriptionRepository;

// ── CreatePlanUseCase ─────────────────────────────────────────────────────────

describe('CreatePlanUseCase', () => {
  const dto = { name: PlanName.GOLD, price: 39.99, description: 'Premium plan' };

  it('happy path — creates and returns PlanResponseDto', async () => {
    const created = mkPlan(PlanName.GOLD, 39.99);
    const repo    = buildPlanRepo({
      findByName: vi.fn().mockResolvedValue(null),
      create:     vi.fn().mockResolvedValue(created),
    });
    const uc = new CreatePlanUseCase(repo);

    const result = await uc.execute(dto);

    expect(result.name).toBe(PlanName.GOLD);
    expect(result.price).toBe(39.99);
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: PlanName.GOLD, price: 39.99 }),
    );
  });

  it('already exists — throws PlanAlreadyExistsError', async () => {
    const repo = buildPlanRepo({ findByName: vi.fn().mockResolvedValue(mkPlan(PlanName.GOLD)) });
    const uc   = new CreatePlanUseCase(repo);

    await expect(uc.execute(dto)).rejects.toBeInstanceOf(PlanAlreadyExistsError);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('edge — BRONZE tier created correctly', async () => {
    const bronze = mkPlan(PlanName.BRONZE, 9.99);
    const repo   = buildPlanRepo({
      findByName: vi.fn().mockResolvedValue(null),
      create:     vi.fn().mockResolvedValue(bronze),
    });
    const uc = new CreatePlanUseCase(repo);

    const result = await uc.execute({ name: PlanName.BRONZE, price: 9.99, description: 'Basic' });
    expect(result.name).toBe(PlanName.BRONZE);
    expect(result.price).toBe(9.99);
  });
});

// ── UpdatePlanUseCase ─────────────────────────────────────────────────────────

describe('UpdatePlanUseCase', () => {
  it('happy path — updates price and description', async () => {
    const existing = mkPlan(PlanName.SILVER, 19.99);
    const updated  = mkPlan(PlanName.SILVER, 24.99);
    const repo = buildPlanRepo({
      findById: vi.fn().mockResolvedValue(existing),
      update:   vi.fn().mockResolvedValue(updated),
    });
    const uc = new UpdatePlanUseCase(repo);

    const result = await uc.execute('plan-SILVER', { price: 24.99, description: 'New desc' });

    expect(result.price).toBe(24.99);
    expect(repo.update).toHaveBeenCalledWith(
      'plan-SILVER',
      expect.objectContaining({ price: 24.99, description: 'New desc' }),
    );
  });

  it('only price — partial update without description', async () => {
    const existing = mkPlan(PlanName.SILVER, 19.99);
    const updated  = mkPlan(PlanName.SILVER, 29.99);
    const repo = buildPlanRepo({
      findById: vi.fn().mockResolvedValue(existing),
      update:   vi.fn().mockResolvedValue(updated),
    });
    const uc = new UpdatePlanUseCase(repo);

    await uc.execute('plan-SILVER', { price: 29.99 });

    const updateArg = (repo.update as ReturnType<typeof vi.fn>).mock.calls[0]?.[1] as Record<string, unknown>;
    expect(updateArg?.['description']).toBeUndefined();
  });

  it('not found — throws PlanNotFoundError', async () => {
    const repo = buildPlanRepo({ findById: vi.fn().mockResolvedValue(null) });
    const uc   = new UpdatePlanUseCase(repo);

    await expect(uc.execute('ghost', { price: 9 })).rejects.toBeInstanceOf(PlanNotFoundError);
    expect(repo.update).not.toHaveBeenCalled();
  });
});

// ── DeletePlanUseCase ─────────────────────────────────────────────────────────

describe('DeletePlanUseCase', () => {
  it('happy path — deletes plan not in use', async () => {
    const plan = mkPlan(PlanName.BRONZE, 9.99);
    const planRepo = buildPlanRepo({ findById: vi.fn().mockResolvedValue(plan) });
    const subRepo  = buildSubRepo(false);
    const uc = new DeletePlanUseCase(planRepo, subRepo);

    await uc.execute('plan-BRONZE');

    expect(planRepo.delete).toHaveBeenCalledWith('plan-BRONZE');
  });

  it('not found — throws PlanNotFoundError', async () => {
    const planRepo = buildPlanRepo({ findById: vi.fn().mockResolvedValue(null) });
    const uc       = new DeletePlanUseCase(planRepo, buildSubRepo(false));

    await expect(uc.execute('ghost')).rejects.toBeInstanceOf(PlanNotFoundError);
    expect(planRepo.delete).not.toHaveBeenCalled();
  });

  it('in use — throws PlanInUseError when active subscriptions exist', async () => {
    const plan    = mkPlan(PlanName.GOLD, 39.99);
    const planRepo = buildPlanRepo({ findById: vi.fn().mockResolvedValue(plan) });
    const subRepo  = buildSubRepo(true);
    const uc = new DeletePlanUseCase(planRepo, subRepo);

    await expect(uc.execute('plan-GOLD')).rejects.toBeInstanceOf(PlanInUseError);
    expect(planRepo.delete).not.toHaveBeenCalled();
  });
});

// ── GetAllPlansUseCase ────────────────────────────────────────────────────────

describe('GetAllPlansUseCase', () => {
  it('happy path — returns mapped array', async () => {
    const plans = [mkPlan(PlanName.BRONZE, 9.99), mkPlan(PlanName.SILVER, 19.99), mkPlan(PlanName.GOLD, 39.99)];
    const repo  = buildPlanRepo({ findAll: vi.fn().mockResolvedValue(plans) });
    const uc    = new GetAllPlansUseCase(repo);

    const result = await uc.execute();

    expect(result).toHaveLength(3);
    expect(result[0]?.name).toBe(PlanName.BRONZE);
    expect(result[2]?.name).toBe(PlanName.GOLD);
  });

  it('empty — returns empty array', async () => {
    const repo   = buildPlanRepo({ findAll: vi.fn().mockResolvedValue([]) });
    const result = await new GetAllPlansUseCase(repo).execute();
    expect(result).toHaveLength(0);
  });
});

// ── GetPlanByIdUseCase ────────────────────────────────────────────────────────

describe('GetPlanByIdUseCase', () => {
  it('happy path — found returns PlanResponseDto', async () => {
    const plan = mkPlan(PlanName.GOLD, 39.99);
    const repo = buildPlanRepo({ findById: vi.fn().mockResolvedValue(plan) });
    const uc   = new GetPlanByIdUseCase(repo);

    const result = await uc.execute('plan-GOLD');

    expect(result.name).toBe(PlanName.GOLD);
    expect(result.price).toBe(39.99);
    expect(result.id).toBe('plan-GOLD');
  });

  it('not found — throws PlanNotFoundError', async () => {
    const repo = buildPlanRepo({ findById: vi.fn().mockResolvedValue(null) });
    const uc   = new GetPlanByIdUseCase(repo);

    await expect(uc.execute('ghost')).rejects.toBeInstanceOf(PlanNotFoundError);
  });
});
