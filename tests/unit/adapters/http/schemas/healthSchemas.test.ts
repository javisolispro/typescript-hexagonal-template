import { describe, it, expect } from 'vitest';
import { HealthResponseSchema } from '../../../../../src/adapters/http/schemas/healthSchemas.js';

describe('HealthResponseSchema', () => {
  it('accepts a well-formed health payload', () => {
    const parsed = HealthResponseSchema.parse({
      status: 'ok',
      timestamp: '2026-04-20T12:00:00.000Z',
      uptimeSeconds: 12.5,
    });

    expect(parsed.status).toBe('ok');
    expect(parsed.uptimeSeconds).toBe(12.5);
  });

  it('rejects a missing status', () => {
    expect(() =>
      HealthResponseSchema.parse({ timestamp: '2026-04-20T12:00:00.000Z', uptimeSeconds: 0 }),
    ).toThrow();
  });

  it('rejects an invalid status value', () => {
    expect(() =>
      HealthResponseSchema.parse({
        status: 'down',
        timestamp: '2026-04-20T12:00:00.000Z',
        uptimeSeconds: 0,
      }),
    ).toThrow();
  });

  it('rejects a non-ISO timestamp', () => {
    expect(() =>
      HealthResponseSchema.parse({ status: 'ok', timestamp: 'yesterday', uptimeSeconds: 0 }),
    ).toThrow();
  });

  it('rejects negative uptime', () => {
    expect(() =>
      HealthResponseSchema.parse({
        status: 'ok',
        timestamp: '2026-04-20T12:00:00.000Z',
        uptimeSeconds: -1,
      }),
    ).toThrow();
  });
});
