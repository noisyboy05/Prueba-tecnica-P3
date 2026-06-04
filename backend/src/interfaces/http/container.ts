// Composition Root — wires all dependencies together
// This is the ONLY file that imports concrete implementations.
// All other files depend on interfaces/abstractions.
// Pattern: manual dependency injection (no DI framework, per ADR "no unnecessary complexity").

import type { RequestHandler } from 'express';

// Infrastructure
import { prisma } from '../../infrastructure/database/prisma/client';
import { JwtTokenService } from '../../infrastructure/auth/JwtTokenService';
import { BcryptPasswordService } from '../../infrastructure/auth/BcryptPasswordService';
import { PrismaUserRepository } from '../../infrastructure/repositories/PrismaUserRepository';
import { PrismaPlanRepository } from '../../infrastructure/repositories/PrismaPlanRepository';
import { PrismaSubscriptionRepository } from '../../infrastructure/repositories/PrismaSubscriptionRepository';
import { PrismaInvoiceRepository } from '../../infrastructure/repositories/PrismaInvoiceRepository';

// Application — Use Cases
import { LoginUseCase } from '../../application/use-cases/auth/LoginUseCase';
import { RegisterUseCase } from '../../application/use-cases/auth/RegisterUseCase';
import { CreatePlanUseCase } from '../../application/use-cases/plans/CreatePlanUseCase';
import { UpdatePlanUseCase } from '../../application/use-cases/plans/UpdatePlanUseCase';
import { DeletePlanUseCase } from '../../application/use-cases/plans/DeletePlanUseCase';
import { GetAllPlansUseCase } from '../../application/use-cases/plans/GetAllPlansUseCase';
import { GetPlanByIdUseCase } from '../../application/use-cases/plans/GetPlanByIdUseCase';
import { CreateSubscriptionUseCase } from '../../application/use-cases/subscriptions/CreateSubscriptionUseCase';
import { GetUserSubscriptionUseCase } from '../../application/use-cases/subscriptions/GetUserSubscriptionUseCase';
import { GetAllSubscriptionsUseCase } from '../../application/use-cases/subscriptions/GetAllSubscriptionsUseCase';
import { ExpireSubscriptionUseCase } from '../../application/use-cases/subscriptions/ExpireSubscriptionUseCase';
import { UpdateSubscriptionUseCase } from '../../application/use-cases/subscriptions/UpdateSubscriptionUseCase';
import { CancelSubscriptionUseCase } from '../../application/use-cases/subscriptions/CancelSubscriptionUseCase';
import { GenerateInvoiceUseCase } from '../../application/use-cases/invoices/GenerateInvoiceUseCase';
import { GetUserInvoicesUseCase } from '../../application/use-cases/invoices/GetUserInvoicesUseCase';
import { GetAllInvoicesUseCase } from '../../application/use-cases/invoices/GetAllInvoicesUseCase';
import { PayInvoiceUseCase } from '../../application/use-cases/invoices/PayInvoiceUseCase';
import { GetDashboardMetricsUseCase } from '../../application/use-cases/dashboard/GetDashboardMetricsUseCase';

// Controllers
import { AuthController } from './controllers/AuthController';
import { PlansController } from './controllers/PlansController';
import { SubscriptionsController } from './controllers/SubscriptionsController';
import { InvoicesController } from './controllers/InvoicesController';
import { DashboardController } from './controllers/DashboardController';

// Middleware factories
import { authenticateJWT } from './middlewares/authenticateJWT.middleware';
import { authorizeRole } from './middlewares/authorizeRole.middleware';
import { checkSubscriptionStatus } from './middlewares/checkSubscriptionStatus.middleware';

import { UserRole } from '../../domain/enums';

export interface AppContainer {
  authController: AuthController;
  plansController: PlansController;
  subscriptionsController: SubscriptionsController;
  invoicesController: InvoicesController;
  dashboardController: DashboardController;
  /** Verifies JWT and attaches req.user */
  authenticate: RequestHandler;
  /** Allows only ADMIN */
  adminOnly: RequestHandler;
  /** Allows only CLIENT */
  clientOnly: RequestHandler;
  /** Requires an active, non-expired subscription (CLIENT premium guard) */
  checkSubscription: RequestHandler;
}

