// Plan domain errors

import { DomainError } from './DomainError';

export class PlanNotFoundError extends DomainError {
  constructor(identifier?: string) {
    super(
      identifier ? `Plan not found: ${identifier}` : 'Plan not found',
      404,
    );
  }
}

export class PlanAlreadyExistsError extends DomainError {
  constructor(name: string) {
    super(`A plan with name '${name}' already exists`, 409);
  }
}

export class PlanInUseError extends DomainError {
  constructor(planId: string) {
    super(
      `Plan '${planId}' cannot be deleted because it has active subscriptions`,
      422,
    );
  }
}
