# Reqres User Repository Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an end-to-end vertical slice that demonstrates the outbound (driven) HTTP adapter pattern: `GET /users` → `ListUsersUseCase` → `UserRepositoryPort` → `ReqresUserRepository` (native `fetch`) → `reqres.in/api/users`.

**Architecture:** Pure core (domain `User` + `UserRepositoryPort` interface + `ListUsersUseCase`). Zod-validated outbound adapter in `src/adapters/http-clients/`. Driving HTTP slice (controller, route, response schema) in `src/adapters/http/`. Composition root wires the graph with an optional `overrides.fetch` seam for hermetic tests.

**Tech Stack:** TypeScript (NodeNext modules, strict), Node 22 native `fetch` + `AbortSignal.timeout`, Zod, Express 5, Vitest, Supertest, Biome.

**Design spec:** [docs/superpowers/specs/2026-04-21-reqres-user-repository-design.md](../specs/2026-04-21-reqres-user-repository-design.md)

**Commit convention (observed in repo):** `feat(...)`, `test(...)`, `docs(...)`, `chore(...)` — single-line subject, no body required.

---

## File map

**Create:**
- `src/core/domain/users/User.ts`
- `src/core/ports/UserRepositoryPort.ts`
- `src/core/application/users/ListUsersUseCase.ts`
- `src/adapters/http-clients/UpstreamHttpError.ts`
- `src/adapters/http-clients/reqresSchemas.ts`
- `src/adapters/http-clients/ReqresUserRepository.ts`
- `src/adapters/http/schemas/usersSchemas.ts`
- `src/adapters/http/controllers/UsersController.ts`
- `src/adapters/http/routes/usersRoutes.ts`
- `tests/unit/core/domain/users/User.test.ts`
- `tests/unit/core/application/users/ListUsersUseCase.test.ts`
- `tests/unit/adapters/http-clients/ReqresUserRepository.test.ts`
- `tests/integration/http/users.integration.test.ts`

**Modify:**
- `src/config/env.ts` (add `REQRES_BASE_URL`, `REQRES_API_KEY`)
- `src/composition/container.ts` (wire new graph + `ContainerOverrides`)
- `.env.example` (new vars)
- `tests/unit/config/env.test.ts` (cover new vars)
- `README.md` (env table + pointer to new pattern)

---

## Task 1: Extend env schema

**Files:**
- Modify: `src/config/env.ts`
- Modify: `tests/unit/config/env.test.ts`
- Modify: `.env.example`

- [ ] **Step 1: Add failing tests to `tests/unit/config/env.test.ts`**

Append the following three tests inside the existing `describe('parseEnv', ...)` block (immediately before the closing `});`):

```ts
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
```

Also update the first existing test (`accepts a complete, valid environment`) to include the new vars and assertions. Replace its body with:

```ts
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
```

And update `applies defaults when optional vars are missing` to supply `REQRES_API_KEY`:

```ts
    const env = parseEnv({ NODE_ENV: 'development', REQRES_API_KEY: 'test-key' });
    expect(env.PORT).toBe(3000);
    expect(env.LOG_LEVEL).toBe('info');
```

- [ ] **Step 2: Run the env test file to confirm it fails**

Run: `npm run test:unit -- tests/unit/config/env.test.ts`
Expected: FAIL — zod reports that `REQRES_API_KEY` is required / unknown keys not recognized.

- [ ] **Step 3: Extend `EnvSchema` in `src/config/env.ts`**

Replace the schema with:

```ts
import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  PORT: z.coerce.number().int().min(0).max(65535).default(3000),
  LOG_LEVEL: z.enum(['silent', 'trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  REQRES_BASE_URL: z.string().url().default('https://reqres.in'),
  REQRES_API_KEY: z.string().min(1),
});

export type Env = z.infer<typeof EnvSchema>;

export function parseEnv(input: Record<string, string | undefined>): Env {
  return EnvSchema.parse(input);
}

export function loadEnvOrExit(): Env {
  const result = EnvSchema.safeParse(process.env);
  if (!result.success) {
    console.error('Invalid environment variables:');
    for (const issue of result.error.issues) {
      console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
    }
    process.exit(1);
  }
  return result.data;
}
```

