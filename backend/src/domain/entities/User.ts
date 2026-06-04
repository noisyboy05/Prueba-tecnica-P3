// User — Domain entity
// Pure TypeScript. No framework or ORM dependencies.
// SRP: represents a user with identity and role behavior.

import { UserRole } from '../enums';

export class User {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly email: string,
    public readonly password: string,
    public readonly role: UserRole,
    public readonly createdAt: Date,
  ) {}

  isAdmin(): boolean {
    return this.role === UserRole.ADMIN;
  }

  isClient(): boolean {
    return this.role === UserRole.CLIENT;
  }
}
