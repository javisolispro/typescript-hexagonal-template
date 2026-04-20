import type { NextFunction, Request, Response } from 'express';
import { describe, expect, it } from 'vitest';
import { HealthController } from '../../../../../src/adapters/http/controllers/HealthController.js';
import { CheckHealthUseCase } from '../../../../../src/core/application/health/CheckHealthUseCase.js';
import { HealthStatus } from '../../../../../src/core/domain/health/HealthStatus.js';
import type { LoggerPort } from '../../../../../src/core/ports/LoggerPort.js';

class SilentLogger implements LoggerPort {
  info() {}
  warn() {}
  error() {}
  debug() {}
}

class StubUseCase extends CheckHealthUseCase {
  constructor(private readonly result: HealthStatus) {
    super(new SilentLogger());
  }
  override execute(): HealthStatus {
    return this.result;
  }
}

function makeRes() {
  const res: Partial<Response> & { _status?: number; _json?: unknown } = {};
  res.status = (code: number) => {
    res._status = code;
    return res as Response;
  };
  res.json = (body: unknown) => {
    res._json = body;
    return res as Response;
  };
  return res as Response & { _status?: number; _json?: unknown };
}

describe('HealthController.handleGetHealth', () => {
  it('responds 200 with the serialized HealthStatus', () => {
    const fixed = new HealthStatus('ok', new Date('2026-04-20T12:00:00.000Z'), 7.25);
    const controller = new HealthController(new StubUseCase(fixed));
    const res = makeRes();
    const next: NextFunction = () => {
      throw new Error('next should not be called');
    };

    controller.handleGetHealth({} as Request, res, next);

    expect(res._status).toBe(200);
    expect(res._json).toEqual({
      status: 'ok',
      timestamp: '2026-04-20T12:00:00.000Z',
      uptimeSeconds: 7.25,
    });
  });

  it('calls next(err) when the use case throws', () => {
    const logger = new SilentLogger();
    class ThrowingUseCase extends CheckHealthUseCase {
      constructor() {
        super(logger);
      }
      override execute(): HealthStatus {
        throw new Error('boom');
      }
    }
    const controller = new HealthController(new ThrowingUseCase());
    const res = makeRes();
    let forwarded: unknown;
    const next: NextFunction = (err?: unknown) => {
      forwarded = err;
    };

    controller.handleGetHealth({} as Request, res, next);

    expect(forwarded).toBeInstanceOf(Error);
    expect((forwarded as Error).message).toBe('boom');
  });
});