- [ ] **Step 4: Update `.env.example`**

Replace the file with:

```
NODE_ENV=development
PORT=3000
LOG_LEVEL=info
REQRES_BASE_URL=https://reqres.in
REQRES_API_KEY=reqres_258cb2328d1d47cc9d830db0772390f9
```

- [ ] **Step 5: Run env tests to confirm they pass**

Run: `npm run test:unit -- tests/unit/config/env.test.ts`
Expected: PASS — all tests green.

- [ ] **Step 6: Run full unit suite (should still pass)**

Run: `npm run test:unit`
Expected: PASS — pre-existing tests unaffected. (Integration tests will fail now because `buildContainer` is called without `REQRES_API_KEY`; that is fixed in Task 9. Do not run integration tests yet.)

- [ ] **Step 7: Commit**

```bash
git add src/config/env.ts tests/unit/config/env.test.ts .env.example
git commit -m "feat(config): add REQRES_BASE_URL and REQRES_API_KEY env vars"
```

---

## Task 2: Domain `User`

**Files:**
- Create: `src/core/domain/users/User.ts`
- Create: `tests/unit/core/domain/users/User.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/core/domain/users/User.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { User } from '../../../../../src/core/domain/users/User.js';

describe('User', () => {
  it('exposes id, email, firstName, lastName, avatarUrl', () => {
    const user = new User(
      1,
      'george.bluth@reqres.in',
      'George',
      'Bluth',
      'https://reqres.in/img/faces/1-image.jpg',
    );

    expect(user.id).toBe(1);
    expect(user.email).toBe('george.bluth@reqres.in');
    expect(user.firstName).toBe('George');
    expect(user.lastName).toBe('Bluth');
    expect(user.avatarUrl).toBe('https://reqres.in/img/faces/1-image.jpg');
  });

  it('is a read-only value object', () => {
    const user = new User(1, 'a@b.com', 'A', 'B', 'https://example.com/x.png');
    expect(() => {
      (user as unknown as { email: string }).email = 'mutated@b.com';
    }).toThrow();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:unit -- tests/unit/core/domain/users/User.test.ts`
Expected: FAIL — `Cannot find module .../src/core/domain/users/User.js`.

- [ ] **Step 3: Create the domain class**

Create `src/core/domain/users/User.ts`:

```ts
export class User {
  constructor(
    readonly id: number,
    readonly email: string,
    readonly firstName: string,
    readonly lastName: string,
    readonly avatarUrl: string,
  ) {
    Object.freeze(this);
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:unit -- tests/unit/core/domain/users/User.test.ts`
Expected: PASS — both tests green.

- [ ] **Step 5: Commit**

```bash
git add src/core/domain/users/User.ts tests/unit/core/domain/users/User.test.ts
git commit -m "feat(domain): add User value object"
```

---

## Task 3: `UserRepositoryPort` + `ListUsersUseCase`

**Files:**
- Create: `src/core/ports/UserRepositoryPort.ts`
- Create: `src/core/application/users/ListUsersUseCase.ts`
- Create: `tests/unit/core/application/users/ListUsersUseCase.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/core/application/users/ListUsersUseCase.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { ListUsersUseCase } from '../../../../../src/core/application/users/ListUsersUseCase.js';
import { User } from '../../../../../src/core/domain/users/User.js';
import type { UserRepositoryPort } from '../../../../../src/core/ports/UserRepositoryPort.js';
import type { LogContext, LoggerPort } from '../../../../../src/core/ports/LoggerPort.js';

class FakeLogger implements LoggerPort {
  readonly calls: Array<{
    level: 'info' | 'warn' | 'error' | 'debug';
    message: string;
    context?: LogContext;
  }> = [];
  info(message: string, context?: LogContext): void {
    this.calls.push({ level: 'info', message, context });
  }
  warn(message: string, context?: LogContext): void {
    this.calls.push({ level: 'warn', message, context });
  }
  error(message: string, context?: LogContext): void {
    this.calls.push({ level: 'error', message, context });
  }
  debug(message: string, context?: LogContext): void {
    this.calls.push({ level: 'debug', message, context });
  }
}

class FakeUserRepository implements UserRepositoryPort {
  constructor(private readonly users: readonly User[]) {}
  async listUsers(): Promise<readonly User[]> {
    return this.users;
  }
}

describe('ListUsersUseCase', () => {
  it('returns the users produced by the repository', async () => {
    const expected = [
      new User(1, 'a@b.com', 'A', 'B', 'https://example.com/a.png'),
      new User(2, 'c@d.com', 'C', 'D', 'https://example.com/c.png'),
    ];
    const sut = new ListUsersUseCase(new FakeUserRepository(expected), new FakeLogger());

    const result = await sut.execute();

    expect(result).toEqual(expected);
  });

  it('logs an info message each time it is executed', async () => {
    const logger = new FakeLogger();
    const sut = new ListUsersUseCase(new FakeUserRepository([]), logger);

    await sut.execute();

    expect(logger.calls).toHaveLength(1);
    expect(logger.calls[0]).toMatchObject({ level: 'info', message: 'listing users' });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:unit -- tests/unit/core/application/users/ListUsersUseCase.test.ts`
