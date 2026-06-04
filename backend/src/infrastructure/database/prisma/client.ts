// Prisma Client singleton
// Prevents multiple PrismaClient instances during development hot-reloads.

import { PrismaClient } from '@prisma/client';

type GlobalWithPrisma = typeof globalThis & { prisma?: PrismaClient };

const globalWithPrisma = global as GlobalWithPrisma;

export const prisma: PrismaClient =
  globalWithPrisma.prisma ??
  new PrismaClient({
    log: process.env['NODE_ENV'] === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env['NODE_ENV'] !== 'production') {
  globalWithPrisma.prisma = prisma;
}
