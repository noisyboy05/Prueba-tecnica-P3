// AuthController — thin HTTP adapter for auth use cases
// Responsibilities: parse request → call use case → return response
// Zero business logic here.

import type { Request, Response, NextFunction } from 'express';
import type { LoginUseCase } from '../../../application/use-cases/auth/LoginUseCase';
import type { RegisterUseCase } from '../../../application/use-cases/auth/RegisterUseCase';
import { LoginRequestSchema } from '../../../application/dtos/auth/LoginRequestDto';
import { RegisterRequestSchema } from '../../../application/dtos/auth/RegisterRequestDto';
import { successResponse } from '../helpers/apiResponse';
import { authLogger } from '../../../infrastructure/logging/logger';

export class AuthController {
  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly registerUseCase: RegisterUseCase,
  ) {}

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = LoginRequestSchema.parse(req.body);
      const result = await this.loginUseCase.execute(dto);
      authLogger.info('User logged in', { userId: result.user.id, role: result.user.role });
      res.status(200).json(successResponse(result));
    } catch (error) {
      next(error);
    }
  };

  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = RegisterRequestSchema.parse(req.body);
      const result = await this.registerUseCase.execute(dto);
      authLogger.info('New user registered', { userId: result.user.id });
      res.status(201).json(successResponse(result));
    } catch (error) {
      next(error);
    }
  };
}
