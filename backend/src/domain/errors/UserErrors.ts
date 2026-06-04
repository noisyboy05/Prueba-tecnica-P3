// User domain errors

import { DomainError } from './DomainError';

export class UserNotFoundError extends DomainError {
  constructor(identifier?: string) {
    super(
      identifier ? `User not found: ${identifier}` : 'User not found',
      404,
    );
  }
}

export class UserAlreadyExistsError extends DomainError {
  constructor(email: string) {
    super(`A user with email '${email}' already exists`, 409);
  }
}
