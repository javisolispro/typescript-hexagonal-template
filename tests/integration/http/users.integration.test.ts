import type { Application } from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { buildContainer } from '../../../src/composition/container.js';

const reqresBody = {
  page: 1,
  per_page: 6,
  total: 12,
  total_pages: 2,
  data: [
    {
      id: 1,
      email: 'george.bluth@reqres.in',
      first_name: 'George',
      last_name: 'Bluth',
      avatar: 'https://reqres.in/img/faces/1-image.jpg',
    },
    {
      id: 2,
      email: 'janet.weaver@reqres.in',
      first_name: 'Janet',
      last_name: 'Weaver',
      avatar: 'https://reqres.in/img/faces/2-image.jpg',
    },
  ],
  support: { url: 'x', text: 'y' },
};

function okFetch(body: unknown): typeof fetch {
  return async () => new Response(JSON.stringify(body), { status: 200 });
}

function statusFetch(status: number): typeof fetch {
  return async () => new Response('upstream failure', { status });
}

function buildApp(fetchImpl: typeof fetch): Application {
  const { httpServer } = buildContainer(
    {
      NODE_ENV: 'test',
      PORT: 0,
      LOG_LEVEL: 'silent',
      REQRES_BASE_URL: 'https://reqres.in',
      REQRES_API_KEY: 'test-key',
    },
    { fetch: fetchImpl },
  );
  return httpServer.expressApp;
}

describe('integration: GET /users (wired through real container)', () => {
  it('returns a 200 with our camelCase response shape', async () => {
    const app = buildApp(okFetch(reqresBody));

    const res = await request(app).get('/users');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      users: [
        {
          id: 1,
          email: 'george.bluth@reqres.in',
          firstName: 'George',
          lastName: 'Bluth',
          avatarUrl: 'https://reqres.in/img/faces/1-image.jpg',
        },
        {
          id: 2,
          email: 'janet.weaver@reqres.in',
          firstName: 'Janet',
          lastName: 'Weaver',
          avatarUrl: 'https://reqres.in/img/faces/2-image.jpg',
        },
      ],
    });
  });

  it('returns a 500 when the upstream responds non-2xx', async () => {
    const app = buildApp(statusFetch(502));

    const res = await request(app).get('/users');

    expect(res.status).toBe(500);
    expect(res.body).toMatchObject({ error: 'InternalServerError' });
  });

  it('exposes /users in the OpenAPI document', async () => {
    const app = buildApp(okFetch(reqresBody));

    const res = await request(app).get('/openapi.json');

    expect(res.status).toBe(200);
    expect(res.body.paths['/users']).toBeDefined();
    expect(res.body.components.schemas.ListUsersResponse).toBeDefined();
    expect(res.body.components.schemas.User).toBeDefined();
  });
});
