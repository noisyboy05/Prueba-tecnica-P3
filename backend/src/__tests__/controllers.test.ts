// Controller unit tests — fake req/res/next, no Express server needed.
// Controllers are thin: parse → use case → respond.
// Tests verify: correct status codes, correct JSON envelopes, error forwarding.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

import { AuthController }           from '../interfaces/http/controllers/AuthController';
import { PlansController }          from '../interfaces/http/controllers/PlansController';
import { SubscriptionsController }  from '../interfaces/http/controllers/SubscriptionsController';
import { InvoicesController }       from '../interfaces/http/controllers/InvoicesController';
import { DashboardController }      from '../interfaces/http/controllers/DashboardController';
import { PlanName, InvoiceStatus }  from '../domain/enums';
import { ZodError }                 from 'zod';
import { PlanNotFoundError }        from '../domain/errors/PlanErrors';
import { UnauthorizedError }        from '../domain/errors/AuthErrors';

// ── HTTP mock helpers ─────────────────────────────────────────────────────────

const makeReq = (
  body: unknown = {},
  params: Record<string, string> = {},
  user?: { id: string; role: string },
): Request => ({ body, params, user, headers: {} }) as unknown as Request;

const makeRes = (): { res: Response; status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> } => {
  const json   = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  const res    = { status, json } as unknown as Response;
  return { res, status, json };
};

const makeNext = (): NextFunction => vi.fn() as unknown as NextFunction;

// ── AuthController ────────────────────────────────────────────────────────────

