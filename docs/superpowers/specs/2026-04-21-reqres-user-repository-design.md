# Reqres User Repository — Design

**Date:** 2026-04-21
**Owner:** Javi
**Status:** Approved (design phase)

## 1. Purpose

Add a second vertical slice to the hexagonal template that demonstrates the
**outbound HTTP adapter** (driven) pattern. The existing `/health` and
`/hello-world` slices exercise the *driving* side (HTTP in). This slice
exercises the *driven* side (HTTP out) by integrating with
[reqres.in](https://reqres.in) — a public sandbox API.

The slice is end-to-end: our service exposes `GET /users`, which delegates to
a use case in core, which calls a port implemented by a fetch-based adapter
that targets `reqres.in/api/users`.

Like the rest of the template, this is **didactic**: a reader should be able
to copy the pattern to add any other outbound REST integration.

## 2. Requirements (from user)

1. Implement a "dummy" REST client targeting `reqres.in`.
2. Follow the existing hexagonal architecture — pure core, adapters at the
   boundaries, ports as interfaces.
3. Define a DTO / schema for the upstream response; validate it at the
   boundary.
4. Read the API key from configuration (extends `env.ts`).
5. Target endpoint (from the user's curl):
   `GET https://reqres.in/api/users` with header
   `x-api-key: reqres_258cb2328d1d47cc9d830db0772390f9`.

## 3. Technology decisions

| Area | Choice | Why |
|---|---|---|
| HTTP client | Node 22 native `fetch` | Zero new deps; matches the repo's lean dependency posture. `AbortSignal.timeout(ms)` gives clean cancellation. |
| Response validation | `zod` (in the adapter) | Same library already used for HTTP request/response + env schemas. Runs at the adapter boundary so core stays dependency-free. |
| Port naming convention | `<Name>Port` | Matches existing `LoggerPort.ts`. |
| Port semantics | `UserRepositoryPort` | User-preferred name. Reads naturally; "repository" fit is pragmatic (not DDD-strict). Its implementation lives in `adapters/http-clients/`, so the source is unambiguous. |
| Domain return type | `readonly User[]` | User chose to drop pagination; the port stays narrow and provider-agnostic. Reqres-specific fields (`page`, `per_page`, `total`, `total_pages`, `support`) stop at the adapter boundary. |
| Folder for driven HTTP | `src/adapters/http-clients/` | New sibling to `src/adapters/http/` (which is driving). Split is by *direction*, making the dependency arrow visible at a glance. |
| Adapter-layer error | `UpstreamHttpError` (plain `Error`, not a `DomainError`) | Core doesn't know about HTTP. The existing error middleware treats unknown errors as 500 — correct default for an upstream failure. |
| `ZodError` handling | Caught in the adapter, re-thrown as `UpstreamHttpError` | Upstream schema drift is not a client validation problem (400); it's a server-side upstream failure (5xx). |
| Test seam for `fetch` | Optional `fetch` injected via constructor options | Matches the hand-written-fakes style used in other unit tests — no mocking library needed. Integration test swaps `fetch` via a new `overrides` parameter on `buildContainer`. |

## 4. Directory layout (additions only)

```
src/
├── core/
│   ├── domain/
│   │   └── users/
│   │       └── User.ts                           # NEW: domain type (frozen)
│   ├── application/
│   │   └── users/
│   │       └── ListUsersUseCase.ts               # NEW
│   └── ports/
│       └── UserRepositoryPort.ts                 # NEW
├── adapters/
│   ├── http-clients/                             # NEW subfolder (driven HTTP)
│   │   ├── ReqresUserRepository.ts               # NEW: implements UserRepositoryPort
│   │   ├── reqresSchemas.ts                      # NEW: Zod schema for reqres's shape
│   │   └── UpstreamHttpError.ts                  # NEW
│   └── http/
│       ├── controllers/UsersController.ts        # NEW
│       ├── routes/usersRoutes.ts                 # NEW
│       └── schemas/usersSchemas.ts               # NEW: Zod schema for OUR /users response
├── config/
│   └── env.ts                                    # MODIFIED: + REQRES_BASE_URL, REQRES_API_KEY
└── composition/
    └── container.ts                              # MODIFIED: wire repository, use case,
                                                  #   controller, router; optional test overrides
tests/
├── unit/
│   ├── core/application/users/
│   │   └── ListUsersUseCase.test.ts              # NEW
│   ├── adapters/http-clients/
│   │   └── ReqresUserRepository.test.ts          # NEW
│   └── config/env.test.ts                        # MODIFIED: assert new vars
└── integration/http/
    └── users.integration.test.ts                 # NEW
.env.example                                      # MODIFIED: + new vars
README.md                                         # MODIFIED: env table + feature mention
```

## 5. Domain

### 5.1 `User` (`src/core/domain/users/User.ts`)

Frozen value object. Same pattern as `HelloWorld` / `HealthStatus`.

Fields (camelCase, plain `string` / `number`):

- `id: number`
- `email: string`
- `firstName: string`
- `lastName: string`
- `avatarUrl: string`

No behavior beyond construction. `Object.freeze(this)` in the constructor.

## 6. Port

### 6.1 `UserRepositoryPort` (`src/core/ports/UserRepositoryPort.ts`)

```ts
import type { User } from '../domain/users/User.js';

export interface UserRepositoryPort {
  listUsers(): Promise<readonly User[]>;
}
```

The interface intentionally returns `readonly User[]`, not a paginated
wrapper type. If a future provider needs pagination, we add a second method
(`listUsersPage(...)`) rather than widening `listUsers`.

## 7. Use case

### 7.1 `ListUsersUseCase` (`src/core/application/users/ListUsersUseCase.ts`)

Constructor takes `UserRepositoryPort` and `LoggerPort`. `execute()` logs an
info line and returns `this.users.listUsers()`. No business logic yet — the
use case is a thin orchestrator, as in the template's other examples. It's
still worth having because it's the unit that will grow (filtering,
enrichment, mapping to a different response shape) as real requirements
arrive.

## 8. Driven adapter

### 8.1 `UpstreamHttpError` (`src/adapters/http-clients/UpstreamHttpError.ts`)

```ts
export class UpstreamHttpError extends Error {
  constructor(message: string, readonly status?: number, cause?: unknown) {
    super(message, cause !== undefined ? { cause } : undefined);
    this.name = 'UpstreamHttpError';
  }
}
```

Deliberately a plain `Error`, not a `DomainError`: core must not know about
HTTP. The existing `createErrorHandler` middleware falls through to a 500 for
any unknown error, which is the right default for an upstream failure. If
later we want a 502 specifically, we add a branch in the middleware —
outside the scope of this design.

### 8.2 `reqresSchemas.ts`

Zod schema mirroring **only the fields we consume**. Reqres's `page`,
`per_page`, `total`, `total_pages`, and `support` are intentionally omitted;
Zod strips unknown keys by default.

```ts
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
```

### 8.3 `ReqresUserRepository` (`src/adapters/http-clients/ReqresUserRepository.ts`)

Constructor options:

- `baseUrl: string` (e.g. `https://reqres.in`)
- `apiKey: string` (sent as `x-api-key`)
- `timeoutMs?: number` — default **5000**
- `fetch?: typeof fetch` — test seam; defaults to `globalThis.fetch`

Also takes `LoggerPort` via a second constructor parameter (matching the
convention of `CheckHealthUseCase`).

`listUsers()` flow:

1. Build URL: `${baseUrl}/api/users`.
2. Call `fetch` with headers `{ 'x-api-key': apiKey, accept: 'application/json' }`
   and `signal: AbortSignal.timeout(timeoutMs)`.
3. If `!res.ok`: log `warn`, throw `new UpstreamHttpError(\`reqres ${status}\`, status)`.
4. Parse JSON. If `ZodError` is thrown on validation, catch it and re-throw
   as `new UpstreamHttpError('reqres response schema drift', undefined, zodErr)`.
5. Map each `{ id, email, first_name, last_name, avatar }` → `new User(id, email, first_name, last_name, avatar)`.
6. Return `readonly User[]`.

Network errors (DNS, refused, timeout via `AbortError`) propagate naturally;
the middleware returns 500. Acceptable for a template — a production version
would likely wrap them to `UpstreamHttpError` too, but keeping it narrow
keeps the example small.

## 9. HTTP slice (driving)

### 9.1 Response schema (`src/adapters/http/schemas/usersSchemas.ts`)

Zod schemas for **our** `/users` response, registered with OpenAPI:

```ts
export const UserSchema = z.object({
  id: z.number().int(),
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
  avatarUrl: z.string().url(),
}).openapi('User');

export const ListUsersResponseSchema = z.object({
  users: z.array(UserSchema),
}).openapi('ListUsersResponse');
```

`openApiRegistry.registerPath(...)` registers `GET /users` with a 200
response returning `ListUsersResponseSchema`.

### 9.2 `UsersController`

`handleListUsers(req, res, next)`:

1. `const users = await this.useCase.execute()`.
2. Build body: `{ users: users.map(u => ({ id, email, firstName, lastName, avatarUrl })) }`.
3. `const body = ListUsersResponseSchema.parse(body)` — same serialization
   pattern as `HelloWorldController`.
4. `res.status(200).json(body)`.
5. Wrap in `try/catch` and forward errors via `next(err)`.

### 9.3 Route (`usersRoutes.ts`)

Factory `createUsersRouter(controller)` returning a `Router` with
`router.get('/users', controller.handleListUsers.bind(controller))`.

## 10. Config

Extend `EnvSchema` in `src/config/env.ts`:

```ts
REQRES_BASE_URL: z.string().url().default('https://reqres.in'),
REQRES_API_KEY: z.string().min(1),
```

`REQRES_API_KEY` is required — boot fails with the existing human-readable
error if missing, consistent with the rest of the template.

`.env.example` gains:

```
REQRES_BASE_URL=https://reqres.in
REQRES_API_KEY=reqres_258cb2328d1d47cc9d830db0772390f9
```

README's env-vars table gains two rows.

## 11. Composition (DI wiring)

In `buildContainer(env)`:

```ts
const userRepository = new ReqresUserRepository(
  { baseUrl: env.REQRES_BASE_URL, apiKey: env.REQRES_API_KEY },
  logger,
);
const listUsers = new ListUsersUseCase(userRepository, logger);
const usersController = new UsersController(listUsers);
const usersRouter = createUsersRouter(usersController);
// …then add `usersRouter` to the HttpServer `routers` array.
```

`buildContainer` gains an optional second parameter for test-only overrides:

```ts
export interface ContainerOverrides {
  readonly fetch?: typeof fetch;
}

export function buildContainer(env: Env, overrides?: ContainerOverrides): Container {
  // …
  const userRepository = new ReqresUserRepository(
    { baseUrl: env.REQRES_BASE_URL, apiKey: env.REQRES_API_KEY, fetch: overrides?.fetch },
    logger,
  );
  // …
}
```

Production callers continue to invoke `buildContainer(env)` unchanged.

## 12. Testing

All four test files follow existing patterns.

### 12.1 Unit — `ListUsersUseCase.test.ts`

- `FakeUserRepository implements UserRepositoryPort` with a preset
  `User[]`; reuse the existing `FakeLogger` pattern.
- Assert `execute()` returns that array.
- Assert it logs one info line.

### 12.2 Unit — `ReqresUserRepository.test.ts`

Helper `fakeFetch(response: Partial<Response>) => typeof fetch`. Cases:

1. **Happy path**: fake returns `{ ok: true, json: async () => ({ data: [...] }) }`.
   Assert mapped `User[]` with camelCase fields.
2. **Header correctness**: capture the `RequestInit`; assert
   `headers['x-api-key']` equals the configured key.
3. **URL correctness**: assert called with `${baseUrl}/api/users`.
4. **Non-2xx**: `ok: false, status: 401` → throws `UpstreamHttpError` with
   `status === 401`.
5. **Schema drift**: response missing `data` → throws `UpstreamHttpError`
   whose `cause` is a `ZodError`.

### 12.3 Unit — `env.test.ts` (extended)

Extend the existing file:

- `REQRES_API_KEY` missing → parse fails.
- `REQRES_BASE_URL` absent → defaults to `https://reqres.in`.
- Both provided → parses.

### 12.4 Integration — `users.integration.test.ts`

- Build container with `buildContainer(env, { fetch: fakeFetch })`.
- `supertest(app).get('/users')` → 200, body matches `ListUsersResponseSchema`.
- A second case: fake returns `ok: false, status: 502` → our response is 500
  (unknown-error path in the existing middleware).

No real network traffic anywhere in the test suite.

## 13. README updates

- Add `REQRES_BASE_URL` and `REQRES_API_KEY` rows to the env-vars table.
- One paragraph under the architecture section pointing at
  `adapters/http-clients/` as the driven-HTTP example, and at
  `GET /users` as the corresponding end-to-end slice.

## 14. Out of scope (YAGNI)

- Pagination on `/users` (user chose to drop it).
- Retry / backoff logic.
- Response caching.
- A `GET /users/:id` single-user endpoint.
- Wrapping network errors (DNS / connection refused / abort) as
  `UpstreamHttpError` — they pass through as 500s; fine for a template.
- Differentiated middleware mapping of `UpstreamHttpError` (e.g. 502 vs 500).
  The default 500 is acceptable for now.
