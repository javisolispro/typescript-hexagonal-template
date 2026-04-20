import { Writable } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { PinoLoggerAdapter } from '../../../../src/adapters/logging/PinoLoggerAdapter.js';

function captureStream(): Writable & { lines: string[] } {
  const lines: string[] = [];
  const stream = new Writable({
    write(chunk, _enc, cb) {
      lines.push(chunk.toString('utf8'));
      cb();
    },
  }) as Writable & { lines: string[] };
  stream.lines = lines;
  return stream;
}

describe('PinoLoggerAdapter', () => {
  it('emits JSON lines at info, warn, error, and debug levels', () => {
    const stream = captureStream();
    const logger = new PinoLoggerAdapter({ level: 'debug', destination: stream });

    logger.info('hello', { foo: 1 });
    logger.warn('careful');
    logger.error('boom', { bar: 'x' });
    logger.debug('dbg');

    expect(stream.lines).toHaveLength(4);
    for (const raw of stream.lines) {
      expect(() => JSON.parse(raw)).not.toThrow();
    }

    const parsed = stream.lines.map((l) => JSON.parse(l));
    expect(parsed[0]).toMatchObject({ level: 30, msg: 'hello', foo: 1 });
    expect(parsed[1]).toMatchObject({ level: 40, msg: 'careful' });
    expect(parsed[2]).toMatchObject({ level: 50, msg: 'boom', bar: 'x' });
    expect(parsed[3]).toMatchObject({ level: 20, msg: 'dbg' });
  });

  it('respects the configured level (silent produces no output)', () => {
    const stream = captureStream();
    const logger = new PinoLoggerAdapter({ level: 'silent', destination: stream });

    logger.info('hidden');
    logger.error('also hidden');

    expect(stream.lines).toHaveLength(0);
  });
});
