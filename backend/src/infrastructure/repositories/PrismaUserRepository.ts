// PrismaUserRepository — Infrastructure adapter implementing IUserRepository
// Maps Prisma model records to domain User entities.
// Domain never imports this file; it only knows about IUserRepository.

import type { PrismaClient, User as PrismaUser } from '@prisma/client';
import type {
  IUserRepository,
  CreateUserInput,
  UpdateUserInput,
} from '../../domain/repositories/IUserRepository';
import { User } from '../../domain/entities/User';
import { UserRole } from '../../domain/enums';

export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<User | null> {
    const record = await this.prisma.user.findUnique({ where: { id } });
    return record ? this.toDomain(record) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const record = await this.prisma.user.findUnique({ where: { email } });
    return record ? this.toDomain(record) : null;
  }

  async findAll(): Promise<User[]> {
    const records = await this.prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
    return records.map((r) => this.toDomain(r));
  }

  async create(input: CreateUserInput): Promise<User> {
    const record = await this.prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        password: input.password,
        role: input.role,
      },
    });
    return this.toDomain(record);
  }

  async update(id: string, input: UpdateUserInput): Promise<User> {
    const data: Parameters<typeof this.prisma.user.update>[0]['data'] = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.email !== undefined) data.email = input.email;
    if (input.password !== undefined) data.password = input.password;
    if (input.role !== undefined) data.role = input.role;

    const record = await this.prisma.user.update({ where: { id }, data });
    return this.toDomain(record);
  }

  private toDomain(record: PrismaUser): User {
    return new User(
      record.id,
      record.name,
      record.email,
      record.password,
      record.role as UserRole,
      record.createdAt,
    );
  }
}
