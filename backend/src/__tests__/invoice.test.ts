// Invoice unit tests
// Covers: Invoice entity methods, MarkInvoiceOverdueUseCase, PayInvoiceUseCase
// Repositories are fully mocked — no database required.

import { describe, it, expect, vi } from 'vitest';
import { Invoice } from '../domain/entities/Invoice';
import { Subscription } from '../domain/entities/Subscription';
import { InvoiceStatus, SubscriptionStatus } from '../domain/enums';
import { InvoiceNotFoundError, InvoiceAlreadyPaidError } from '../domain/errors/InvoiceErrors';
import { ForbiddenError } from '../domain/errors/AuthErrors';
import type { IInvoiceRepository } from '../domain/repositories/IInvoiceRepository';
import type { ISubscriptionRepository } from '../domain/repositories/ISubscriptionRepository';
import { MarkInvoiceOverdueUseCase } from '../application/use-cases/invoices/MarkInvoiceOverdueUseCase';
import { PayInvoiceUseCase } from '../application/use-cases/invoices/PayInvoiceUseCase';

// ── Fixtures ─────────────────────────────────────────────────────────────────

const PAST   = new Date('2020-01-01');
const FUTURE = new Date(Date.now() + 86_400_000 * 30);

const buildInvoice = (
  status: InvoiceStatus,
  dueDate: Date = FUTURE,
): Invoice => new Invoice('inv-1', 'sub-1', 100, status, dueDate, new Date());

const buildSubscription = (userId = 'user-1'): Subscription =>
  new Subscription('sub-1', userId, 'plan-1', new Date(), FUTURE, SubscriptionStatus.ACTIVE, new Date());

const buildInvoiceRepo = (
  invoice: Invoice | null,
  partial: Partial<IInvoiceRepository> = {},
): IInvoiceRepository =>
  ({
    findById: vi.fn().mockResolvedValue(invoice),
    findBySubscriptionId: vi.fn().mockResolvedValue([]),
    findByUserId: vi.fn().mockResolvedValue([]),
    findAll: vi.fn().mockResolvedValue(invoice ? [invoice] : []),
    create: vi.fn().mockResolvedValue(invoice),
    updateStatus: vi.fn().mockImplementation((_id: string, status: InvoiceStatus) =>
      Promise.resolve(new Invoice('inv-1', 'sub-1', 100, status, invoice?.dueDate ?? FUTURE, new Date())),
    ),
    ...partial,
  }) as unknown as IInvoiceRepository;

const buildSubRepo = (sub: Subscription | null = buildSubscription()): ISubscriptionRepository =>
  ({
    findById: vi.fn().mockResolvedValue(sub),
    findByUserId: vi.fn().mockResolvedValue([]),
    findActiveByUserId: vi.fn().mockResolvedValue(sub),
    findAll: vi.fn().mockResolvedValue(sub ? [sub] : []),
    create: vi.fn(),
    updateStatus: vi.fn(),
    existsActiveByPlanId: vi.fn().mockResolvedValue(false),
  }) as unknown as ISubscriptionRepository;

// ── Invoice entity ────────────────────────────────────────────────────────────

describe('Invoice entity', () => {
  it('isPending() is true when status is PENDING', () => {
    expect(buildInvoice(InvoiceStatus.PENDING).isPending()).toBe(true);
  });

  it('isPaid() is true when status is PAID', () => {
    expect(buildInvoice(InvoiceStatus.PAID).isPaid()).toBe(true);
  });

  it('isOverdue() is true when status is OVERDUE', () => {
    expect(buildInvoice(InvoiceStatus.OVERDUE).isOverdue()).toBe(true);
  });

  it('isOverdue() is true when PENDING and dueDate is in the past', () => {
    const invoice = buildInvoice(InvoiceStatus.PENDING, PAST);
    expect(invoice.isOverdue()).toBe(true);
  });

  it('isOverdue() is false when PENDING and dueDate is in the future', () => {
    const invoice = buildInvoice(InvoiceStatus.PENDING, FUTURE);
    expect(invoice.isOverdue()).toBe(false);
  });
});

// ── MarkInvoiceOverdueUseCase ─────────────────────────────────────────────────

