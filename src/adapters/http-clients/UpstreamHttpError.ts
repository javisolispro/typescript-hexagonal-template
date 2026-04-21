export class UpstreamHttpError extends Error {
  readonly status: number | undefined;

  constructor(message: string, status?: number, cause?: unknown) {
    super(message, cause !== undefined ? { cause } : undefined);
    this.name = 'UpstreamHttpError';
    this.status = status;
  }
}
