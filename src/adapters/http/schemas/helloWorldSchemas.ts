import { z } from 'zod';
import { openApiRegistry } from '../openapi/registry.js';

export const HelloWorldResponseSchema = z
  .object({
    message: z.string().openapi({ example: 'Hello, World!' }),
  })
  .openapi('HelloWorldResponse');

export type HelloWorldResponse = z.infer<typeof HelloWorldResponseSchema>;

openApiRegistry.registerPath({
  method: 'get',
  path: '/hello-world',
  summary: 'Get Hello World message',
  description: 'Returns the Hello World message.',
  tags: ['hello-world'],
  responses: {
    200: {
      description: 'Returns the Hello World message.',
      content: {
        'application/json': { schema: HelloWorldResponseSchema },
      },
    },
  },
});
