// Domain enums — single source of truth for business values
// No external dependencies. Infrastructure enums (Prisma) must map to these.

export enum UserRole {
  ADMIN = 'ADMIN',
  CLIENT = 'CLIENT',
}

export enum PlanName {
  BRONZE = 'BRONZE',
  SILVER = 'SILVER',
  GOLD = 'GOLD',
}

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
}

export enum InvoiceStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
}
