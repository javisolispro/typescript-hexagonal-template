import { PinoLoggerAdapter } from './adapters/logging/PinoLoggerAdapter.js';
import { buildContainer } from './composition/container.js';
import { loadEnvOrExit } from './config/env.js';

async function bootstrap(): Promise<void> {
  const env = loadEnvOrExit();
  const { httpServer } = buildContainer(env);

  const processLogger = new PinoLoggerAdapter({
    level: env.LOG_LEVEL,
    pretty: env.NODE_ENV !== 'production',
  });

  const shutdown = async (signal: string): Promise<void> => {
    processLogger.info('shutdown signal received', { signal });
    try {
      await httpServer.stop();
      processLogger.info('http server stopped cleanly');
      process.exit(0);
    } catch (err) {
      processLogger.error('error during shutdown', {
        message: err instanceof Error ? err.message : String(err),
      });
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    processLogger.error('unhandledRejection', {
      reason: reason instanceof Error ? reason.message : String(reason),
    });
    process.exit(1);
  });
  process.on('uncaughtException', (err) => {
    processLogger.error('uncaughtException', { message: err.message, stack: err.stack });
    process.exit(1);
  });

  await httpServer.start(env.PORT);
}

bootstrap().catch((err) => {
  console.error('Failed to bootstrap:', err);
  process.exit(1);
});
