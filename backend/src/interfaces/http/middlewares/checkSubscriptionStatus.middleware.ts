// checkSubscriptionStatus — premium feature guard for CLIENT users
// Flow:
//   1. Skip ADMIN users (no subscription requirement for admins).
//   2. Load the user's active subscription via the repository port.
//   3. If none found → 403 (no active plan).
//   4. If found but expired (endDate passed) → delegate status update to
//      ExpireSubscriptionUseCase → 403 (subscription expired).
//   5. If valid → pass to next().
//
// Business logic lives in the domain entity (subscription.isExpired()) and
// the use case (ExpireSubscriptionUseCase). The middleware only orchestrates.

import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { ISubscriptionRepository } from '../../../domain/repositories/ISubscriptionRepository';
import type { ExpireSubscriptionUseCase } from '../../../application/use-cases/subscriptions/ExpireSubscriptionUseCase';
import { UserRole } from '../../../domain/enums';
import { subscriptionLogger } from '../../../infrastructure/logging/logger';
import { errorResponse } from '../helpers/apiResponse';

export const checkSubscriptionStatus = (
  subscriptionRepository: ISubscriptionRepository,
  expireSubscriptionUseCase: ExpireSubscriptionUseCase,
): RequestHandler =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId) {
        res.status(401).json(errorResponse('Authentication required'));
        return;
      }

      // ADMIN users bypass subscription checks
      if (userRole === UserRole.ADMIN) {
        next();
        return;
      }

      const subscription = await subscriptionRepository.findActiveByUserId(userId);

      if (!subscription) {
        subscriptionLogger.info('Access denied: no active subscription', { userId });
        res.status(403).json(
          errorResponse('No active subscription found. Please subscribe to access premium features.'),
        );
        return;
      }

      if (subscription.isExpired()) {
        subscriptionLogger.warn('Subscription expired — marking and denying access', {
          userId,
          subscriptionId: subscription.id,
          endDate: subscription.endDate.toISOString(),
        });

        await expireSubscriptionUseCase.execute(subscription.id);

        res.status(403).json(
          errorResponse('Your subscription has expired. Please renew to access premium features.'),
        );
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
