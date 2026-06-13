// Middleware and route unit tests
// All use fake req/res/next — no real Express server, no real DB.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

import { globalErrorHandler }       from '../interfaces/http/middlewares/errorHandler.middleware';
import { authorizeRole }            from '../interfaces/http/middlewares/authorizeRole.middleware';
import { requestLogger }            from '../interfaces/http/middlewares/requestLogger.middleware';
import { authenticateJWT }          from '../interfaces/http/middlewares/authenticateJWT.middleware';
import { checkSubscriptionStatus }  from '../interfaces/http/middlewares/checkSubscriptionStatus.middleware';

// Routes
import { createAuthRouter }          from '../interfaces/http/routes/auth.routes';
import { createPlansRouter }         from '../interfaces/http/routes/plans.routes';
import { createSubscriptionsRouter } from '../interfaces/http/routes/subscriptions.routes';
import { createInvoicesRouter }      from '../interfaces/http/routes/invoices.routes';
import { createDashboardRouter }     from '../interfaces/http/routes/dashboard.routes';

import { UserRole, SubscriptionStatus }  from '../domain/enums';
import { DomainError }                   from '../domain/errors/DomainError';
import { PlanNotFoundError }             from '../domain/errors/PlanErrors';
import { ForbiddenError, InvalidTokenError, UnauthorizedError } from '../domain/errors/AuthErrors';
import { Subscription } from '../domain/entities/Subscription';
import type { ISubscriptionRepository } from '../domain/repositories/ISubscriptionRepository';
import type { ExpireSubscriptionUseCase } from '../application/use-cases/subscriptions/ExpireSubscriptionUseCase';
import type { ITokenService } from '../application/ports/ITokenService';

// ── Shared helpers ────────────────────────────────────────────────────────────

const FUTURE = new Date(Date.now() + 86_400_000 * 30);

const makeReq = (overrides: Partial<Request> = {}): Request =>
  ({ headers: {}, body: {}, params: {}, user: undefined, method: 'GET', originalUrl: '/test', ...overrides }) as unknown as Request;

const makeRes = () => {
  const json   = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  const on     = vi.fn();
  return { status, json, on } as unknown as Response;
};

const makeNext = () => vi.fn() as unknown as NextFunction;

const buildSubRepo = (sub: Subscription | null) =>
  ({
    findById:             vi.fn().mockResolvedValue(null),
    findByUserId:         vi.fn().mockResolvedValue([]),
    findActiveByUserId:   vi.fn().mockResolvedValue(sub),
    findAll:              vi.fn().mockResolvedValue([]),
    create:               vi.fn(),
    update:               vi.fn(),
    updateStatus:         vi.fn(),
    existsActiveByPlanId: vi.fn().mockResolvedValue(false),
  }) as unknown as ISubscriptionRepository;

const buildExpireUC = () =>
  ({ execute: vi.fn().mockResolvedValue(undefined) }) as unknown as ExpireSubscriptionUseCase;

const buildTokenService = (payload?: { id: string; role: string }): ITokenService =>
  ({
    generate: vi.fn().mockReturnValue('tok'),
    verify:   payload
      ? vi.fn().mockReturnValue(payload)
      : vi.fn().mockImplementation(() => { throw new InvalidTokenError(); }),
  }) as unknown as ITokenService;

const activeSub  = new Subscription('s-1', 'u-1', 'p-1', new Date(), FUTURE, SubscriptionStatus.ACTIVE, new Date());
const expiredSub = new Subscription('s-2', 'u-1', 'p-1', new Date('2020-01-01'), new Date('2020-01-02'), SubscriptionStatus.ACTIVE, new Date());

// ── errorHandler.middleware ───────────────────────────────────────────────────

