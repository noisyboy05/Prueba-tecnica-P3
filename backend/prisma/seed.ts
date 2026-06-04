// Prisma seed — crea datos iniciales para desarrollo y evaluación
// Idempotente: usa upsert, se puede ejecutar múltiples veces sin duplicados.
//
// Datos creados:
//   ADMIN  → admin@saasflow.com   / Admin123!
//   CLIENT → client@saasflow.com  / Client123!
//   Planes → BRONZE $9.99 | SILVER $19.99 | GOLD $39.99

import { PrismaClient, type PlanName, type Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

async function main(): Promise<void> {
  console.log('\n🌱 SaaS Flow — Seeding database...\n');

  // ── Users ──────────────────────────────────────────────────────────────────

  const adminHash  = await bcrypt.hash('Admin123!',  SALT_ROUNDS);
  const clientHash = await bcrypt.hash('Client123!', SALT_ROUNDS);

  const admin = await prisma.user.upsert({
    where:  { email: 'admin@saasflow.com' },
    update: {},
    create: {
      name:     'Admin User',
      email:    'admin@saasflow.com',
      password: adminHash,
      role:     'ADMIN' as Role,
    },
  });
  console.log(`  ✓ ADMIN   → ${admin.email}  (id: ${admin.id})`);

  const client = await prisma.user.upsert({
    where:  { email: 'client@saasflow.com' },
    update: {},
    create: {
      name:     'Client User',
      email:    'client@saasflow.com',
      password: clientHash,
      role:     'CLIENT' as Role,
    },
  });
  console.log(`  ✓ CLIENT  → ${client.email} (id: ${client.id})`);

  // ── Plans ──────────────────────────────────────────────────────────────────

  const plans: Array<{ name: PlanName; price: number; description: string }> = [
    {
      name:        'BRONZE',
      price:        9.99,
      description: 'Essential access — core platform features included.',
    },
    {
      name:        'SILVER',
      price:       19.99,
      description: 'Standard access — enhanced features and higher limits.',
    },
    {
      name:        'GOLD',
      price:       39.99,
      description: 'Full access — all premium features and priority support.',
    },
  ];

  console.log('');
  for (const plan of plans) {
    const created = await prisma.plan.upsert({
      where:  { name: plan.name },
      update: { price: plan.price, description: plan.description },
      create: { name: plan.name, price: plan.price, description: plan.description },
    });
    console.log(`  ✓ PLAN    → ${created.name.padEnd(6)} $${plan.price.toFixed(2)}  (id: ${created.id})`);
  }

  console.log('\n✅ Seed completed.\n');
  console.log('  ┌─────────────────────────────────────────┐');
  console.log('  │  ADMIN   admin@saasflow.com / Admin123!  │');
  console.log('  │  CLIENT  client@saasflow.com / Client123!│');
  console.log('  └─────────────────────────────────────────┘\n');
}

main()
  .catch((err: unknown) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
