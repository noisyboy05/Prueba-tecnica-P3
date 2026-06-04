import { Router } from 'express';
import type { AppContainer } from '../container';

export const createSubscriptionsRouter = (container: AppContainer): Router => {
  const router = Router();
  const { subscriptionsController, authenticate, adminOnly, clientOnly } = container;

  // ADMIN: full CRUD on subscriptions
  router.post('/',             authenticate, adminOnly, subscriptionsController.create);
  router.get('/',              authenticate, adminOnly, subscriptionsController.getAll);
  router.put('/:id',           authenticate, adminOnly, subscriptionsController.update);
  router.patch('/:id/cancel',  authenticate, adminOnly, subscriptionsController.cancel);

  // CLIENT: read-only own subscription (no subscription check — visible even when expired)
  router.get('/me', authenticate, clientOnly, subscriptionsController.getMySubscription);

  return router;
};
