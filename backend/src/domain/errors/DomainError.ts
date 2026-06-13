// DomainError — Base error class for all domain-level errors
// SRP: carries only identity (name), message, and HTTP status code.
// All domain errors extend this class; infrastructure and interfaces map it to HTTP responses.

export abstract class DomainError extends Error {
  constructor(
    public override readonly message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = this.constructor.name;
    // Restore prototype chain (required when targeting ES5/CommonJS via TypeScript)
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
