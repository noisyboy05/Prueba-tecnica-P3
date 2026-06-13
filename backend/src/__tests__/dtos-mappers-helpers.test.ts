// DTOs, Mappers, apiResponse helper and Domain Errors
// Pure TypeScript — no mocks needed.

import { describe, it, expect } from 'vitest';
import { ZodError } from 'zod';

// DTOs
import { LoginRequestSchema }              from '../application/dtos/auth/LoginRequestDto';
import { RegisterRequestSchema }           from '../application/dtos/auth/RegisterRequestDto';
import { CreatePlanSchema }                from '../application/dtos/plans/CreatePlanDto';
import { UpdatePlanSchema }                from '../application/dtos/plans/UpdatePlanDto';
import { CreateSubscriptionSchema }        from '../application/dtos/subscriptions/CreateSubscriptionDto';
import { UpdateSubscriptionSchema }        from '../application/dtos/subscriptions/UpdateSubscriptionDto';
import { UpdateInvoiceStatusSchema }       from '../application/dtos/invoices/UpdateInvoiceStatusDto';
import { AdminUpdateInvoiceStatusSchema }  from '../application/dtos/invoices/AdminUpdateInvoiceStatusDto';

// Mappers
import { mapUserToAuthDto }      from '../application/mappers/userMapper';
import { mapPlanToDto }          from '../application/mappers/planMapper';
import { mapSubscriptionToDto }  from '../application/mappers/subscriptionMapper';
import { mapInvoiceToDto }       from '../application/mappers/invoiceMapper';

// apiResponse helper
import { successResponse, errorResponse } from '../interfaces/http/helpers/apiResponse';

// Entities
import { User }         from '../domain/entities/User';
import { Plan }         from '../domain/entities/Plan';
import { Subscription } from '../domain/entities/Subscription';
import { Invoice }      from '../domain/entities/Invoice';
import { UserRole, PlanName, SubscriptionStatus, InvoiceStatus } from '../domain/enums';

// Domain errors
import { DomainError } from '../domain/errors/DomainError';
import {
  InvalidCredentialsError, UnauthorizedError, ForbiddenError,
  TokenExpiredError, InvalidTokenError,
} from '../domain/errors/AuthErrors';
import { UserNotFoundError, UserAlreadyExistsError } from '../domain/errors/UserErrors';
import { PlanNotFoundError, PlanAlreadyExistsError, PlanInUseError } from '../domain/errors/PlanErrors';
import {
  SubscriptionNotFoundError, ActiveSubscriptionExistsError,
  SubscriptionExpiredError, SubscriptionNotActiveError,
} from '../domain/errors/SubscriptionErrors';
import { InvoiceNotFoundError, InvoiceAlreadyPaidError, InvoiceNotPayableError } from '../domain/errors/InvoiceErrors';

const FUTURE = new Date(Date.now() + 86_400_000 * 30);
const PAST   = new Date('2020-01-01');

// ── DTO validation tests ──────────────────────────────────────────────────────

describe('LoginRequestSchema', () => {
  it('valid — email and password present', () => {
    const r = LoginRequestSchema.safeParse({ email: 'a@b.com', password: 'pass' });
    expect(r.success).toBe(true);
  });
  it('email normalized to lowercase', () => {
    const r = LoginRequestSchema.parse({ email: 'USER@EXAMPLE.COM', password: 'p' });
    expect(r.email).toBe('user@example.com');
  });
  it('invalid — bad email format', () => {
    expect(LoginRequestSchema.safeParse({ email: 'not-email', password: 'p' }).success).toBe(false);
  });
  it('invalid — empty password', () => {
    expect(LoginRequestSchema.safeParse({ email: 'a@b.com', password: '' }).success).toBe(false);
  });
});

describe('RegisterRequestSchema', () => {
  it('valid', () => {
    expect(RegisterRequestSchema.safeParse({ name: 'Alice', email: 'a@b.com', password: 'secure123' }).success).toBe(true);
  });
  it('invalid — name too short', () => {
    expect(RegisterRequestSchema.safeParse({ name: 'A', email: 'a@b.com', password: 'secure123' }).success).toBe(false);
  });
  it('invalid — password too short', () => {
    expect(RegisterRequestSchema.safeParse({ name: 'Alice', email: 'a@b.com', password: '1234567' }).success).toBe(false);
  });
  it('invalid — password too long', () => {
    expect(RegisterRequestSchema.safeParse({ name: 'Alice', email: 'a@b.com', password: 'x'.repeat(101) }).success).toBe(false);
  });
});

