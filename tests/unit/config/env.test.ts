import { describe, expect, it } from 'vitest';
import { parseEnv } from '../../../src/config/env.js';

describe('parseEnv', () => {
  it('accepts a complete, valid environment', () => {
    const env = parseEnv({
      NODE_ENV: 'development',
      PORT: '3000',
      LOG_LEVEL: 'info',
    });

    expect(env).toEqual({
      NODE_ENV: 'development',
      PORT: 3000,
      LOG_LEVEL: 'info',
    });
  });

  it('applies defaults when optional vars are missing', () => {
    const env = parseEnv({ NODE_ENV: 'development' });

    expect(env.PORT).toBe(3000);
    expect(env.LOG_LEVEL).toBe('info');
  });

  it('coerces PORT from string to number', () => {
    const env = parseEnv({ NODE_ENV: 'production', PORT: '8080' });

    expect(env.PORT).toBe(8080);
    expect(typeof env.PORT).toBe('number');
  });

  it('rejects an invalid NODE_ENV', () => {
    expect(() => parseEnv({ NODE_ENV: 'staging' as never })).toThrow();
  });

  it('rejects a non-numeric PORT', () => {
    expect(() => parseEnv({ NODE_ENV: 'development', PORT: 'abc' })).toThrow();
  });

  it('rejects an invalid LOG_LEVEL', () => {
    expect(() => parseEnv({ NODE_ENV: 'development', LOG_LEVEL: 'verbose' as never })).toThrow();
  });
});