describe('MarkInvoiceOverdueUseCase', () => {
  it('shouldMarkInvoiceAsOverdue — updates PENDING invoice with past dueDate to OVERDUE', async () => {
    const overdueInvoice = buildInvoice(InvoiceStatus.PENDING, PAST);
    const invoiceRepo = buildInvoiceRepo(overdueInvoice);

    await new MarkInvoiceOverdueUseCase(invoiceRepo).execute('inv-1');

    expect(invoiceRepo.updateStatus).toHaveBeenCalledWith('inv-1', InvoiceStatus.OVERDUE);
  });

  it('does NOT update when invoice is PENDING but dueDate is in the future', async () => {
    const notYetOverdue = buildInvoice(InvoiceStatus.PENDING, FUTURE);
    const invoiceRepo = buildInvoiceRepo(notYetOverdue);

    await new MarkInvoiceOverdueUseCase(invoiceRepo).execute('inv-1');

    expect(invoiceRepo.updateStatus).not.toHaveBeenCalled();
  });

  it('does NOT update when invoice is already PAID', async () => {
    const paidInvoice = buildInvoice(InvoiceStatus.PAID, PAST);
    const invoiceRepo = buildInvoiceRepo(paidInvoice);

    await new MarkInvoiceOverdueUseCase(invoiceRepo).execute('inv-1');

    expect(invoiceRepo.updateStatus).not.toHaveBeenCalled();
  });

  it('throws InvoiceNotFoundError when invoice does not exist', async () => {
    const invoiceRepo = buildInvoiceRepo(null);

    await expect(new MarkInvoiceOverdueUseCase(invoiceRepo).execute('ghost')).rejects.toBeInstanceOf(
      InvoiceNotFoundError,
    );
  });
});

// ── PayInvoiceUseCase ─────────────────────────────────────────────────────────

describe('PayInvoiceUseCase', () => {
  it('shouldPayPendingInvoice — transitions PENDING invoice to PAID', async () => {
    const pendingInvoice = buildInvoice(InvoiceStatus.PENDING);
    const invoiceRepo = buildInvoiceRepo(pendingInvoice);
    const subRepo = buildSubRepo(buildSubscription('user-1'));

    const result = await new PayInvoiceUseCase(invoiceRepo, subRepo).execute('inv-1', 'user-1');

    expect(invoiceRepo.updateStatus).toHaveBeenCalledWith('inv-1', InvoiceStatus.PAID);
    expect(result.status).toBe(InvoiceStatus.PAID);
  });

  it('shouldPayPendingInvoice — also allows OVERDUE invoices to be paid', async () => {
    const overdueInvoice = buildInvoice(InvoiceStatus.OVERDUE, PAST);
    const invoiceRepo = buildInvoiceRepo(overdueInvoice);
    const subRepo = buildSubRepo(buildSubscription('user-1'));

    const result = await new PayInvoiceUseCase(invoiceRepo, subRepo).execute('inv-1', 'user-1');

    expect(invoiceRepo.updateStatus).toHaveBeenCalledWith('inv-1', InvoiceStatus.PAID);
    expect(result.status).toBe(InvoiceStatus.PAID);
  });

  it('throws InvoiceAlreadyPaidError when invoice is already PAID', async () => {
    const paidInvoice = buildInvoice(InvoiceStatus.PAID);
    const invoiceRepo = buildInvoiceRepo(paidInvoice);
    const subRepo = buildSubRepo(buildSubscription('user-1'));

    await expect(
      new PayInvoiceUseCase(invoiceRepo, subRepo).execute('inv-1', 'user-1'),
    ).rejects.toBeInstanceOf(InvoiceAlreadyPaidError);
    expect(invoiceRepo.updateStatus).not.toHaveBeenCalled();
  });

  it('throws ForbiddenError when invoice belongs to a different user', async () => {
    const pendingInvoice = buildInvoice(InvoiceStatus.PENDING);
    const invoiceRepo = buildInvoiceRepo(pendingInvoice);
    const subRepo = buildSubRepo(buildSubscription('other-user')); // different userId

    await expect(
      new PayInvoiceUseCase(invoiceRepo, subRepo).execute('inv-1', 'user-1'), // user-1 tries to pay
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('throws InvoiceNotFoundError when invoice does not exist', async () => {
    const invoiceRepo = buildInvoiceRepo(null);
    const subRepo = buildSubRepo();

    await expect(
      new PayInvoiceUseCase(invoiceRepo, subRepo).execute('ghost', 'user-1'),
    ).rejects.toBeInstanceOf(InvoiceNotFoundError);
  });
});
