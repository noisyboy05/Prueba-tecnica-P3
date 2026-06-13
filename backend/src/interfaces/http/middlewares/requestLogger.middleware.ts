// requestLogger — logs every HTTP request with method, path, status and duration.
// Uses the httpLogger context so logs can be filtered in production.

import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { httpLogger } from '../../../infrastructure/logging/logger';

export const requestLogger: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const start = Date.now();

  res.on('finish', () => {
    httpLogger.info(`${req.method} ${req.originalUrl}`, {
      statusCode: res.statusCode,
      duration: `${Date.now() - start}ms`,
      userId: req.user?.id ?? 'anonymous',
    });
  });

  next();
};
