import { describe, it, expect } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import { createErrorHandler } from '../../../../../src/adapters/http/middleware/errorHandler.js';
import { DomainError } from '../../../../../src/core/domain/errors/DomainError.js';
import type { LoggerPort } from '../../../../../src/core/ports/LoggerPort.js';

class RecordingLogger implements LoggerPort {
  readonly calls: Array<{ level: string; message: string }> = [];
  info(m: string) { this.calls.push({ level: 'info', message: m }); }
  warn(m: string) { this.calls.push({ level: 'warn', message: m }); }
  error(m: string) { this.calls.push({ level: 'error', message: m }); }
  debug(m: string) { this.calls.push({ level: 'debug', message: m }); }
}

class NotFoundError extends DomainError {
  readonly code = 'NotFound';
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

function makeReq(): Request {
  return { path: '/test', method: 'GET' } as Request;
}

function makeZodError(): ZodError {
  try {
    z.object({ name: z.string() }).parse({});
    throw new Error('expected schema to throw');
  } catch (e) {
    if (e instanceof ZodError) return e;
    throw e;
  }
}

const NOOP_NEXT: NextFunction = () => {};

describe('errorHandler', () => {
  it('maps ZodError to 400', () => {
    const logger = new RecordingLogger();
    const handler = createErrorHandler({ logger });
    const res = makeRes();

    handler(makeZodError(), makeReq(), res, NOOP_NEXT);

    expect(res._status).toBe(400);
    expect(res._json).toMatchObject({ error: 'ValidationError' });
    expect(logger.calls.at(-1)?.level).toBe('warn');
  });

  it('maps a mapped DomainError to its status', () => {
    const logger = new RecordingLogger();
    const handler = createErrorHandler({
      logger,
      domainErrorStatus: { NotFound: 404 },
    });
    const res = makeRes();

    handler(new NotFoundError('widget missing'), makeReq(), res, NOOP_NEXT);

    expect(res._status).toBe(404);
    expect(res._json).toMatchObject({ error: 'NotFound', message: 'widget missing' });
    expect(logger.calls.at(-1)?.level).toBe('warn');
  });

  it('maps an unknown error to 500 and logs at error level without leaking the stack', () => {
    const logger = new RecordingLogger();
    const handler = createErrorHandler({ logger });
    const res = makeRes();

    handler(new Error('db exploded'), makeReq(), res, NOOP_NEXT);

    expect(res._status).toBe(500);
    expect(res._json).toEqual({ error: 'InternalServerError', message: 'Unexpected error' });
    expect(logger.calls.at(-1)?.level).toBe('error');
  });
});
