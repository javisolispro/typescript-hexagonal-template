import { HealthController } from '../adapters/http/controllers/HealthController.js';
import { HttpServer } from '../adapters/http/HttpServer.js';
import { buildOpenApiDocument } from '../adapters/http/openapi/openApiDocument.js';
import { createHealthRouter } from '../adapters/http/routes/healthRoutes.js';
import { PinoLoggerAdapter } from '../adapters/logging/PinoLoggerAdapter.js';
import type { Env } from '../config/env.js';
import { CheckHealthUseCase } from '../core/application/health/CheckHealthUseCase.js';
// Importing the schemas module registers OpenAPI paths as a side effect.
import '../adapters/http/schemas/healthSchemas.js';

export interface Container {
  readonly httpServer: HttpServer;
}

export function buildContainer(env: Env): Container {
  const logger = new PinoLoggerAdapter({
    level: env.LOG_LEVEL,
    pretty: env.NODE_ENV !== 'production',
  });

  const checkHealth = new CheckHealthUseCase(logger);
  const healthController = new HealthController(checkHealth);
  const healthRouter = createHealthRouter(healthController);

  const openApiDoc = buildOpenApiDocument();

  const httpServer = new HttpServer({
    routers: [healthRouter],
    logger,
    openApiDoc,
  });

  return { httpServer };
}
