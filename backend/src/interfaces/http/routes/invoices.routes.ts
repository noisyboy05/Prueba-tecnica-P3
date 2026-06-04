import { Router } from 'express';
import type { AppContainer } from '../container';

export const createInvoicesRouter = (container: AppContainer): Router => {
  const router = Router();
  const { invoicesController, authenticate, adminOnly, clientOnly, checkSubscription } = container;

  // ADMIN: view all invoices
  router.get('/', authenticate, adminOnly, invoicesController.getAll);

  // CLIENT: view own invoices — gated by checkSubscription (premium feature)
  router.get('/me', authenticate, clientOnly, checkSubscription, invoicesController.getMine);

  // CLIENT: pay an invoice — intentionally NOT gated by checkSubscription:
  // a CLIENT with an expired subscription must still be able to pay outstanding invoices.
  router.patch('/:id/pay', authenticate, clientOnly, invoicesController.pay);

  return router;
};
