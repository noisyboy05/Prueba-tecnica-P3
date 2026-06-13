// IUserRepository — Domain port (Repository Pattern)
// Defines persistence operations for User aggregate.
// Infrastructure (Prisma) implements this interface as an adapter.
// Domain never imports from infrastructure — DIP enforced.

import type { User } from '../entities/User';
import type { UserRole } from '../enums';

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  password?: string;
  role?: UserRole;
}

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findAll(): Promise<User[]>;
  create(input: CreateUserInput): Promise<User>;
  update(id: string, input: UpdateUserInput): Promise<User>;
}