describe('globalErrorHandler', () => {
  it('DomainError — uses error.statusCode and message', () => {
    const err = new PlanNotFoundError('p-x');
    const res = makeRes();
    globalErrorHandler(err, makeReq(), res, makeNext());
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false, message: expect.any(String) }));
  });

  it('ZodError — 400 with fieldErrors', () => {
    const res  = makeRes();
    const zErr = new ZodError([
      { path: ['email'], message: 'Invalid email', code: 'custom' },
    ]);
    globalErrorHandler(zErr as unknown as Error, makeReq(), res, makeNext());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false, message: 'Validation error' }));
  });

  it('Unknown Error — 500 internal server error', () => {
    const res  = makeRes();
    globalErrorHandler(new Error('Unexpected crash'), makeReq(), res, makeNext());
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false, message: 'Internal server error' }));
  });

  it('ForbiddenError (403) — forwarded correctly', () => {
    const res = makeRes();
    globalErrorHandler(new ForbiddenError('No access'), makeReq(), res, makeNext());
    expect(res.status).toHaveBeenCalledWith(403);
  });
});

// ── authorizeRole.middleware ──────────────────────────────────────────────────

describe('authorizeRole', () => {
  beforeEach(() => vi.clearAllMocks());

  it('ADMIN user accessing ADMIN-only route → calls next()', () => {
    const req  = makeReq({ user: { id: 'u', role: 'ADMIN' } });
    const res  = makeRes();
    const next = makeNext();
    authorizeRole(UserRole.ADMIN)(req, res, next);
    expect(next).toHaveBeenCalledWith(/* no args */);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('CLIENT user accessing ADMIN-only route → 403', () => {
    const req  = makeReq({ user: { id: 'u', role: 'CLIENT' } });
    const res  = makeRes();
    const next = makeNext();
    authorizeRole(UserRole.ADMIN)(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('no user on request → 401', () => {
    const req  = makeReq({ user: undefined });
    const res  = makeRes();
    const next = makeNext();
    authorizeRole(UserRole.ADMIN)(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('CLIENT accessing CLIENT-only route → calls next()', () => {
    const req  = makeReq({ user: { id: 'u', role: 'CLIENT' } });
    const res  = makeRes();
    const next = makeNext();
    authorizeRole(UserRole.CLIENT)(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});

// ── requestLogger.middleware ──────────────────────────────────────────────────

describe('requestLogger', () => {
  it('calls next() and registers a finish listener on res', () => {
    const req  = makeReq({ method: 'GET', originalUrl: '/api/plans', user: { id: 'u', role: 'ADMIN' } });
    const res  = makeRes();
    const next = makeNext();

    requestLogger(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.on).toHaveBeenCalledWith('finish', expect.any(Function));
  });

  it('finish callback logs without throwing', () => {
    const req  = makeReq({ method: 'POST', originalUrl: '/api/auth/login' });
    const res  = makeRes() as Response & { on: ReturnType<typeof vi.fn>; statusCode: number };
    res.statusCode = 200;
    const next = makeNext();

    requestLogger(req, res as unknown as Response, next);

    const finishCb = (res.on as ReturnType<typeof vi.fn>).mock.calls[0]?.[1] as () => void;
    expect(() => finishCb?.()).not.toThrow();
  });

  it('works without req.user (anonymous request)', () => {
    const req  = makeReq({ user: undefined });
    const res  = makeRes();
    expect(() => requestLogger(req, res, makeNext())).not.toThrow();
  });
});

// ── authenticateJWT.middleware ────────────────────────────────────────────────

describe('authenticateJWT', () => {
  beforeEach(() => vi.clearAllMocks());

  it('valid Bearer token → attaches user to req and calls next()', async () => {
    const tokenSvc = buildTokenService({ id: 'u-1', role: 'ADMIN' });
    const mw       = authenticateJWT(tokenSvc);
    const req      = makeReq({ headers: { authorization: 'Bearer valid.token.here' } });
    const next     = makeNext();

    await mw(req, makeRes(), next);

    expect(next).toHaveBeenCalledWith(/* no error arg */);
    expect((req as Record<string, unknown>)['user']).toEqual({ id: 'u-1', role: 'ADMIN' });
  });

  it('missing Authorization header → next(Error)', async () => {
    const mw   = authenticateJWT(buildTokenService());
    const req  = makeReq({ headers: {} });
    const next = makeNext();

    await mw(req, makeRes(), next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('non-Bearer scheme → next(Error)', async () => {
    const mw   = authenticateJWT(buildTokenService());
    const req  = makeReq({ headers: { authorization: 'Basic dXNlcjpwYXNz' } });
    const next = makeNext();

    await mw(req, makeRes(), next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('invalid token → next(InvalidTokenError)', async () => {
    const mw   = authenticateJWT(buildTokenService(undefined));
    const req  = makeReq({ headers: { authorization: 'Bearer bad.token.here' } });
    const next = makeNext();

    await mw(req, makeRes(), next);

    expect(next).toHaveBeenCalledWith(expect.any(InvalidTokenError));
  });
});

// ── checkSubscriptionStatus.middleware ────────────────────────────────────────

describe('checkSubscriptionStatus', () => {
  beforeEach(() => vi.clearAllMocks());

  it('ADMIN user — skips check and calls next()', async () => {
    const mw   = checkSubscriptionStatus(buildSubRepo(null), buildExpireUC());
    const req  = makeReq({ user: { id: 'u', role: 'ADMIN' } });
    const next = makeNext();

    await mw(req, makeRes(), next);

    expect(next).toHaveBeenCalled();
  });

  it('no user on request → 401', async () => {
    const mw  = checkSubscriptionStatus(buildSubRepo(null), buildExpireUC());
    const res = makeRes();
    const next = makeNext();

    await mw(makeReq({ user: undefined }), res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('CLIENT with no subscription → 403 no-subscription', async () => {
    const mw   = checkSubscriptionStatus(buildSubRepo(null), buildExpireUC());
    const res  = makeRes();
    const next = makeNext();

    await mw(makeReq({ user: { id: 'u', role: 'CLIENT' } }), res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });

  it('CLIENT with ACTIVE (valid) subscription → calls next()', async () => {
    const mw   = checkSubscriptionStatus(buildSubRepo(activeSub), buildExpireUC());
    const next = makeNext();

    await mw(makeReq({ user: { id: 'u-1', role: 'CLIENT' } }), makeRes(), next);

    expect(next).toHaveBeenCalled();
  });

  it('CLIENT with expired (endDate past) subscription → expires it and 403', async () => {
    const expireUC = buildExpireUC();
    const mw       = checkSubscriptionStatus(buildSubRepo(expiredSub), expireUC);
    const res      = makeRes();
    const next     = makeNext();

    await mw(makeReq({ user: { id: 'u-1', role: 'CLIENT' } }), res, next);

    expect(expireUC.execute).toHaveBeenCalledWith(expiredSub.id);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('error in repository → forwards to next()', async () => {
    const brokenRepo = buildSubRepo(null);
    (brokenRepo.findActiveByUserId as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('DB error'));
    const mw   = checkSubscriptionStatus(brokenRepo, buildExpireUC());
    const next = makeNext();

    await mw(makeReq({ user: { id: 'u', role: 'CLIENT' } }), makeRes(), next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

// ── Routes — verify routers are created ───────────────────────────────────────
// Importing and calling route factories covers the route registration code.

const noop = (): void => undefined;
const makeController = () => ({ login: noop, register: noop, getAll: noop, getById: noop, create: noop, update: noop, remove: noop, getMySubscription: noop, cancel: noop, getMine: noop, pay: noop, adminUpdateStatus: noop, getMetrics: noop });

const mockContainer = () => ({
  authController:            makeController(),
  plansController:           makeController(),
  subscriptionsController:   makeController(),
  invoicesController:        makeController(),
  dashboardController:       makeController(),
  authenticate: noop,
  adminOnly:    noop,
  clientOnly:   noop,
  checkSubscription: noop,
}) as never;

describe('Route factories', () => {
  it('createAuthRouter returns a Router', () => {
    const r = createAuthRouter(mockContainer());
    expect(r).toBeDefined();
    expect(typeof r).toBe('function'); // Express routers are functions
  });

  it('createPlansRouter returns a Router', () => {
    expect(createPlansRouter(mockContainer())).toBeDefined();
  });

  it('createSubscriptionsRouter returns a Router', () => {
    expect(createSubscriptionsRouter(mockContainer())).toBeDefined();
  });

  it('createInvoicesRouter returns a Router', () => {
    expect(createInvoicesRouter(mockContainer())).toBeDefined();
  });

  it('createDashboardRouter returns a Router', () => {
    expect(createDashboardRouter(mockContainer())).toBeDefined();
  });
});
