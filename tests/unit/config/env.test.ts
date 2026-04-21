import { describe, expect, it } from 'vitest';
import { parseEnv } from '../../../src/config/env.js';

describe('parseEnv', () => {
  it('accepts a complete, valid environment', () => {
    const env = parseEnv({
      NODE_ENV: 'development',
      PORT: '3000',
      LOG_LEVEL: 'info',
      REQRES_API_KEY: 'test-key',
    });

    expect(env).toEqual({
      NODE_ENV: 'development',
      PORT: 3000,
      LOG_LEVEL: 'info',
      REQRES_BASE_URL: 'https://reqres.in',
      REQRES_API_KEY: 'test-key',
    });
  });

  it('applies defaults when optional vars are missing', () => {
    const env = parseEnv({ NODE_ENV: 'development', REQRES_API_KEY: 'test-key' });
    expect(env.PORT).toBe(3000);
    expect(env.LOG_LEVEL).toBe('info');
  });

  it('coerces PORT from string to number', () => {
    const env = parseEnv({ NODE_ENV: 'production', PORT: '8080', REQRES_API_KEY: 'test-key' });

    expect(env.PORT).toBe(8080);
    expect(typeof env.PORT).toBe('number');
  });

  it('rejects an invalid NODE_ENV', () => {
    expect(() => parseEnv({ NODE_ENV: 'staging' as never, REQRES_API_KEY: 'test-key' })).toThrow();
  });

  it('rejects a non-numeric PORT', () => {
    expect(() => parseEnv({ NODE_ENV: 'development', PORT: 'abc', REQRES_API_KEY: 'test-key' })).toThrow();
  });

  it('rejects an invalid LOG_LEVEL', () => {
    expect(() => parseEnv({ NODE_ENV: 'development', LOG_LEVEL: 'verbose' as never, REQRES_API_KEY: 'test-key' })).toThrow();
  });

  it('requires REQRES_API_KEY', () => {
    expect(() =>
      parseEnv({
        NODE_ENV: 'development',
        REQRES_BASE_URL: 'https://reqres.in',
      }),
    ).toThrow();
  });

  it('defaults REQRES_BASE_URL to https://reqres.in', () => {
    const env = parseEnv({
      NODE_ENV: 'development',
      REQRES_API_KEY: 'test-key',
    });
    expect(env.REQRES_BASE_URL).toBe('https://reqres.in');
  });

  it('accepts a fully populated reqres-aware environment', () => {
    const env = parseEnv({
      NODE_ENV: 'production',
      PORT: '8080',
      LOG_LEVEL: 'warn',
      REQRES_BASE_URL: 'https://reqres.example',
      REQRES_API_KEY: 'abc123',
    });
    expect(env.REQRES_BASE_URL).toBe('https://reqres.example');
    expect(env.REQRES_API_KEY).toBe('abc123');
  });
});
