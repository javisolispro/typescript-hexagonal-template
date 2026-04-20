import type { Server } from 'node:http';
import express, { type Application, type Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import type { LoggerPort } from '../../core/ports/LoggerPort.js';
import { createErrorHandler } from './middleware/errorHandler.js';

export interface HttpServerOptions {
  readonly routers: ReadonlyArray<Router>;
  readonly logger: LoggerPort;
  /** OpenAPI document — any JSON-serializable object. Validated by swagger-ui at render time. */
  readonly openApiDoc: object;
}

export class HttpServer {
  private readonly app: Application;
  private readonly logger: LoggerPort;
  private server: Server | undefined;

  constructor(options: HttpServerOptions) {
    this.logger = options.logger;
    this.app = express();
    this.app.disable('x-powered-by');
    this.app.use(express.json());
    this.app.use((req, _res, next) => {
      this.logger.info('http request', { method: req.method, path: req.path });
      next();
    });

    for (const router of options.routers) {
      this.app.use(router);
    }

    this.app.get('/openapi.json', (_req, res) => {
      res.status(200).json(options.openApiDoc);
    });
    this.app.use(
      '/docs',
      swaggerUi.serve,
      swaggerUi.setup(options.openApiDoc as Parameters<typeof swaggerUi.setup>[0]),
    );

    this.app.use(createErrorHandler({ logger: this.logger }));
  }

  /** Read-only access to the underlying Express application. Exposed for integration tests. */
  get expressApp(): Application {
    return this.app;
  }

  async start(port: number): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      this.server = this.app.listen(port, () => {
        this.logger.info('http server listening', { port });
        resolve();
      });
      this.server.once('error', reject);
    });
  }

  async stop(): Promise<void> {
    if (!this.server) return;
    await new Promise<void>((resolve, reject) => {
      this.server?.close((err) => (err ? reject(err) : resolve()));
    });
    this.server = undefined;
  }
}
