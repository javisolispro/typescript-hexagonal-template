import { HealthController } from '../adapters/http/controllers/HealthController.js';
import { HelloWorldController } from '../adapters/http/controllers/HelloWorldController.js';
import { UsersController } from '../adapters/http/controllers/UsersController.js';
import { HttpServer } from '../adapters/http/HttpServer.js';
import { buildOpenApiDocument } from '../adapters/http/openapi/openApiDocument.js';
import { createHealthRouter } from '../adapters/http/routes/healthRoutes.js';
import { createHelloWorldRouter } from '../adapters/http/routes/helloWorldRoutes.js';
import { createUsersRouter } from '../adapters/http/routes/usersRoutes.js';
import { ReqresUserRepository } from '../adapters/http-clients/ReqresUserRepository.js';
import { PinoLoggerAdapter } from '../adapters/logging/PinoLoggerAdapter.js';
import type { Env } from '../config/env.js';
import { CheckHealthUseCase } from '../core/application/health/CheckHealthUseCase.js';
import { HelloWorldUseCase } from '../core/application/hello-world/HelloWorldUseCase.js';
import { ListUsersUseCase } from '../core/application/users/ListUsersUseCase.js';
// Importing the schemas module registers OpenAPI paths as a side effect.
// (helloWorldSchemas is imported transitively by HelloWorldController; the
// healthSchemas and usersSchemas paths are registered here to match the
// existing "explicit side-effect import" convention for health.)
import '../adapters/http/schemas/healthSchemas.js';
import '../adapters/http/schemas/usersSchemas.js';

export interface Container {
  readonly httpServer: HttpServer;
}

export interface ContainerOverrides {
  readonly fetch?: typeof fetch;
}

export function buildContainer(env: Env, overrides?: ContainerOverrides): Container {
  const logger = new PinoLoggerAdapter({
    level: env.LOG_LEVEL,
    pretty: env.NODE_ENV !== 'production',
  });

  const checkHealth = new CheckHealthUseCase(logger);
  const helloWorldUseCase = new HelloWorldUseCase(logger);
  const userRepository = new ReqresUserRepository(
    {
      baseUrl: env.REQRES_BASE_URL,
      apiKey: env.REQRES_API_KEY,
      ...(overrides?.fetch ? { fetch: overrides.fetch } : {}),
    },
    logger,
  );
  const listUsers = new ListUsersUseCase(userRepository, logger);

  const healthController = new HealthController(checkHealth);
  const helloWorldController = new HelloWorldController(helloWorldUseCase);
  const usersController = new UsersController(listUsers);

  const healthRouter = createHealthRouter(healthController);
  const helloWorldRouter = createHelloWorldRouter(helloWorldController);
  const usersRouter = createUsersRouter(usersController);

  const openApiDoc = buildOpenApiDocument();

  const httpServer = new HttpServer({
    routers: [healthRouter, helloWorldRouter, usersRouter],
    logger,
    openApiDoc,
  });

  return { httpServer };
}
