import { Router } from 'express';
import type { AppContainer } from '../container';

export const createAuthRouter = (container: AppContainer): Router => {
  const router = Router();
  const { authController } = container;

  router.post('/register', authController.register);
  router.post('/login', authController.login);

  return router;
};
