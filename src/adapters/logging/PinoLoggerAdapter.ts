import { pino, type Logger as PinoLogger, type DestinationStream } from 'pino';
import type { LogContext, LoggerPort } from '../../core/ports/LoggerPort.js';

export interface PinoLoggerOptions {
  readonly level: 'silent' | 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  readonly pretty?: boolean;
  readonly destination?: DestinationStream;
}

export class PinoLoggerAdapter implements LoggerPort {
  private readonly logger: PinoLogger;

  constructor(options: PinoLoggerOptions) {
    const transport =
      options.pretty && !options.destination
        ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:standard' } }
        : undefined;

    this.logger = pino(
      { level: options.level, ...(transport ? { transport } : {}) },
      options.destination,
    );
  }

  info(message: string, context?: LogContext): void {
    this.logger.info(context ?? {}, message);
  }
  warn(message: string, context?: LogContext): void {
    this.logger.warn(context ?? {}, message);
  }
  error(message: string, context?: LogContext): void {
    this.logger.error(context ?? {}, message);
  }
  debug(message: string, context?: LogContext): void {
    this.logger.debug(context ?? {}, message);
  }
}
