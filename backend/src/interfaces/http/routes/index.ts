// Routes aggregator — mounts all sub-routers under /api/*
// The container provides pre-built middleware instances and controller instances.

import { Router } from 'express';
import type { AppContainer } from '../container';
import { createAuthRouter } from './auth.routes';
import { createPlansRouter } from './plans.routes';
import { createSubscriptionsRouter } from './subscriptions.routes';
import { createInvoicesRouter } from './invoices.routes';
import { createDashboardRouter } from './dashboard.routes';

export const createRouter = (container: AppContainer): Router => {
  const router = Router();

  router.use('/auth', createAuthRouter(container));
  router.use('/plans', createPlansRouter(container));
  router.use('/subscriptions', createSubscriptionsRouter(container));
  router.use('/invoices', createInvoicesRouter(container));
  router.use('/dashboard', createDashboardRouter(container));

  return router;
};
