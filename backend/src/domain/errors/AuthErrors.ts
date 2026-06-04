// Authentication and authorization domain errors

import { DomainError } from './DomainError';

export class InvalidCredentialsError extends DomainError {
  constructor() {
    super('Invalid email or password', 401);
  }
}

export class UnauthorizedError extends DomainError {
  constructor(message = 'Authentication required') {
    super(message, 401);
  }
}

export class ForbiddenError extends DomainError {
  constructor(message = 'Insufficient permissions to perform this action') {
    super(message, 403);
  }
}

export class TokenExpiredError extends DomainError {
  constructor() {
    super('Authentication token has expired', 401);
  }
}

export class InvalidTokenError extends DomainError {
  constructor() {
    super('Authentication token is invalid', 401);
  }
}
