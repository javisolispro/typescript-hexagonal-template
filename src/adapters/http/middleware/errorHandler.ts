import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { DomainError } from '../../../core/domain/errors/DomainError.js';
import type { LoggerPort } from '../../../core/ports/LoggerPort.js';

export interface ErrorHandlerOptions {
  readonly logger: LoggerPort;
  readonly domainErrorStatus?: Readonly<Record<string, number>>;
}

export function createErrorHandler(options: ErrorHandlerOptions): ErrorRequestHandler {
  const mapping = options.domainErrorStatus ?? {};
  const { logger } = options;

  return (err, req, res, _next) => {
    if (err instanceof ZodError) {
      logger.warn('request validation failed', {
        path: req.path,
        issues: err.issues,
      });
      res.status(400).json({
        error: 'ValidationError',
        issues: err.issues.map((i) => ({ path: i.path, message: i.message })),
      });
      return;
    }

    if (err instanceof DomainError) {
      const status = mapping[err.code] ?? 400;
      logger.warn('domain error', { code: err.code, message: err.message, path: req.path });
      res.status(status).json({ error: err.code, message: err.message });
      return;
    }

    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    logger.error('unhandled error', { path: req.path, message, stack });
    res.status(500).json({ error: 'InternalServerError', message: 'Unexpected error' });
  };
}
