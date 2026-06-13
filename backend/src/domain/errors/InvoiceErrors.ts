// Invoice domain errors

import { DomainError } from './DomainError';

export class InvoiceNotFoundError extends DomainError {
  constructor(identifier?: string) {
    super(
      identifier ? `Invoice not found: ${identifier}` : 'Invoice not found',
      404,
    );
  }
}

export class InvoiceAlreadyPaidError extends DomainError {
  constructor(invoiceId: string) {
    super(`Invoice '${invoiceId}' has already been paid`, 422);
  }
}

export class InvoiceNotPayableError extends DomainError {
  constructor(status: string) {
    super(`Invoice with status '${status}' cannot be paid`, 422);
  }
}
