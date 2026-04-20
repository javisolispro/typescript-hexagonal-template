import type { Application } from 'express';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildContainer } from '../../../src/composition/container.js';

describe('integration: GET /health (wired through real container)', () => {
  let app: Application;

  beforeAll(() => {
    const { httpServer } = buildContainer({
      NODE_ENV: 'test',
      PORT: 0,
      LOG_LEVEL: 'silent',
    });
    app = httpServer.expressApp;
  });

  it('responds 200 with a valid HealthResponse payload', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      status: 'ok',
      uptimeSeconds: expect.any(Number),
    });
    expect(typeof res.body.timestamp).toBe('string');
    expect(Number.isNaN(new Date(res.body.timestamp).getTime())).toBe(false);
    expect(res.body.uptimeSeconds).toBeGreaterThanOrEqual(0);
  });

  it('serves the OpenAPI document at /openapi.json with the /health path registered', async () => {
    const res = await request(app).get('/openapi.json');

    expect(res.status).toBe(200);
    expect(res.body.openapi).toMatch(/^3\./);
    expect(res.body.paths['/health']).toBeDefined();
    expect(res.body.components.schemas.HealthResponse).toBeDefined();
  });

  it('returns a 404 for an unknown path', async () => {
    const res = await request(app).get('/does-not-exist');
    expect(res.status).toBe(404);
  });
});
