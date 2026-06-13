import { Router } from 'express';
import type { AppContainer } from '../container';

export const createDashboardRouter = (container: AppContainer): Router => {
  const router = Router();
  const { dashboardController, authenticate, adminOnly } = container;

  router.get('/', authenticate, adminOnly, dashboardController.getMetrics);

  return router;
};
