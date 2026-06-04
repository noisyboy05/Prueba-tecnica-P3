import { Router } from 'express';
import type { AppContainer } from '../container';

export const createSubscriptionsRouter = (container: AppContainer): Router => {
  const router = Router();
  const { subscriptionsController, authenticate, adminOnly, clientOnly } = container;

  // ADMIN: create a subscription for a user, view all subscriptions
  router.post('/', authenticate, adminOnly, subscriptionsController.create);
  router.get('/', authenticate, adminOnly, subscriptionsController.getAll);

  // CLIENT: view own subscription (no subscription check — user can see it even when expired)
  router.get('/me', authenticate, clientOnly, subscriptionsController.getMySubscription);

  return router;
};
