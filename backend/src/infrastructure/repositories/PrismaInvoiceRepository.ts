// PrismaInvoiceRepository — Infrastructure adapter implementing IInvoiceRepository
// findByUserId traverses the subscription relation to filter by user ownership.
// Decimal → number conversion applied to amount field.

import type { PrismaClient, Invoice as PrismaInvoice } from '@prisma/client';
import type {
  IInvoiceRepository,
  CreateInvoiceInput,
} from '../../domain/repositories/IInvoiceRepository';
import { Invoice } from '../../domain/entities/Invoice';
import { InvoiceStatus } from '../../domain/enums';

export class PrismaInvoiceRepository implements IInvoiceRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Invoice | null> {
    const record = await this.prisma.invoice.findUnique({ where: { id } });
    return record ? this.toDomain(record) : null;
  }

  async findBySubscriptionId(subscriptionId: string): Promise<Invoice[]> {
    const records = await this.prisma.invoice.findMany({
      where: { subscriptionId },
      orderBy: { createdAt: 'desc' },
    });
    return records.map((r) => this.toDomain(r));
  }

  async findByUserId(userId: string): Promise<Invoice[]> {
    const records = await this.prisma.invoice.findMany({
      where: { subscription: { userId } },
      orderBy: { createdAt: 'desc' },
    });
    return records.map((r) => this.toDomain(r));
  }

  async findAll(): Promise<Invoice[]> {
    const records = await this.prisma.invoice.findMany({ orderBy: { createdAt: 'desc' } });
    return records.map((r) => this.toDomain(r));
  }

  async create(input: CreateInvoiceInput): Promise<Invoice> {
    const record = await this.prisma.invoice.create({
      data: {
        subscriptionId: input.subscriptionId,
        amount: input.amount,
        dueDate: input.dueDate,
        // status defaults to PENDING per schema
      },
    });
    return this.toDomain(record);
  }

  async updateStatus(id: string, status: InvoiceStatus): Promise<Invoice> {
    const record = await this.prisma.invoice.update({
      where: { id },
      data: { status },
    });
    return this.toDomain(record);
  }

  private toDomain(record: PrismaInvoice): Invoice {
    return new Invoice(
      record.id,
      record.subscriptionId,
      Number(record.amount), // Prisma Decimal → number
      record.status as InvoiceStatus,
      record.dueDate,
      record.createdAt,
    );
  }
}
