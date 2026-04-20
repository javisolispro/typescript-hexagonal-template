export type HealthStatusCode = 'ok';

const VALID_CODES: ReadonlySet<HealthStatusCode> = new Set(['ok']);

export class HealthStatus {
  readonly status: HealthStatusCode;
  readonly timestamp: Date;
  readonly uptimeSeconds: number;

  constructor(status: HealthStatusCode, timestamp: Date, uptimeSeconds: number) {
    if (!VALID_CODES.has(status)) {
      throw new Error(`Invalid HealthStatus code: ${status}`);
    }
    if (uptimeSeconds < 0) {
      throw new Error('uptimeSeconds must be non-negative');
    }

    this.status = status;
    this.timestamp = timestamp;
    this.uptimeSeconds = uptimeSeconds;

    Object.freeze(this);
  }
}
