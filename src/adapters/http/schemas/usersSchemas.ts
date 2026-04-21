import { z } from 'zod';
import { openApiRegistry } from '../openapi/registry.js';

export const UserSchema = z
  .object({
    id: z.number().int().openapi({ example: 1 }),
    email: z.string().email().openapi({ example: 'george.bluth@reqres.in' }),
    firstName: z.string().openapi({ example: 'George' }),
    lastName: z.string().openapi({ example: 'Bluth' }),
    avatarUrl: z.string().url().openapi({ example: 'https://reqres.in/img/faces/1-image.jpg' }),
  })
  .openapi('User');

export const ListUsersResponseSchema = z
  .object({
    users: z.array(UserSchema),
  })
  .openapi('ListUsersResponse');

export type ListUsersResponse = z.infer<typeof ListUsersResponseSchema>;

openApiRegistry.registerPath({
  method: 'get',
  path: '/users',
  summary: 'List users',
  description: 'Returns users sourced from reqres.in via the ReqresUserRepository adapter.',
  tags: ['users'],
  responses: {
    200: {
      description: 'List of users.',
      content: {
        'application/json': { schema: ListUsersResponseSchema },
      },
    },
  },
});
