// Subscription domain errors

import { DomainError } from './DomainError';

export class SubscriptionNotFoundError extends DomainError {
  constructor(identifier?: string) {
    super(
      identifier ? `Subscription not found: ${identifier}` : 'Subscription not found',
      404,
    );
  }
}

export class ActiveSubscriptionExistsError extends DomainError {
  constructor(userId: string) {
    super(
      `User '${userId}' already has an active subscription. Cancel or wait for it to expire before creating a new one.`,
      422,
    );
  }
}

export class SubscriptionExpiredError extends DomainError {
  constructor() {
    super(
      'Your subscription has expired. Please renew to access premium features.',
      403,
    );
  }
}

export class SubscriptionNotActiveError extends DomainError {
  constructor() {
    super('Subscription is not active', 422);
  }
}
