import { describe, expect, it } from 'vitest';
import { ReqresUserRepository } from '../../../../src/adapters/http-clients/ReqresUserRepository.js';
import { UpstreamHttpError } from '../../../../src/adapters/http-clients/UpstreamHttpError.js';
import type { LogContext, LoggerPort } from '../../../../src/core/ports/LoggerPort.js';

class NoopLogger implements LoggerPort {
  info(_m: string, _c?: LogContext): void {}
  warn(_m: string, _c?: LogContext): void {}
  error(_m: string, _c?: LogContext): void {}
  debug(_m: string, _c?: LogContext): void {}
}

interface FetchCall {
  input: RequestInfo | URL;
  init: RequestInit | undefined;
}

function makeFetch(response: Response): { fn: typeof fetch; calls: FetchCall[] } {
  const calls: FetchCall[] = [];
  const fn: typeof fetch = async (input, init) => {
    calls.push({ input, init });
    return response;
  };
  return { fn, calls };
}

const validBody = {
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

describe('ReqresUserRepository', () => {
  it('maps reqres response data into domain Users with camelCase fields', async () => {
    const { fn } = makeFetch(new Response(JSON.stringify(validBody), { status: 200 }));
    const sut = new ReqresUserRepository(
      { baseUrl: 'https://reqres.in', apiKey: 'key', fetch: fn },
      new NoopLogger(),
    );

    const users = await sut.listUsers();

    expect(users).toHaveLength(2);
    expect(users[0]).toMatchObject({
      id: 1,
      email: 'george.bluth@reqres.in',
      firstName: 'George',
      lastName: 'Bluth',
      avatarUrl: 'https://reqres.in/img/faces/1-image.jpg',
    });
  });

  it(`calls GET \${baseUrl}/api/users with the x-api-key header`, async () => {
    const { fn, calls } = makeFetch(new Response(JSON.stringify(validBody), { status: 200 }));
    const sut = new ReqresUserRepository(
      { baseUrl: 'https://reqres.example', apiKey: 'secret-key', fetch: fn },
      new NoopLogger(),
    );

    await sut.listUsers();

    expect(calls).toHaveLength(1);
    expect(calls[0].input).toBe('https://reqres.example/api/users');
    const headers = new Headers(calls[0].init?.headers);
    expect(headers.get('x-api-key')).toBe('secret-key');
    expect(headers.get('accept')).toBe('application/json');
  });

  it('throws UpstreamHttpError with the upstream status on non-2xx', async () => {
    const { fn } = makeFetch(new Response('forbidden', { status: 401 }));
    const sut = new ReqresUserRepository(
      { baseUrl: 'https://reqres.in', apiKey: 'key', fetch: fn },
      new NoopLogger(),
    );

    await expect(sut.listUsers()).rejects.toBeInstanceOf(UpstreamHttpError);
    await expect(sut.listUsers()).rejects.toMatchObject({ status: 401 });
  });

  it('throws UpstreamHttpError wrapping ZodError when the response shape drifts', async () => {
    const { fn } = makeFetch(
      new Response(JSON.stringify({ not: 'what we expect' }), { status: 200 }),
    );
    const sut = new ReqresUserRepository(
      { baseUrl: 'https://reqres.in', apiKey: 'key', fetch: fn },
      new NoopLogger(),
    );

    await expect(sut.listUsers()).rejects.toBeInstanceOf(UpstreamHttpError);
  });
});