describe('AuthController', () => {
  const mockLogin    = { execute: vi.fn() };
  const mockRegister = { execute: vi.fn() };
  const ctrl = new AuthController(mockLogin as never, mockRegister as never);

  beforeEach(() => { vi.clearAllMocks(); });

  it('login: 200 with token on success', async () => {
    mockLogin.execute.mockResolvedValue({ token: 'jwt', user: { id: 'u', name: 'A', email: 'a@b.com', role: 'ADMIN' } });
    const { res, status, json } = makeRes();
    const next = makeNext();

    await ctrl.login(makeReq({ email: 'a@b.com', password: 'pass123' }), res, next);

    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    expect(next).not.toHaveBeenCalled();
  });

  it('login: Zod validation failure calls next(error)', async () => {
    const { res }  = makeRes();
    const next     = makeNext();

    await ctrl.login(makeReq({ email: 'not-email', password: '' }), res, next);

    expect(next).toHaveBeenCalledWith(expect.any(ZodError));
  });

  it('login: use case error calls next(error)', async () => {
    mockLogin.execute.mockRejectedValue(new PlanNotFoundError('x'));
    const { res } = makeRes();
    const next    = makeNext();

    await ctrl.login(makeReq({ email: 'a@b.com', password: 'pass' }), res, next);

    expect(next).toHaveBeenCalledWith(expect.any(PlanNotFoundError));
  });

  it('register: 201 with user', async () => {
    mockRegister.execute.mockResolvedValue({ token: 'jwt', user: { id: 'u2', name: 'B', email: 'b@b.com', role: 'CLIENT' } });
    const { res, status, json } = makeRes();
    const next = makeNext();

    await ctrl.register(makeReq({ name: 'Bob', email: 'b@b.com', password: 'secure123' }), res, next);

    expect(status).toHaveBeenCalledWith(201);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('register: Zod error calls next', async () => {
    const { res } = makeRes();
    const next    = makeNext();

    await ctrl.register(makeReq({ name: 'X', email: 'bad', password: '123' }), res, next);

    expect(next).toHaveBeenCalledWith(expect.any(ZodError));
  });
});

// ── PlansController ───────────────────────────────────────────────────────────

describe('PlansController', () => {
  const mockCreate   = { execute: vi.fn() };
  const mockUpdate   = { execute: vi.fn() };
  const mockDelete   = { execute: vi.fn() };
  const mockGetAll   = { execute: vi.fn() };
  const mockGetById  = { execute: vi.fn() };

  const ctrl = new PlansController(
    mockCreate as never, mockUpdate as never, mockDelete as never,
    mockGetAll as never, mockGetById as never,
  );

  beforeEach(() => vi.clearAllMocks());

  const samplePlan = { id: 'p-1', name: 'GOLD', price: 39.99, description: 'Full', createdAt: new Date().toISOString() };

  it('getAll: 200 with plans array', async () => {
    mockGetAll.execute.mockResolvedValue([samplePlan]);
    const { res, status } = makeRes();
    const next = makeNext();

    await ctrl.getAll(makeReq(), res, next);

    expect(status).toHaveBeenCalledWith(200);
    expect(next).not.toHaveBeenCalled();
  });

  it('getById: 200 with plan', async () => {
    mockGetById.execute.mockResolvedValue(samplePlan);
    const { res, status } = makeRes();

    await ctrl.getById(makeReq({}, { id: 'p-1' }), res, makeNext());

    expect(status).toHaveBeenCalledWith(200);
  });

  it('getById: use case error calls next', async () => {
    mockGetById.execute.mockRejectedValue(new PlanNotFoundError('ghost'));
    const { res } = makeRes();
    const next    = makeNext();

    await ctrl.getById(makeReq({}, { id: 'ghost' }), res, next);

    expect(next).toHaveBeenCalledWith(expect.any(PlanNotFoundError));
  });

  it('create: 201 with new plan', async () => {
    mockCreate.execute.mockResolvedValue(samplePlan);
    const { res, status } = makeRes();

    await ctrl.create(
      makeReq({ name: 'GOLD', price: 39.99, description: 'Premium plan' }),
      res, makeNext(),
    );

    expect(status).toHaveBeenCalledWith(201);
  });

  it('create: invalid body calls next(ZodError)', async () => {
    const { res } = makeRes();
    const next    = makeNext();

    await ctrl.create(makeReq({ name: 'INVALID', price: -5, description: '' }), res, next);

    expect(next).toHaveBeenCalledWith(expect.any(ZodError));
  });

  it('update: 200 with updated plan', async () => {
    mockUpdate.execute.mockResolvedValue({ ...samplePlan, price: 44.99 });
    const { res, status } = makeRes();

    await ctrl.update(makeReq({ price: 44.99 }, { id: 'p-1' }), res, makeNext());

    expect(status).toHaveBeenCalledWith(200);
  });

  it('remove: 200 with success message', async () => {
    mockDelete.execute.mockResolvedValue(undefined);
    const { res, status } = makeRes();

    await ctrl.remove(makeReq({}, { id: 'p-1' }), res, makeNext());

    expect(status).toHaveBeenCalledWith(200);
  });
});

// ── SubscriptionsController ───────────────────────────────────────────────────

describe('SubscriptionsController', () => {
  const mockCreate      = { execute: vi.fn() };
  const mockGetMine     = { execute: vi.fn() };
  const mockGetAll      = { execute: vi.fn() };
  const mockUpdate      = { execute: vi.fn() };
  const mockCancel      = { execute: vi.fn() };

  const ctrl = new SubscriptionsController(
    mockCreate as never, mockGetMine as never, mockGetAll as never,
    mockUpdate as never, mockCancel as never,
  );

  beforeEach(() => vi.clearAllMocks());

  const sampleSub = {
    id: 's-1', userId: 'u-1', planId: 'p-1',
    startDate: new Date().toISOString(), endDate: new Date().toISOString(),
    status: 'ACTIVE', createdAt: new Date().toISOString(),
  };

  it('create: 201', async () => {
    mockCreate.execute.mockResolvedValue(sampleSub);
    const { res, status } = makeRes();

    await ctrl.create(
      makeReq({
        userId: '00000000-0000-0000-0000-000000000001',
        planId: '00000000-0000-0000-0000-000000000002',
        startDate: new Date().toISOString(),
        endDate:   new Date(Date.now() + 86_400_000 * 30).toISOString(),
      }),
      res, makeNext(),
    );

    expect(status).toHaveBeenCalledWith(201);
  });

  it('getAll: 200', async () => {
    mockGetAll.execute.mockResolvedValue([sampleSub]);
    const { res, status } = makeRes();
    await ctrl.getAll(makeReq(), res, makeNext());
    expect(status).toHaveBeenCalledWith(200);
  });

  it('getMySubscription: 200', async () => {
    mockGetMine.execute.mockResolvedValue(sampleSub);
    const { res, status } = makeRes();
    await ctrl.getMySubscription(makeReq({}, {}, { id: 'u-1', role: 'CLIENT' }), res, makeNext());
    expect(status).toHaveBeenCalledWith(200);
  });

  it('getMySubscription: no user → calls next(UnauthorizedError)', async () => {
    const { res } = makeRes();
    const next    = makeNext();
    await ctrl.getMySubscription(makeReq({}, {}, undefined), res, next);
    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });

  it('update: 200', async () => {
    mockUpdate.execute.mockResolvedValue(sampleSub);
    const { res, status } = makeRes();
    await ctrl.update(
      makeReq({ endDate: new Date(Date.now() + 86_400_000 * 60).toISOString() }, { id: 's-1' }),
      res, makeNext(),
    );
    expect(status).toHaveBeenCalledWith(200);
  });

  it('cancel: 200', async () => {
    mockCancel.execute.mockResolvedValue(undefined);
    const { res, status } = makeRes();
    await ctrl.cancel(makeReq({}, { id: 's-1' }), res, makeNext());
    expect(status).toHaveBeenCalledWith(200);
  });
});

// ── InvoicesController ────────────────────────────────────────────────────────

describe('InvoicesController', () => {
  const mockGetMine    = { execute: vi.fn() };
  const mockGetAll     = { execute: vi.fn() };
  const mockPay        = { execute: vi.fn() };
  const mockAdminUp    = { execute: vi.fn() };

  const ctrl = new InvoicesController(
    mockGetMine as never, mockGetAll as never, mockPay as never, mockAdminUp as never,
  );

  beforeEach(() => vi.clearAllMocks());

  const sampleInv = { id: 'i-1', subscriptionId: 's-1', amount: 105, status: 'PENDING', dueDate: new Date().toISOString(), createdAt: new Date().toISOString() };

  it('getAll: 200', async () => {
    mockGetAll.execute.mockResolvedValue([sampleInv]);
    const { res, status } = makeRes();
    await ctrl.getAll(makeReq(), res, makeNext());
    expect(status).toHaveBeenCalledWith(200);
  });

  it('getMine: 200', async () => {
    mockGetMine.execute.mockResolvedValue([sampleInv]);
    const { res, status } = makeRes();
    await ctrl.getMine(makeReq({}, {}, { id: 'u-1', role: 'CLIENT' }), res, makeNext());
    expect(status).toHaveBeenCalledWith(200);
  });

  it('getMine: no user → next(UnauthorizedError)', async () => {
    const { res } = makeRes();
    const next = makeNext();
    await ctrl.getMine(makeReq(), res, next);
    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });

  it('pay: 200', async () => {
    mockPay.execute.mockResolvedValue({ ...sampleInv, status: 'PAID' });
    const { res, status } = makeRes();
    await ctrl.pay(makeReq({}, { id: 'i-1' }, { id: 'u-1', role: 'CLIENT' }), res, makeNext());
    expect(status).toHaveBeenCalledWith(200);
  });

  it('pay: no user → next(UnauthorizedError)', async () => {
    const { res } = makeRes();
    const next = makeNext();
    await ctrl.pay(makeReq({}, { id: 'i-1' }), res, next);
    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });

  it('adminUpdateStatus: 200', async () => {
    mockAdminUp.execute.mockResolvedValue({ ...sampleInv, status: 'PAID' });
    const { res, status } = makeRes();
    await ctrl.adminUpdateStatus(makeReq({ status: 'PAID' }, { id: 'i-1' }), res, makeNext());
    expect(status).toHaveBeenCalledWith(200);
  });

  it('adminUpdateStatus: invalid status → next(ZodError)', async () => {
    const { res } = makeRes();
    const next = makeNext();
    await ctrl.adminUpdateStatus(makeReq({ status: 'CANCELLED' }, { id: 'i-1' }), res, next);
    expect(next).toHaveBeenCalledWith(expect.any(ZodError));
  });
});

// ── DashboardController ───────────────────────────────────────────────────────

describe('DashboardController', () => {
  const mockMetrics = { execute: vi.fn() };
  const ctrl = new DashboardController(mockMetrics as never);

  beforeEach(() => vi.clearAllMocks());

  it('getMetrics: 200 with metrics object', async () => {
    const metrics = { totalUsers: 2, totalPlans: 3, activeSubscriptions: 1, expiredSubscriptions: 0, totalInvoices: 5, pendingInvoices: 2, paidInvoices: 3, overdueInvoices: 0, totalRevenue: 315 };
    mockMetrics.execute.mockResolvedValue(metrics);
    const { res, status, json } = makeRes();

    await ctrl.getMetrics(makeReq(), res, makeNext());

    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: metrics }));
  });

  it('getMetrics: use case error calls next', async () => {
    mockMetrics.execute.mockRejectedValue(new Error('DB down'));
    const { res } = makeRes();
    const next    = makeNext();

    await ctrl.getMetrics(makeReq(), res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});
