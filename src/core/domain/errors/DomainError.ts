export abstract class DomainError extends Error {
  abstract readonly code: string;

  constructor(message: string, cause?: unknown) {
    super(message, cause !== undefined ? { cause } : undefined);
    this.name = this.constructor.name;
  }
}
