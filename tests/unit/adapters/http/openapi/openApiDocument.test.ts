import { describe, expect, it } from 'vitest';
import { buildOpenApiDocument } from '../../../../../src/adapters/http/openapi/openApiDocument.js';
// Importing the schemas module registers the /health path as a side effect.
import '../../../../../src/adapters/http/schemas/healthSchemas.js';

describe('buildOpenApiDocument', () => {
  it('produces a valid OpenAPI 3.x document with the /health path and HealthResponse schema', () => {
    const doc = buildOpenApiDocument();

    expect(doc.openapi).toMatch(/^3\./);
    expect(doc.info.title).toBe('TypeScript Hexagonal Template API');
    expect(doc.paths?.['/health']).toBeDefined();
    expect(doc.paths?.['/health']?.get?.responses?.['200']).toBeDefined();
    expect(doc.components?.schemas?.HealthResponse).toBeDefined();
  });
});