describe('CreatePlanSchema', () => {
  it('valid BRONZE plan', () => {
    expect(CreatePlanSchema.safeParse({ name: 'BRONZE', price: 9.99, description: 'Basic' }).success).toBe(true);
  });
  it('valid GOLD plan', () => {
    expect(CreatePlanSchema.safeParse({ name: 'GOLD', price: 39.99, description: 'Full' }).success).toBe(true);
  });
  it('invalid — unknown tier', () => {
    expect(CreatePlanSchema.safeParse({ name: 'PLATINUM', price: 9.99, description: 'x' }).success).toBe(false);
  });
  it('invalid — negative price', () => {
    expect(CreatePlanSchema.safeParse({ name: 'BRONZE', price: -1, description: 'x' }).success).toBe(false);
  });
  it('invalid — empty description', () => {
    expect(CreatePlanSchema.safeParse({ name: 'GOLD', price: 9.99, description: '' }).success).toBe(false);
  });
});

describe('UpdatePlanSchema', () => {
  it('valid — only price', () => {
    expect(UpdatePlanSchema.safeParse({ price: 14.99 }).success).toBe(true);
  });
  it('valid — only description', () => {
    expect(UpdatePlanSchema.safeParse({ description: 'New desc' }).success).toBe(true);
  });
  it('valid — both fields', () => {
    expect(UpdatePlanSchema.safeParse({ price: 14.99, description: 'Updated' }).success).toBe(true);
  });
  it('invalid — no fields provided', () => {
    expect(UpdatePlanSchema.safeParse({}).success).toBe(false);
  });
  it('invalid — zero price', () => {
    expect(UpdatePlanSchema.safeParse({ price: 0 }).success).toBe(false);
  });
});

describe('CreateSubscriptionSchema', () => {
  const start = new Date().toISOString();
  const end   = FUTURE.toISOString();
  it('valid', () => {
    const r = CreateSubscriptionSchema.safeParse({
      userId: '00000000-0000-0000-0000-000000000001',
      planId: '00000000-0000-0000-0000-000000000002',
      startDate: start,
      endDate: end,
    });
    expect(r.success).toBe(true);
  });
  it('invalid — endDate before startDate', () => {
    const r = CreateSubscriptionSchema.safeParse({
      userId: '00000000-0000-0000-0000-000000000001',
      planId: '00000000-0000-0000-0000-000000000002',
      startDate: end,
      endDate:   start,
    });
    expect(r.success).toBe(false);
  });
  it('invalid — non-UUID userId', () => {
    expect(CreateSubscriptionSchema.safeParse({ userId: 'not-uuid', planId: '00000000-0000-0000-0000-000000000002', startDate: start, endDate: end }).success).toBe(false);
  });
});

describe('UpdateSubscriptionSchema', () => {
  it('valid — only endDate', () => {
    expect(UpdateSubscriptionSchema.safeParse({ endDate: FUTURE.toISOString() }).success).toBe(true);
  });
  it('valid — only planId', () => {
    expect(UpdateSubscriptionSchema.safeParse({ planId: '00000000-0000-0000-0000-000000000001' }).success).toBe(true);
  });
  it('invalid — no fields provided', () => {
    expect(UpdateSubscriptionSchema.safeParse({}).success).toBe(false);
  });
  it('invalid — endDate before startDate when both given', () => {
    const r = UpdateSubscriptionSchema.safeParse({ startDate: FUTURE.toISOString(), endDate: PAST.toISOString() });
    expect(r.success).toBe(false);
  });
});

describe('UpdateInvoiceStatusSchema (CLIENT — only PAID)', () => {
  it('valid — PAID accepted', () => {
    expect(UpdateInvoiceStatusSchema.safeParse({ status: 'PAID' }).success).toBe(true);
  });
  it('invalid — PENDING rejected', () => {
    expect(UpdateInvoiceStatusSchema.safeParse({ status: 'PENDING' }).success).toBe(false);
  });
  it('invalid — OVERDUE rejected', () => {
    expect(UpdateInvoiceStatusSchema.safeParse({ status: 'OVERDUE' }).success).toBe(false);
  });
});

describe('AdminUpdateInvoiceStatusSchema (ADMIN — all statuses)', () => {
  it('valid — PENDING accepted', () => {
    expect(AdminUpdateInvoiceStatusSchema.safeParse({ status: 'PENDING' }).success).toBe(true);
  });
  it('valid — PAID accepted', () => {
    expect(AdminUpdateInvoiceStatusSchema.safeParse({ status: 'PAID' }).success).toBe(true);
  });
  it('valid — OVERDUE accepted', () => {
    expect(AdminUpdateInvoiceStatusSchema.safeParse({ status: 'OVERDUE' }).success).toBe(true);
  });
  it('invalid — unknown status', () => {
    expect(AdminUpdateInvoiceStatusSchema.safeParse({ status: 'CANCELLED' }).success).toBe(false);
  });
});