export const buildContainer = (): AppContainer => {
  // ── Environment validation ────────────────────────────────────────────────
  const jwtSecret = process.env['JWT_SECRET'];
  if (!jwtSecret) throw new Error('JWT_SECRET environment variable is required');
  const jwtExpiresIn = process.env['JWT_EXPIRES_IN'] ?? '24h';

  // ── Infrastructure services ───────────────────────────────────────────────
  const tokenService = new JwtTokenService(jwtSecret, jwtExpiresIn);
  const passwordService = new BcryptPasswordService();

  // ── Repositories (Prisma adapters) ────────────────────────────────────────
  const userRepository = new PrismaUserRepository(prisma);
  const planRepository = new PrismaPlanRepository(prisma);
  const subscriptionRepository = new PrismaSubscriptionRepository(prisma);
  const invoiceRepository = new PrismaInvoiceRepository(prisma);

  // ── Use Cases ─────────────────────────────────────────────────────────────
  const loginUseCase = new LoginUseCase(userRepository, passwordService, tokenService);
  const registerUseCase = new RegisterUseCase(userRepository, passwordService, tokenService);

  const createPlanUseCase = new CreatePlanUseCase(planRepository);
  const updatePlanUseCase = new UpdatePlanUseCase(planRepository);
  const deletePlanUseCase = new DeletePlanUseCase(planRepository, subscriptionRepository);
  const getAllPlansUseCase = new GetAllPlansUseCase(planRepository);
  const getPlanByIdUseCase = new GetPlanByIdUseCase(planRepository);

  // TECHNICAL DEBT: CreateSubscriptionUseCase + GenerateInvoiceUseCase should be
  // wrapped in prisma.$transaction() to guarantee atomicity. See CreateSubscriptionUseCase.ts.
  const generateInvoiceUseCase = new GenerateInvoiceUseCase(
    subscriptionRepository,
    planRepository,
    invoiceRepository,
  );
  const createSubscriptionUseCase = new CreateSubscriptionUseCase(
    subscriptionRepository,
    planRepository,
    userRepository,
    generateInvoiceUseCase,
  );
  const getUserSubscriptionUseCase = new GetUserSubscriptionUseCase(
    subscriptionRepository,
    planRepository,
  );
  const getAllSubscriptionsUseCase = new GetAllSubscriptionsUseCase(
    subscriptionRepository,
    planRepository,
  );
  const expireSubscriptionUseCase  = new ExpireSubscriptionUseCase(subscriptionRepository);
  const updateSubscriptionUseCase  = new UpdateSubscriptionUseCase(subscriptionRepository, planRepository);
  const cancelSubscriptionUseCase  = new CancelSubscriptionUseCase(subscriptionRepository);

  const getUserInvoicesUseCase = new GetUserInvoicesUseCase(invoiceRepository);
  const getAllInvoicesUseCase = new GetAllInvoicesUseCase(invoiceRepository);
  const payInvoiceUseCase = new PayInvoiceUseCase(invoiceRepository, subscriptionRepository);

  const getDashboardMetricsUseCase = new GetDashboardMetricsUseCase(
    userRepository,
    planRepository,
    subscriptionRepository,
    invoiceRepository,
  );

  // ── Controllers ───────────────────────────────────────────────────────────
  const authController = new AuthController(loginUseCase, registerUseCase);
  const plansController = new PlansController(
    createPlanUseCase,
    updatePlanUseCase,
    deletePlanUseCase,
    getAllPlansUseCase,
    getPlanByIdUseCase,
  );
  const subscriptionsController = new SubscriptionsController(
    createSubscriptionUseCase,
    getUserSubscriptionUseCase,
    getAllSubscriptionsUseCase,
    updateSubscriptionUseCase,
    cancelSubscriptionUseCase,
  );
  const invoicesController = new InvoicesController(
    getUserInvoicesUseCase,
    getAllInvoicesUseCase,
    payInvoiceUseCase,
  );
  const dashboardController = new DashboardController(getDashboardMetricsUseCase);

  // ── Middleware instances ───────────────────────────────────────────────────
  const authenticate = authenticateJWT(tokenService);
  const adminOnly = authorizeRole(UserRole.ADMIN);
  const clientOnly = authorizeRole(UserRole.CLIENT);
  const checkSubscription = checkSubscriptionStatus(subscriptionRepository, expireSubscriptionUseCase);

  return {
    authController,
    plansController,
    subscriptionsController,
    invoicesController,
    dashboardController,
    authenticate,
    adminOnly,
    clientOnly,
    checkSubscription,
  };
};
