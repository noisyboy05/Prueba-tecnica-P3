import { Router } from 'express';
import type { AppContainer } from '../container';

export const createPlansRouter = (container: AppContainer): Router => {
  const router = Router();
  const { plansController, authenticate, adminOnly } = container;

  // Accessible to all authenticated users (ADMIN and CLIENT can browse plans)
  router.get('/', authenticate, plansController.getAll);
  router.get('/:id', authenticate, plansController.getById);

  // ADMIN only
  router.post('/', authenticate, adminOnly, plansController.create);
  router.put('/:id', authenticate, adminOnly, plansController.update);
  router.delete('/:id', authenticate, adminOnly, plansController.remove);

  return router;
};