// ── Mapper tests ──────────────────────────────────────────────────────────────

describe('mapUserToAuthDto', () => {
  const user = new User('u-1', 'Alice', 'alice@ex.com', 'SHOULD_NOT_APPEAR', UserRole.ADMIN, new Date());

  it('maps all fields correctly', () => {
    const dto = mapUserToAuthDto(user);
    expect(dto.id).toBe('u-1');
    expect(dto.name).toBe('Alice');
    expect(dto.email).toBe('alice@ex.com');
    expect(dto.role).toBe(UserRole.ADMIN);
  });

  it('never exposes password', () => {
    const dto = mapUserToAuthDto(user) as Record<string, unknown>;
    expect(dto['password']).toBeUndefined();
  });
});

describe('mapPlanToDto', () => {
  const plan = new Plan('p-1', PlanName.SILVER, 19.99, 'Silver desc', new Date('2024-01-15'));

  it('maps all fields and formats createdAt as ISO string', () => {
    const dto = mapPlanToDto(plan);
    expect(dto.id).toBe('p-1');
    expect(dto.name).toBe(PlanName.SILVER);
    expect(dto.price).toBe(19.99);
    expect(dto.description).toBe('Silver desc');
    expect(typeof dto.createdAt).toBe('string');
  });
});

describe('mapSubscriptionToDto', () => {
  const sub  = new Subscription('s-1', 'u-1', 'p-1', new Date(), FUTURE, SubscriptionStatus.ACTIVE, new Date());
  const plan = new Plan('p-1', PlanName.GOLD, 39.99, 'Gold', new Date());

  it('with plan — embeds plan in DTO', () => {
    const dto = mapSubscriptionToDto(sub, plan);
    expect(dto.plan?.name).toBe(PlanName.GOLD);
    expect(dto.plan?.price).toBe(39.99);
  });

  it('without plan — plan is undefined', () => {
    const dto = mapSubscriptionToDto(sub);
    expect(dto.plan).toBeUndefined();
  });

  it('maps all base fields', () => {
    const dto = mapSubscriptionToDto(sub);
    expect(dto.id).toBe('s-1');
    expect(dto.userId).toBe('u-1');
    expect(dto.status).toBe(SubscriptionStatus.ACTIVE);
  });
});

describe('mapInvoiceToDto', () => {
  const inv = new Invoice('i-1', 's-1', 105, InvoiceStatus.PENDING, FUTURE, new Date());

  it('maps all fields correctly', () => {
    const dto = mapInvoiceToDto(inv);
    expect(dto.id).toBe('i-1');
    expect(dto.subscriptionId).toBe('s-1');
    expect(dto.amount).toBe(105);
    expect(dto.status).toBe(InvoiceStatus.PENDING);
    expect(typeof dto.dueDate).toBe('string');
    expect(typeof dto.createdAt).toBe('string');
  });
});

// ── apiResponse helper ────────────────────────────────────────────────────────

describe('successResponse', () => {
  it('wraps data in success envelope', () => {
    const r = successResponse({ id: '1', name: 'plan' });
    expect(r.success).toBe(true);
    expect(r.data).toEqual({ id: '1', name: 'plan' });
  });

  it('works with primitive types', () => {
    expect(successResponse(42).data).toBe(42);
    expect(successResponse('ok').data).toBe('ok');
    expect(successResponse(null).data).toBeNull();
  });
});

describe('errorResponse', () => {
  it('wraps message in error envelope', () => {
    const r = errorResponse('Something failed');
    expect(r.success).toBe(false);
    expect(r.message).toBe('Something failed');
    expect(r.errors).toBeUndefined();
  });

  it('includes errors when provided', () => {
    const r = errorResponse('Validation error', { email: ['Invalid format'] });
    expect(r.success).toBe(false);
    expect(r.errors?.['email']).toEqual(['Invalid format']);
  });
});

// ── Domain Errors ─────────────────────────────────────────────────────────────

describe('DomainError base', () => {
  it('is abstract — subclasses carry message + statusCode', () => {
    const err = new PlanNotFoundError('p-1');
    expect(err).toBeInstanceOf(DomainError);
    expect(err.message).toContain('p-1');
    expect(err.statusCode).toBe(404);
    expect(err.name).toBe('PlanNotFoundError');
  });
});

