// PlansController — thin HTTP adapter for plan use cases

import type { Request, Response, NextFunction } from 'express';
import type { CreatePlanUseCase } from '../../../application/use-cases/plans/CreatePlanUseCase';
import type { UpdatePlanUseCase } from '../../../application/use-cases/plans/UpdatePlanUseCase';
import type { DeletePlanUseCase } from '../../../application/use-cases/plans/DeletePlanUseCase';
import type { GetAllPlansUseCase } from '../../../application/use-cases/plans/GetAllPlansUseCase';
import type { GetPlanByIdUseCase } from '../../../application/use-cases/plans/GetPlanByIdUseCase';
import { CreatePlanSchema } from '../../../application/dtos/plans/CreatePlanDto';
import { UpdatePlanSchema } from '../../../application/dtos/plans/UpdatePlanDto';
import { successResponse } from '../helpers/apiResponse';

export class PlansController {
  constructor(
    private readonly createPlanUseCase: CreatePlanUseCase,
    private readonly updatePlanUseCase: UpdatePlanUseCase,
    private readonly deletePlanUseCase: DeletePlanUseCase,
    private readonly getAllPlansUseCase: GetAllPlansUseCase,
    private readonly getPlanByIdUseCase: GetPlanByIdUseCase,
  ) {}

  getAll = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const plans = await this.getAllPlansUseCase.execute();
      res.status(200).json(successResponse(plans));
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const plan = await this.getPlanByIdUseCase.execute(req.params['id'] ?? '');
      res.status(200).json(successResponse(plan));
    } catch (error) {
      next(error);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = CreatePlanSchema.parse(req.body);
      const plan = await this.createPlanUseCase.execute(dto);
      res.status(201).json(successResponse(plan));
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = UpdatePlanSchema.parse(req.body);
      const plan = await this.updatePlanUseCase.execute(req.params['id'] ?? '', dto);
      res.status(200).json(successResponse(plan));
    } catch (error) {
      next(error);
    }
  };

  remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.deletePlanUseCase.execute(req.params['id'] ?? '');
      res.status(200).json(successResponse({ message: 'Plan deleted successfully' }));
    } catch (error) {
      next(error);
    }
  };
}
