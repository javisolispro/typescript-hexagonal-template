import { describe, it, expect } from 'vitest';
import { HealthStatus } from '../../../../../src/core/domain/health/HealthStatus.js';

describe('HealthStatus', () => {
  it('exposes status, timestamp, and uptimeSeconds', () => {
    const now = new Date('2026-04-20T12:00:00.000Z');
    const status = new HealthStatus('ok', now, 42.5);

    expect(status.status).toBe('ok');
    expect(status.timestamp).toEqual(now);
    expect(status.uptimeSeconds).toBe(42.5);
  });

  it('rejects negative uptime', () => {
    expect(() => new HealthStatus('ok', new Date(), -1)).toThrow(
      'uptimeSeconds must be non-negative',
    );
  });

  it('rejects an invalid status string', () => {
    expect(() => new HealthStatus('bogus' as never, new Date(), 0)).toThrow();
  });

  it('is a read-only value object', () => {
    const status = new HealthStatus('ok', new Date(), 0);
    expect(() => {
      (status as unknown as { status: string }).status = 'mutated';
    }).toThrow();
  });
});
