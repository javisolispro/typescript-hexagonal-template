import { z } from 'zod';
import { openApiRegistry } from '../openapi/registry.js';

export const HealthResponseSchema = z
  .object({
    status: z.literal('ok').openapi({ example: 'ok' }),
    timestamp: z.iso.datetime().openapi({ example: '2026-04-20T12:00:00.000Z' }),
    uptimeSeconds: z.number().nonnegative().openapi({ example: 12.34 }),
  })
  .openapi('HealthResponse');

export type HealthResponse = z.infer<typeof HealthResponseSchema>;

openApiRegistry.registerPath({
  method: 'get',
  path: '/health',
  summary: 'Liveness probe',
  description: 'Returns the current health status of the service.',
  tags: ['health'],
  responses: {
    200: {
      description: 'Service is healthy.',
      content: {
        'application/json': { schema: HealthResponseSchema },
      },
    },
  },
});