Expected: FAIL — cannot resolve `ListUsersUseCase` / `UserRepositoryPort`.

- [ ] **Step 3: Create the port**

Create `src/core/ports/UserRepositoryPort.ts`:

```ts
import type { User } from '../domain/users/User.js';

export interface UserRepositoryPort {
  listUsers(): Promise<readonly User[]>;
}
```

- [ ] **Step 4: Create the use case**

Create `src/core/application/users/ListUsersUseCase.ts`:

```ts
import type { User } from '../../domain/users/User.js';
import type { LoggerPort } from '../../ports/LoggerPort.js';
import type { UserRepositoryPort } from '../../ports/UserRepositoryPort.js';

export class ListUsersUseCase {
  constructor(
    private readonly users: UserRepositoryPort,
    private readonly logger: LoggerPort,
  ) {}

  async execute(): Promise<readonly User[]> {
    this.logger.info('listing users');
    return this.users.listUsers();
  }
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm run test:unit -- tests/unit/core/application/users/ListUsersUseCase.test.ts`
Expected: PASS — both tests green.

- [ ] **Step 6: Commit**

```bash
git add src/core/ports/UserRepositoryPort.ts \
        src/core/application/users/ListUsersUseCase.ts \
        tests/unit/core/application/users/ListUsersUseCase.test.ts
git commit -m "feat(core): add UserRepositoryPort and ListUsersUseCase"
```

---

## Task 4: `UpstreamHttpError`

**Files:**
- Create: `src/adapters/http-clients/UpstreamHttpError.ts`

- [ ] **Step 1: Create the error class**

Create `src/adapters/http-clients/UpstreamHttpError.ts`:

```ts
export class UpstreamHttpError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number, cause?: unknown) {
    super(message, cause !== undefined ? { cause } : undefined);
    this.name = 'UpstreamHttpError';
    this.status = status;
  }
}
```

(No standalone test — covered by `ReqresUserRepository.test.ts` in Task 6.)

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS — no type errors.

- [ ] **Step 3: Commit**

```bash
git add src/adapters/http-clients/UpstreamHttpError.ts
git commit -m "feat(adapters): add UpstreamHttpError for outbound HTTP failures"
```

---

## Task 5: Reqres response schema

**Files:**
- Create: `src/adapters/http-clients/reqresSchemas.ts`

- [ ] **Step 1: Create the schema**

Create `src/adapters/http-clients/reqresSchemas.ts`:

```ts
import { z } from 'zod';

const ReqresUserSchema = z.object({
  id: z.number().int(),
  email: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  avatar: z.string().url(),
});

export const ReqresListUsersResponseSchema = z.object({
  data: z.array(ReqresUserSchema),
});

export type ReqresListUsersResponse = z.infer<typeof ReqresListUsersResponseSchema>;
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/adapters/http-clients/reqresSchemas.ts
git commit -m "feat(adapters): add reqres list-users response schema"
```

---

## Task 6: `ReqresUserRepository` adapter

**Files:**
- Create: `src/adapters/http-clients/ReqresUserRepository.ts`
- Create: `tests/unit/adapters/http-clients/ReqresUserRepository.test.ts`