describe('AuthErrors', () => {
  it('InvalidCredentialsError — 401', () => {
    const e = new InvalidCredentialsError();
    expect(e.statusCode).toBe(401);
    expect(e.message).toMatch(/Invalid email or password/i);
  });
  it('UnauthorizedError — 401 with default message', () => {
    const e = new UnauthorizedError();
    expect(e.statusCode).toBe(401);
  });
  it('UnauthorizedError — custom message', () => {
    const e = new UnauthorizedError('Token required');
    expect(e.message).toBe('Token required');
  });
  it('ForbiddenError — 403', () => {
    const e = new ForbiddenError();
    expect(e.statusCode).toBe(403);
  });
  it('TokenExpiredError — 401', () => {
    const e = new TokenExpiredError();
    expect(e.statusCode).toBe(401);
  });
  it('InvalidTokenError — 401', () => {
    const e = new InvalidTokenError();
    expect(e.statusCode).toBe(401);
  });
});

describe('UserErrors', () => {
  it('UserNotFoundError — 404 with identifier', () => {
    const e = new UserNotFoundError('u-1');
    expect(e.statusCode).toBe(404);
    expect(e.message).toContain('u-1');
  });
  it('UserNotFoundError — 404 without identifier', () => {
    const e = new UserNotFoundError();
    expect(e.statusCode).toBe(404);
  });
  it('UserAlreadyExistsError — 409', () => {
    const e = new UserAlreadyExistsError('alice@ex.com');
    expect(e.statusCode).toBe(409);
    expect(e.message).toContain('alice@ex.com');
  });
});

describe('PlanErrors', () => {
  it('PlanNotFoundError — 404', () => {
    const e = new PlanNotFoundError('p-1');
    expect(e.statusCode).toBe(404);
  });
  it('PlanNotFoundError — no identifier', () => {
    const e = new PlanNotFoundError();
    expect(e.statusCode).toBe(404);
  });
  it('PlanAlreadyExistsError — 409', () => {
    const e = new PlanAlreadyExistsError('GOLD');
    expect(e.statusCode).toBe(409);
    expect(e.message).toContain('GOLD');
  });
  it('PlanInUseError — 422', () => {
    const e = new PlanInUseError('p-1');
    expect(e.statusCode).toBe(422);
    expect(e.message).toContain('p-1');
  });
});

describe('SubscriptionErrors', () => {
  it('SubscriptionNotFoundError — 404', () => {
    const e = new SubscriptionNotFoundError('s-1');
    expect(e.statusCode).toBe(404);
  });
  it('SubscriptionNotFoundError — no identifier', () => {
    expect(new SubscriptionNotFoundError().statusCode).toBe(404);
  });
  it('ActiveSubscriptionExistsError — 422', () => {
    const e = new ActiveSubscriptionExistsError('u-1');
    expect(e.statusCode).toBe(422);
    expect(e.message).toContain('u-1');
  });
  it('SubscriptionExpiredError — 403', () => {
    const e = new SubscriptionExpiredError();
    expect(e.statusCode).toBe(403);
  });
  it('SubscriptionNotActiveError — 422', () => {
    const e = new SubscriptionNotActiveError();
    expect(e.statusCode).toBe(422);
  });
});

describe('InvoiceErrors', () => {
  it('InvoiceNotFoundError — 404', () => {
    const e = new InvoiceNotFoundError('i-1');
    expect(e.statusCode).toBe(404);
  });
  it('InvoiceNotFoundError — no identifier', () => {
    expect(new InvoiceNotFoundError().statusCode).toBe(404);
  });
  it('InvoiceAlreadyPaidError — 422', () => {
    const e = new InvoiceAlreadyPaidError('i-1');
    expect(e.statusCode).toBe(422);
    expect(e.message).toContain('i-1');
  });
  it('InvoiceNotPayableError — 422', () => {
    const e = new InvoiceNotPayableError('OVERDUE');
    expect(e.statusCode).toBe(422);
    expect(e.message).toContain('OVERDUE');
  });
});

// ── User entity — missing branches ────────────────────────────────────────────

describe('User entity — isAdmin / isClient', () => {
  const admin  = new User('u-a', 'Admin', 'a@ex.com', 'h', UserRole.ADMIN, new Date());
  const client = new User('u-c', 'Client', 'c@ex.com', 'h', UserRole.CLIENT, new Date());

  it('admin.isAdmin() is true', ()  => expect(admin.isAdmin()).toBe(true));
  it('admin.isClient() is false', () => expect(admin.isClient()).toBe(false));
  it('client.isAdmin() is false', () => expect(client.isAdmin()).toBe(false));
  it('client.isClient() is true', () => expect(client.isClient()).toBe(true));
});
