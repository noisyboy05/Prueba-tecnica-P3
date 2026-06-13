// authenticateJWT — verifies the Bearer token and attaches the payload to req.user
// On any failure, a DomainError is forwarded to the global error handler.
// All subsequent middlewares and controllers can trust req.user is populated.

import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { ITokenService } from '../../../application/ports/ITokenService';
import { authLogger } from '../../../infrastructure/logging/logger';

export const authenticateJWT = (tokenService: ITokenService): RequestHandler =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      authLogger.debug('Missing or malformed Authorization header');
      next(new Error('Authentication required'));
      return;
    }

    const token = authHeader.substring(7);

    try {
      req.user = tokenService.verify(token);
      next();
    } catch (error) {
      // DomainErrors (TokenExpiredError, InvalidTokenError) are forwarded as-is
      authLogger.debug('JWT verification failed', { error: (error as Error).message });
      next(error);
    }
  };
