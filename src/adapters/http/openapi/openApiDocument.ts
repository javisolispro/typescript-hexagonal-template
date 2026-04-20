import { OpenApiGeneratorV3, type OpenAPIObjectConfig } from '@asteasolutions/zod-to-openapi';
import { openApiRegistry } from './registry.js';

export interface OpenApiDocumentOptions {
  readonly title?: string;
  readonly version?: string;
  readonly description?: string;
}

export function buildOpenApiDocument(options: OpenApiDocumentOptions = {}) {
  const generator = new OpenApiGeneratorV3(openApiRegistry.definitions);
  const config: OpenAPIObjectConfig = {
    openapi: '3.0.3',
    info: {
      title: options.title ?? 'TypeScript Hexagonal Template API',
      version: options.version ?? '0.1.0',
      description:
        options.description ?? 'Example API generated from Zod schemas via zod-to-openapi.',
    },
  };
  return generator.generateDocument(config);
}