- [ ] **Step 1: Write the failing test file**

Create `tests/unit/adapters/http-clients/ReqresUserRepository.test.ts`:

```ts
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
    const { fn } = makeFetch(
      new Response(JSON.stringify(validBody), { status: 200 }),
    );
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

  it('calls GET ${baseUrl}/api/users with the x-api-key header', async () => {
    const { fn, calls } = makeFetch(
      new Response(JSON.stringify(validBody), { status: 200 }),
    );
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:unit -- tests/unit/adapters/http-clients/ReqresUserRepository.test.ts`
Expected: FAIL — cannot resolve `ReqresUserRepository`.

- [ ] **Step 3: Implement the adapter**

Create `src/adapters/http-clients/ReqresUserRepository.ts`:

```ts
import { ZodError } from 'zod';
import { User } from '../../core/domain/users/User.js';
import type { LoggerPort } from '../../core/ports/LoggerPort.js';
import type { UserRepositoryPort } from '../../core/ports/UserRepositoryPort.js';
import { ReqresListUsersResponseSchema } from './reqresSchemas.js';
import { UpstreamHttpError } from './UpstreamHttpError.js';

export interface ReqresUserRepositoryOptions {
  readonly baseUrl: string;
  readonly apiKey: string;
  readonly timeoutMs?: number;
  readonly fetch?: typeof fetch;
}

export class ReqresUserRepository implements UserRepositoryPort {
  private readonly fetchFn: typeof fetch;
  private readonly timeoutMs: number;

  constructor(
    private readonly opts: ReqresUserRepositoryOptions,
    private readonly logger: LoggerPort,
  ) {
    this.fetchFn = opts.fetch ?? globalThis.fetch;
    this.timeoutMs = opts.timeoutMs ?? 5000;
  }

  async listUsers(): Promise<readonly User[]> {
    const url = `${this.opts.baseUrl}/api/users`;
    const res = await this.fetchFn(url, {
      headers: {
        'x-api-key': this.opts.apiKey,
        accept: 'application/json',
      },
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!res.ok) {
      this.logger.warn('reqres upstream non-2xx', { status: res.status, url });
      throw new UpstreamHttpError(`reqres ${res.status}`, res.status);
    }

    const json = (await res.json()) as unknown;
    let parsed: ReturnType<typeof ReqresListUsersResponseSchema.parse>;
    try {
      parsed = ReqresListUsersResponseSchema.parse(json);
    } catch (err) {
      if (err instanceof ZodError) {
        this.logger.warn('reqres upstream schema drift', { url });
        throw new UpstreamHttpError('reqres response schema drift', undefined, err);
      }
      throw err;
    }

    return parsed.data.map(
      (u) => new User(u.id, u.email, u.first_name, u.last_name, u.avatar),
    );
  }
}
```

- [ ] **Step 4: Run the adapter tests to verify they pass**

Run: `npm run test:unit -- tests/unit/adapters/http-clients/ReqresUserRepository.test.ts`
Expected: PASS — all four cases green.

- [ ] **Step 5: Run full unit suite**

Run: `npm run test:unit`
Expected: PASS — everything green.

- [ ] **Step 6: Commit**

```bash
git add src/adapters/http-clients/ReqresUserRepository.ts \
        tests/unit/adapters/http-clients/ReqresUserRepository.test.ts
git commit -m "feat(adapters): implement ReqresUserRepository via native fetch"
```

---

## Task 7: Driving-HTTP response schemas + OpenAPI

**Files:**
- Create: `src/adapters/http/schemas/usersSchemas.ts`

- [ ] **Step 1: Create the schemas module**

Create `src/adapters/http/schemas/usersSchemas.ts`:

```ts
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
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/adapters/http/schemas/usersSchemas.ts
git commit -m "feat(http): register /users response schema in OpenAPI"
```

---

## Task 8: `UsersController` and router

**Files:**
- Create: `src/adapters/http/controllers/UsersController.ts`
- Create: `src/adapters/http/routes/usersRoutes.ts`

- [ ] **Step 1: Create the controller**

Create `src/adapters/http/controllers/UsersController.ts`:

