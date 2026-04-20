# TypeScript Hexagonal Template — Design

**Date:** 2026-04-20
**Owner:** Javi
**Status:** Approved (design phase)

## 1. Purpose

A starter repository template for TypeScript backend services that demonstrates
hexagonal architecture (Ports & Adapters) with object-oriented design and
manual dependency injection. The template ships a working `GET /health`
endpoint wired end-to-end so future features can be added by copying the
pattern.

The template is explicitly **didactic**: structure, naming, and example code
are optimized for a reader learning how to build the next feature.

## 2. Requirements (from user)

1. Follows hexagonal architecture: pure core free of external implementations,
   adapters connecting to the outside.
2. Uses OOP with dependency injection.
3. REST API exposed via Express; a `/health` endpoint implemented and wired
   through all layers as a reference example.
4. Basic test suite that also serves as a reference example for future
   implementations.
5. OpenAPI configuration (Swagger UI).
6. README with clear installation instructions and prerequisites (Node,
   TypeScript, etc.).

## 3. Technology decisions

| Area | Choice | Why |
|---|---|---|
| Language | TypeScript (`strict: true`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`) | Maximum type safety from day one; easier to start strict than to migrate later. |
| Runtime | Node 22 LTS | Active LTS until Oct 2027; native `--env-file`; latest V8. |
| HTTP framework | Express 5 | Widely known; Express 5 captures async rejections automatically. |
| DI approach | Manual constructor injection | Keeps the dependency graph visible; core stays 100% free of decorators/frameworks. |
| Validation & OpenAPI | `zod` + `@asteasolutions/zod-to-openapi` | Single source of truth for runtime validation, TS types, and OpenAPI spec. |
| Logger | `pino` via a `LoggerPort` in core | Structured JSON logs; demonstrates a second port/adapter pair. |
| Test runner | `vitest` | Native TS & ESM support; Jest-compatible API; fast. |
| HTTP test client | `supertest` | Standard for integration testing Express apps. |
| Lint + format | `biome` | Single tool; fast; native enforcement of the dependency-direction rule via `no-restricted-imports`. |
| Package manager | `npm` | Universal; no setup friction. |
| Env loading | Node native `--env-file` | Zero dependency; replaces `dotenv`. |
| Config validation | `zod` schema over `process.env` | Fail fast at boot with a readable error. |
| Dev runner | `tsx watch` | Runs TS directly in watch mode; no build step for development. |

## 4. Directory layout

```
src/
├── core/
│   ├── domain/
│   │   ├── errors/
│   │   │   └── DomainError.ts               # abstract base error class
│   │   └── health/
│   │       └── HealthStatus.ts              # value object
│   ├── application/
│   │   └── health/
│   │       └── CheckHealthUseCase.ts        # use case
│   └── ports/
│       └── LoggerPort.ts                    # interface the core needs
├── adapters/
│   ├── http/                                # Express: HTTP entry
│   │   ├── HttpServer.ts
│   │   ├── controllers/
│   │   │   └── HealthController.ts
│   │   ├── routes/
│   │   │   └── healthRoutes.ts
│   │   ├── schemas/
│   │   │   └── healthSchemas.ts             # zod + OpenAPI registry
│   │   ├── middleware/
│   │   │   └── errorHandler.ts
│   │   └── openapi/
│   │       └── openApiDocument.ts           # builds OpenAPI spec
│   └── logging/                             # pino: LoggerPort impl
│       └── PinoLoggerAdapter.ts
├── config/
│   └── env.ts                               # zod-validated env parsing
├── composition/
│   └── container.ts                         # manual DI wiring
└── main.ts                                  # entrypoint

tests/
├── unit/
│   └── core/application/health/
│       └── CheckHealthUseCase.test.ts
└── integration/
    └── http/
        └── health.integration.test.ts
```

Root files: `package.json`, `tsconfig.json`, `vitest.config.ts`, `biome.json`,
`.env.example`, `.gitignore`, `.nvmrc`, `README.md`.

### 4.1 Core rules (documented in README)

1. **Dependency direction:** `adapters/` and `composition/` may import from
   `core/`; `core/` may **never** import from `adapters/`, `composition/`, or
   third-party libraries (except pure types). Enforced by a Biome
   `no-restricted-imports` rule.
2. **Ports live in `core/ports/`,** not in `adapters/`. The core defines the
   interface; the adapter implements it.
3. **One port per file, one adapter per file,** with explicit PascalCase
   naming (`LoggerPort`, `PinoLoggerAdapter`).

The distinction between "driving" and "driven" adapters is not reflected in
folder structure; it is implicit in the relationship between each adapter and
the core (whether it calls into the core or implements a port of the core).
The README explains this in plain language.

## 5. Component responsibilities

### 5.1 Core

- **`core/domain/health/HealthStatus.ts`** — Value object with `status: 'ok'`,
  `timestamp: Date`, `uptimeSeconds: number`. Constructor validates invariants.
- **`core/application/health/CheckHealthUseCase.ts`** — Class with an
  `execute(): HealthStatus` method. Receives `LoggerPort` via constructor.
  Logs `"health check requested"` and returns a new `HealthStatus`.
- **`core/ports/LoggerPort.ts`** — Interface with `info`, `warn`, `error`,
  `debug` methods. Each accepts a message string and an optional context
  object (for structured logging).
- **`core/domain/errors/DomainError.ts`** — Abstract base class for domain
  errors. Subclasses define a `code: string`. The health feature does not
  need any subclass today; the base is in place as a template for future
  features.

### 5.2 Adapter — HTTP

- **`HttpServer.ts`** — Wraps Express. Constructor receives
  `{ controllers, logger, openApiDoc }`. Methods `start(port)` and `stop()`
  (promisified `server.close()` for graceful shutdown). Applies base
  middleware: `express.json()`, request logger, `errorHandler` (last).
  Exposes a read-only `expressApp` getter used by integration tests.
- **`controllers/HealthController.ts`** — Class with
  `handleGetHealth(req, res, next)`. Constructor receives
  `CheckHealthUseCase`. Translates HTTP ↔ domain only — no business logic.
- **`schemas/healthSchemas.ts`** — Defines `HealthResponseSchema` with zod,
  registers it in the shared `OpenAPIRegistry`, and exports the inferred TS
  type. One file = one source of truth for validation + types + OpenAPI
  fragment.
- **`routes/healthRoutes.ts`** — Factory `createHealthRouter(controller)` that
  returns a configured `express.Router`. Separating routes from controllers
  lets the controller be tested without Express (if desired).
- **`middleware/errorHandler.ts`** — Four-argument Express error middleware.
  Mapping:
  - `ZodError` → 400 `{ error: 'ValidationError', issues }`
  - `DomainError` subclass → mapped status (lookup table lives in the
    middleware, not in the core) with `{ error: err.code, message: err.message }`
  - Anything else → 500 `{ error: 'InternalServerError', message: 'Unexpected error' }`
  - Always logs via `LoggerPort`: `warn` for 4xx, `error` for 5xx (with
    stack). Stack never leaks to the client response.
- **`openapi/openApiDocument.ts`** — `buildOpenApiDocument(registry)` returns
  the OpenAPI 3.1 document. Served at `/docs` (Swagger UI) and
  `/openapi.json` (raw JSON).

### 5.3 Adapter — Logging

- **`PinoLoggerAdapter.ts`** — Implements `LoggerPort` using `pino`.
  Constructor takes `{ level, pretty }`. In development, uses `pino-pretty`
  transport. In production, emits JSON to stdout.

### 5.4 Config

- **`config/env.ts`** — `EnvSchema` (zod) with `NODE_ENV`, `PORT`, `LOG_LEVEL`.
  Parses `process.env` at module load. On failure, prints the zod error in
  human-readable form and calls `process.exit(1)`. Exports
  `env: z.infer<typeof EnvSchema>`.

### 5.5 Composition

- **`composition/container.ts`** — Function
  `buildContainer(env): { httpServer }`. Builds the dependency graph by hand.
  The only file in `src/` allowed to instantiate adapter classes.

### 5.6 Entrypoint

- **`main.ts`** — Loads `env`, calls `buildContainer(env)`, starts the HTTP
  server, registers `SIGTERM`/`SIGINT` handlers for graceful shutdown
  (`server.close()` promisified, then `process.exit(0)`). Registers
  `unhandledRejection` and `uncaughtException` handlers that log and exit `1`.

## 6. Request flow for `GET /health`

At boot (once):

1. `main.ts` loads env via `config/env.ts`.
2. `main.ts` calls `buildContainer(env)`, which instantiates
   `PinoLoggerAdapter` → `CheckHealthUseCase(logger)` →
   `HealthController(checkHealthUseCase)` → `buildOpenApiDocument(registry)` →
   `HttpServer({ controllers, logger, openApiDoc })`.
3. `main.ts` calls `httpServer.start(env.PORT)`.

Per request:

1. Express receives `GET /health`.
2. Base middleware runs (`express.json()`, request logger).
3. Router dispatches to `HealthController.handleGetHealth`.
4. Controller calls `checkHealthUseCase.execute()`.
5. Use case calls `this.logger.info('health check requested')` and returns a
   `HealthStatus`.
6. Controller parses the response through `HealthResponseSchema` (defensive
   validation) and sends JSON with status 200.

Response body:

```json
{
  "status": "ok",
  "timestamp": "2026-04-20T14:05:22.481Z",
  "uptimeSeconds": 12.34
}
```

On `SIGTERM` / `SIGINT`: `httpServer.stop()` closes the server (drains
in-flight requests), then `process.exit(0)`.

## 7. Error handling

Two layers:

1. **Core** throws subclasses of `DomainError`. Never throws bare `Error`.
   Never references HTTP concepts.
2. **Adapter HTTP** has one centralized error middleware that maps error
   types to status codes (see 5.2). The mapping table lives in the adapter.

### Explicitly not included (YAGNI)

- No per-handler try/catch — Express 5 captures async rejections.
- No `http-errors` or similar library.
- No numeric error codes or i18n — messages are English; client formats
  them.

### Boot-time errors

- Env parse failure → print readable error, exit 1.
- `httpServer.start` failure → log error, exit 1.
- `unhandledRejection` / `uncaughtException` → log, exit 1. Policy is
  fail-fast; no recovery.

## 8. Testing

Two levels.

### 8.1 Unit — `tests/unit/core/application/health/CheckHealthUseCase.test.ts`

Demonstrates isolating the core with a manual **fake** of `LoggerPort` (no
mocking library). Assertions:

- Returns an `HealthStatus` with `status === 'ok'`, a valid `Date` timestamp,
  and `uptimeSeconds >= 0`.
- Logs `'health check requested'` at `info` level exactly once.

The template intentionally uses a hand-written `FakeLogger` class (not
`vi.fn()`) to emphasize that ports are interfaces and any implementing class
is a valid test double.

### 8.2 Integration — `tests/integration/http/health.integration.test.ts`

Demonstrates testing the HTTP adapter with the **real** DI graph (no fakes)
via `supertest`. Assertions:

- `GET /health` → 200 with a body matching
  `{ status: 'ok', uptimeSeconds: number, timestamp: parseable ISO }`.
- `GET /openapi.json` → 200 with `openapi: '3.x'` and a path for `/health`.

Key decisions:

- Supertest uses an ephemeral port internally; we pass `app` not a running
  server, so no port management is needed.
- `HttpServer` exposes `expressApp` via a getter (commented as "for
  integration tests").
- `LOG_LEVEL: 'silent'` suppresses pino output during tests.

### 8.3 Vitest config

- `globals: false` — explicit imports of `describe`/`it`/`expect`.
- Separate globs for unit vs integration (scripts `test:unit`,
  `test:integration`).
- Coverage via `v8`. Initial thresholds `lines: 70` (low on purpose; README
  documents raising to ≥90% on `core/` as the project matures).

### 8.4 Naming conventions (established by the template)

- `*.test.ts` → unit.
- `*.integration.test.ts` → integration.
- `tests/` mirrors `src/` one-to-one.

## 9. Tooling

### 9.1 TypeScript

- Target `ES2023`, module `NodeNext`.
- `strict: true`, `noUncheckedIndexedAccess: true`,
  `exactOptionalPropertyTypes: true`, `noImplicitOverride: true`.
- Source in `src/`, output to `dist/`.

### 9.2 Biome

- Base config: recommended rules.
- Custom rule: `no-restricted-imports` forbids importing from
  `src/adapters/**` or `src/composition/**` within `src/core/**`. This
  enforces the dependency-direction rule automatically on every lint run and
  in CI.

### 9.3 Scripts (`package.json`)

```json
{
  "scripts": {
    "dev": "tsx watch src/main.ts",
    "build": "tsc",
    "start": "node --env-file=.env dist/main.js",
    "test": "vitest run",
    "test:unit": "vitest run tests/unit",
    "test:integration": "vitest run tests/integration",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "lint": "biome check .",
    "lint:fix": "biome check --write .",
    "typecheck": "tsc --noEmit",
    "check": "npm run typecheck && npm run lint && npm run test"
  }
}
```

### 9.4 Git hygiene

- `.nvmrc` with `22`.
- `.gitignore` for Node (`node_modules`, `dist`, `.env`, `coverage`).
- No husky/lint-staged at start (YAGNI). CI runs `npm run check`.

## 10. README contents

1. **Prerequisites:** install Node 22 (recommended via `nvm`:
   `nvm install 22 && nvm use 22`).
2. **Quick start:** `git clone` → `cp .env.example .env` → `npm install` →
   `npm run dev` → open `http://localhost:3000/health` and
   `http://localhost:3000/docs`.
3. **Architecture:** ASCII diagram of the layers plus the dependency rule
   explained in 3–4 paragraphs.
4. **How to add a new endpoint/feature:** step-by-step (domain → port if
   needed → use case → zod schema → controller → route → container wiring →
   tests). This is the main didactic payload of the template.
5. **Available scripts:** table of each script with its purpose.
6. **Troubleshooting:** port-in-use, `.env` parse failure, etc.

## 11. Out of scope (explicit non-goals)

- No database / persistence adapter. The template demonstrates the pattern
  with the `LoggerPort`; adding a repository is a future exercise using the
  same recipe documented in the README.
- No authentication / authorization.
- No CI/CD configuration files (a future follow-up; `npm run check`
  captures the intent).
- No Dockerfile.
- No end-to-end tests that spin up the server on a fixed port.
- No husky, lint-staged, or commit message linting.
- No i18n; no numeric error-code registry.
