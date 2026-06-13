// globalErrorHandler — FASE 11: maps all thrown errors to standard HTTP responses
// Mapping order:
//   1. DomainError  → statusCode from error + { success: false, message }
//   2. ZodError     → 400 + { success: false, message, errors: fieldErrors }
//   3. Unknown      → 500 (stack logged, details hidden from client)
//
// This middleware must be registered LAST in the Express middleware chain.

import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { DomainError } from '../../../domain/errors/DomainError';
import { logger } from '../../../infrastructure/logging/logger';
import { errorResponse } from '../helpers/apiResponse';

export const globalErrorHandler = (
  error: Error,
  _req: Request,
  res: Response,
  // Express requires 4 params for error handlers even if next is unused
  _next: NextFunction,
): void => {
  if (error instanceof DomainError) {
    logger.warn('Domain error', {
      name: error.name,
      message: error.message,
      statusCode: error.statusCode,
    });
    res.status(error.statusCode).json(errorResponse(error.message));
    return;
  }

  if (error instanceof ZodError) {
    const fieldErrors = error.flatten().fieldErrors;
    logger.debug('Validation error', { errors: fieldErrors });
    res
      .status(400)
      .json(errorResponse('Validation error', fieldErrors as Record<string, string[] | undefined>));
    return;
  }

  logger.error('Unexpected server error', {
    message: error.message,
    stack: error.stack,
  });

  res.status(500).json(errorResponse('Internal server error'));
};
