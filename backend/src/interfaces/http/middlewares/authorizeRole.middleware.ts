// authorizeRole — role-based access control middleware factory
// Returns a RequestHandler that allows only the specified roles.
// Must run after authenticateJWT (depends on req.user being set).
// Usage:
//   authorizeRole(UserRole.ADMIN)          → only ADMIN
//   authorizeRole(UserRole.CLIENT)         → only CLIENT
//   authorizeRole(UserRole.ADMIN, UserRole.CLIENT) → both

import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { UserRole } from '../../../domain/enums';
import { ForbiddenError, UnauthorizedError } from '../../../domain/errors/AuthErrors';
import { errorResponse } from '../helpers/apiResponse';

export const authorizeRole = (...allowedRoles: UserRole[]): RequestHandler =>
  (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json(errorResponse(new UnauthorizedError().message));
      return;
    }

    if (!allowedRoles.includes(req.user.role as UserRole)) {
      res.status(403).json(errorResponse(new ForbiddenError().message));
      return;
    }

    next();
  };
