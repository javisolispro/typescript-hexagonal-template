import { describe, it, expect } from 'vitest';
import { CheckHealthUseCase } from '../../../../../src/core/application/health/CheckHealthUseCase.js';
import type { LoggerPort, LogContext } from '../../../../../src/core/ports/LoggerPort.js';

class FakeLogger implements LoggerPort {
  readonly calls: Array<{
    level: 'info' | 'warn' | 'error' | 'debug';
    message: string;
    context?: LogContext;
  }> = [];

  info(message: string, context?: LogContext): void {
    this.calls.push({ level: 'info', message, context });
  }
  warn(message: string, context?: LogContext): void {
    this.calls.push({ level: 'warn', message, context });
  }
  error(message: string, context?: LogContext): void {
    this.calls.push({ level: 'error', message, context });
  }
  debug(message: string, context?: LogContext): void {
    this.calls.push({ level: 'debug', message, context });
  }
}

describe('CheckHealthUseCase', () => {
  it('returns an "ok" HealthStatus with a valid timestamp and non-negative uptime', () => {
    const logger = new FakeLogger();
    const sut = new CheckHealthUseCase(logger);

    const result = sut.execute();

    expect(result.status).toBe('ok');
    expect(result.timestamp).toBeInstanceOf(Date);
    expect(Number.isNaN(result.timestamp.getTime())).toBe(false);
    expect(result.uptimeSeconds).toBeGreaterThanOrEqual(0);
  });

  it('logs an info message each time it is executed', () => {
    const logger = new FakeLogger();
    const sut = new CheckHealthUseCase(logger);

    sut.execute();

    expect(logger.calls).toHaveLength(1);
    expect(logger.calls[0]).toMatchObject({
      level: 'info',
      message: 'health check requested',
    });
  });
});
