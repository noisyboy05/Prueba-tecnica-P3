// SubscriptionsController — thin HTTP adapter for subscription use cases

import type { Request, Response, NextFunction } from 'express';
import type { CreateSubscriptionUseCase } from '../../../application/use-cases/subscriptions/CreateSubscriptionUseCase';
import type { GetUserSubscriptionUseCase } from '../../../application/use-cases/subscriptions/GetUserSubscriptionUseCase';
import type { GetAllSubscriptionsUseCase } from '../../../application/use-cases/subscriptions/GetAllSubscriptionsUseCase';
import { CreateSubscriptionSchema } from '../../../application/dtos/subscriptions/CreateSubscriptionDto';
import { UnauthorizedError } from '../../../domain/errors/AuthErrors';
import { successResponse } from '../helpers/apiResponse';
import { subscriptionLogger } from '../../../infrastructure/logging/logger';

export class SubscriptionsController {
  constructor(
    private readonly createSubscriptionUseCase: CreateSubscriptionUseCase,
    private readonly getUserSubscriptionUseCase: GetUserSubscriptionUseCase,
    private readonly getAllSubscriptionsUseCase: GetAllSubscriptionsUseCase,
  ) {}

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = CreateSubscriptionSchema.parse(req.body);
      const subscription = await this.createSubscriptionUseCase.execute(dto);
      subscriptionLogger.info('Subscription created', {
        subscriptionId: subscription.id,
        userId: subscription.userId,
        planId: subscription.planId,
      });
      res.status(201).json(successResponse(subscription));
    } catch (error) {
      next(error);
    }
  };

  getAll = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const subscriptions = await this.getAllSubscriptionsUseCase.execute();
      res.status(200).json(successResponse(subscriptions));
    } catch (error) {
      next(error);
    }
  };

  getMySubscription = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) { next(new UnauthorizedError()); return; }

      const subscription = await this.getUserSubscriptionUseCase.execute(userId);
      res.status(200).json(successResponse(subscription));
    } catch (error) {
      next(error);
    }
  };
}