```ts
import type { NextFunction, Request, Response } from 'express';
import type { ListUsersUseCase } from '../../../core/application/users/ListUsersUseCase.js';
import {
  type ListUsersResponse,
  ListUsersResponseSchema,
} from '../schemas/usersSchemas.js';

export class UsersController {
  constructor(private readonly useCase: ListUsersUseCase) {}

  async handleListUsers(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const users = await this.useCase.execute();
      const body: ListUsersResponse = ListUsersResponseSchema.parse({
        users: users.map((u) => ({
          id: u.id,
          email: u.email,
          firstName: u.firstName,
          lastName: u.lastName,
          avatarUrl: u.avatarUrl,
        })),
      });
      res.status(200).json(body);
    } catch (err) {
      next(err);
    }
  }
}
```

- [ ] **Step 2: Create the router**

Create `src/adapters/http/routes/usersRoutes.ts`:

```ts
import { Router } from 'express';
import type { UsersController } from '../controllers/UsersController.js';

export function createUsersRouter(controller: UsersController): Router {
  const router = Router();
  router.get('/users', controller.handleListUsers.bind(controller));
  return router;
}
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/adapters/http/controllers/UsersController.ts \
        src/adapters/http/routes/usersRoutes.ts
git commit -m "feat(http): add UsersController and /users route"
```

---

## Task 9: Composition root wiring

**Files:**
- Modify: `src/composition/container.ts`

- [ ] **Step 1: Replace `src/composition/container.ts`**

Replace the entire file with:

```ts
import { HealthController } from '../adapters/http/controllers/HealthController.js';
import { HelloWorldController } from '../adapters/http/controllers/HelloWorldController.js';
import { UsersController } from '../adapters/http/controllers/UsersController.js';
import { HttpServer } from '../adapters/http/HttpServer.js';
import { buildOpenApiDocument } from '../adapters/http/openapi/openApiDocument.js';
import { createHealthRouter } from '../adapters/http/routes/healthRoutes.js';
import { createHelloWorldRouter } from '../adapters/http/routes/helloWorldRoutes.js';
import { createUsersRouter } from '../adapters/http/routes/usersRoutes.js';
import { ReqresUserRepository } from '../adapters/http-clients/ReqresUserRepository.js';
import { PinoLoggerAdapter } from '../adapters/logging/PinoLoggerAdapter.js';
import type { Env } from '../config/env.js';
import { CheckHealthUseCase } from '../core/application/health/CheckHealthUseCase.js';
import { HelloWorldUseCase } from '../core/application/hello-world/HelloWorldUseCase.js';
import { ListUsersUseCase } from '../core/application/users/ListUsersUseCase.js';
// Importing the schemas module registers OpenAPI paths as a side effect.
// (helloWorldSchemas is imported transitively by HelloWorldController; the
// healthSchemas and usersSchemas paths are registered here to match the
// existing "explicit side-effect import" convention for health.)
import '../adapters/http/schemas/healthSchemas.js';
import '../adapters/http/schemas/usersSchemas.js';

export interface Container {
  readonly httpServer: HttpServer;
}

export interface ContainerOverrides {
  readonly fetch?: typeof fetch;
}

export function buildContainer(env: Env, overrides?: ContainerOverrides): Container {
  const logger = new PinoLoggerAdapter({
    level: env.LOG_LEVEL,
    pretty: env.NODE_ENV !== 'production',
  });

  const checkHealth = new CheckHealthUseCase(logger);
  const helloWorldUseCase = new HelloWorldUseCase(logger);
  const userRepository = new ReqresUserRepository(
    {
      baseUrl: env.REQRES_BASE_URL,
      apiKey: env.REQRES_API_KEY,
      ...(overrides?.fetch ? { fetch: overrides.fetch } : {}),
    },
    logger,
  );
  const listUsers = new ListUsersUseCase(userRepository, logger);

  const healthController = new HealthController(checkHealth);
  const helloWorldController = new HelloWorldController(helloWorldUseCase);
  const usersController = new UsersController(listUsers);

  const healthRouter = createHealthRouter(healthController);
  const helloWorldRouter = createHelloWorldRouter(helloWorldController);
  const usersRouter = createUsersRouter(usersController);

  const openApiDoc = buildOpenApiDocument();

  const httpServer = new HttpServer({
    routers: [healthRouter, helloWorldRouter, usersRouter],
    logger,
    openApiDoc,
  });

  return { httpServer };
}
```


