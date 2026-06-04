// DashboardController — thin HTTP adapter for dashboard metrics (ADMIN)

import type { Request, Response, NextFunction } from 'express';
import type { GetDashboardMetricsUseCase } from '../../../application/use-cases/dashboard/GetDashboardMetricsUseCase';
import { successResponse } from '../helpers/apiResponse';

export class DashboardController {
  constructor(private readonly getDashboardMetricsUseCase: GetDashboardMetricsUseCase) {}

  getMetrics = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const metrics = await this.getDashboardMetricsUseCase.execute();
      res.status(200).json(successResponse(metrics));
    } catch (error) {
      next(error);
    }
  };
}