- [ ] **Step 2: Update the existing integration test to supply `REQRES_API_KEY`**

The existing `tests/integration/http/health.integration.test.ts` calls `buildContainer({...})` without the new vars. Update its `beforeAll` to include `REQRES_API_KEY`:

Replace the `buildContainer` call with:

```ts
    const { httpServer } = buildContainer({
      NODE_ENV: 'test',
      PORT: 0,
      LOG_LEVEL: 'silent',
      REQRES_BASE_URL: 'https://reqres.in',
      REQRES_API_KEY: 'test-key',
    });
```

- [ ] **Step 3: Typecheck and run all existing tests**

Run: `npm run typecheck`
Expected: PASS.

Run: `npm test`
Expected: PASS — pre-existing tests still green; `OpenAPI` document now contains `/users` and `ListUsersResponse`, but no test asserts that yet.

- [ ] **Step 4: Commit**

```bash
git add src/composition/container.ts tests/integration/http/health.integration.test.ts
git commit -m "feat(composition): wire ReqresUserRepository and /users slice"
```

---

## Task 10: Integration test for `/users`

**Files:**
- Create: `tests/integration/http/users.integration.test.ts`

- [ ] **Step 1: Write the integration test**

Create `tests/integration/http/users.integration.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the integration test**

Run: `npm run test:integration -- tests/integration/http/users.integration.test.ts`
Expected: PASS — all three cases green.

- [ ] **Step 3: Run the complete suite**

Run: `npm run check`
Expected: PASS — typecheck, lint, and all tests green.

- [ ] **Step 4: Commit**

```bash
git add tests/integration/http/users.integration.test.ts
git commit -m "test(http): add integration test for /users end-to-end"
```

---

## Task 11: README documentation

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update the env-vars table**

In `README.md`, replace the current env-vars table (the one starting `| Var         | Required | Default |`) with:

```
| Var                | Required | Default              | Allowed                                                                  |
| ------------------ | -------- | -------------------- | ------------------------------------------------------------------------ |
| `NODE_ENV`         | yes      | —                    | `development` \| `test` \| `production`                                  |
| `PORT`             | no       | `3000`               | any integer in `0..65535`                                                |
| `LOG_LEVEL`        | no       | `info`               | `silent` \| `trace` \| `debug` \| `info` \| `warn` \| `error` \| `fatal` |
| `REQRES_BASE_URL`  | no       | `https://reqres.in`  | any valid URL                                                            |
| `REQRES_API_KEY`   | yes      | —                    | non-empty string (reqres.in API key)                                     |
```

- [ ] **Step 2: Add a short section on the outbound-HTTP pattern**

Under the `## Architecture` section, after the "The one rule" subsection, add:

```markdown
### Driven HTTP adapters

Outbound HTTP integrations live under `src/adapters/http-clients/`. The
`ReqresUserRepository` — wired at `GET /users` — is the canonical example: a
port in core (`UserRepositoryPort`) is implemented via native `fetch`, with a
Zod schema (`reqresSchemas.ts`) validating the upstream response at the
boundary. Schema drift or non-2xx responses surface as `UpstreamHttpError`,
which the error middleware maps to a 500 by default.
```

- [ ] **Step 3: Run the complete suite one last time**

Run: `npm run check`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs(readme): document reqres client env vars and driven-HTTP pattern"
```

---

## Completion check

After Task 11, the following should all be true:

- `npm run check` passes.
- `GET /users` in the running app (via `npm run dev`) returns the mapped camelCase payload (requires a real `REQRES_API_KEY` in `.env`; without outbound network access the live call will fail — tests are the hermetic proof).
- `GET /openapi.json` includes `/users` and the `User` / `ListUsersResponse` schemas.
- `GET /docs` renders the Swagger UI with the new endpoint.
- No file under `src/core/**` imports from `zod`, `express`, `pino`, or the adapters folder (Biome's `noRestrictedImports` enforces this; `npm run lint` would catch it).
- Any future outbound REST integration can be added by copying Tasks 3–9.
