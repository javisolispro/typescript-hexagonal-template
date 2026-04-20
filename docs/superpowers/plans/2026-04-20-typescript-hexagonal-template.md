# TypeScript Hexagonal Template Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-ready TypeScript backend template that demonstrates hexagonal architecture with a working `GET /health` endpoint wired end-to-end, serving as a reference for future feature implementations.

**Architecture:** Pure core (`src/core/`) with domain + use cases + ports; outer `src/adapters/` grouping HTTP (Express 5) and logging (pino); manual constructor injection assembled in `src/composition/container.ts`; `src/main.ts` as the entrypoint. Dependency direction enforced by a Biome `no-restricted-imports` rule.

**Tech Stack:** Node 22, TypeScript (strict), Express 5, zod + @asteasolutions/zod-to-openapi, swagger-ui-express, pino, Vitest, Supertest, Biome. npm as package manager. Native `--env-file` for env loading.

**Conventions locked by this plan:**
- `NodeNext` module resolution — all relative imports include the `.js` extension in source (e.g. `import { X } from './x.js'`). TS rewrites them correctly.
- Relative imports everywhere; tests mirror `src/` layout and reach into `../../../src/...`. Zero path alias config.
- One file = one exported class or type/interface group. File name matches the main export.
- Each task ends with a commit.

---

## Task 1: Initialize the Node/TypeScript project

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.nvmrc`
- Create: `.gitignore`

- [ ] **Step 1: Create `.nvmrc`**

File: `.nvmrc`

```
22
```

- [ ] **Step 2: Create `.gitignore`**

File: `.gitignore`

```
node_modules/
dist/
coverage/
.env
.env.*
!.env.example
*.log
.DS_Store
```

- [ ] **Step 3: Create `package.json`**

Run:

```bash
npm init -y
```

Then replace the generated file with:

File: `package.json`

```json
{
  "name": "typescript-hexagonal-template",
  "version": "0.1.0",
  "description": "TypeScript backend template with hexagonal architecture, Express, Zod-driven OpenAPI, pino logging, and Vitest.",
  "private": true,
  "type": "module",
  "engines": {
    "node": ">=22.0.0"
  },
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

- [ ] **Step 4: Create `tsconfig.json`**

File: `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2023",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2023"],
    "rootDir": "src",
    "outDir": "dist",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": false,
    "sourceMap": true,
    "resolveJsonModule": true,
    "verbatimModuleSyntax": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

- [ ] **Step 5: Install runtime and dev dependencies**

Run:

```bash
npm install express pino zod @asteasolutions/zod-to-openapi swagger-ui-express
npm install -D typescript tsx vitest @vitest/coverage-v8 supertest @types/express @types/swagger-ui-express @types/supertest @types/node @biomejs/biome pino-pretty
```

Expected: both commands exit 0 and `package-lock.json` is created.

- [ ] **Step 6: Verify TypeScript compiles an empty source tree**

Create empty placeholder so `tsc` has something to find:

```bash
mkdir -p src && echo 'export {};' > src/placeholder.ts
npx tsc --noEmit
```

Expected: no output, exit 0.

Then delete the placeholder:

```bash
rm src/placeholder.ts
```

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json tsconfig.json .nvmrc .gitignore
git commit -m "chore: initialize Node 22 + TypeScript project with locked deps"
```

---

## Task 2: Configure Vitest

**Files:**
- Create: `vitest.config.ts`
- Create: `tests/smoke.test.ts` (temporary; removed at end of task)

- [ ] **Step 1: Write a smoke test that must fail (no source yet)**

File: `tests/smoke.test.ts`

```ts
import { describe, it, expect } from 'vitest';

describe('vitest smoke', () => {
  it('arithmetic works', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 2: Create `vitest.config.ts`**

File: `vitest.config.ts`

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: false,
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/main.ts', 'src/**/index.ts'],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 60,
        statements: 70,
      },
    },
  },
});
```

- [ ] **Step 3: Run the smoke test**

```bash
npx vitest run tests/smoke.test.ts
```

Expected: 1 test passed.

- [ ] **Step 4: Delete the smoke test**

```bash
rm tests/smoke.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add vitest.config.ts
git commit -m "chore: configure Vitest with explicit imports and v8 coverage"
```

---

## Task 3: Configure Biome with the dependency-direction rule

**Files:**
- Create: `biome.json`

- [ ] **Step 1: Create `biome.json`**

File: `biome.json`

```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "vcs": {
    "enabled": true,
    "clientKind": "git",
    "useIgnoreFile": true
  },
  "files": {
    "ignore": ["dist", "coverage", "node_modules"]
  },
  "organizeImports": {
    "enabled": true
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "style": {
        "useImportType": "error",
        "noNonNullAssertion": "warn"
      },
      "suspicious": {
        "noExplicitAny": "error"
      }
    }
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "semicolons": "always",
      "trailingCommas": "all"
    }
  },
  "overrides": [
    {
      "include": ["src/core/**/*.ts"],
      "linter": {
        "rules": {
          "style": {
            "noRestrictedImports": {
              "level": "error",
              "options": {
                "paths": {
                  "express": "core/ must not depend on Express. Use a port.",
                  "pino": "core/ must not depend on pino. Use a port.",
                  "zod": "core/ must not depend on Zod. Zod lives in adapters.",
                  "@asteasolutions/zod-to-openapi": "core/ must not depend on OpenAPI libraries.",
                  "swagger-ui-express": "core/ must not depend on Swagger UI.",
                  "supertest": "core/ must not depend on HTTP testing libraries."
                }
              }
            }
          }
        }
      }
    }
  ]
}
```

> **Note on the rule:** Biome's `noRestrictedImports` enforces the "core is pure" rule at the package level. It cannot (as of 1.9) match arbitrary path globs for in-repo imports, so `core/` importing from `../adapters/...` would not be caught directly — but because `core/` never imports Express/pino/zod, and any cross-layer import would require importing one of those transitively through the adapters, this lint rule plus code review is sufficient for a template. A future hardening step is to add a test that greps `src/core/` for any `from '../adapters` or `from '../../adapters`.

- [ ] **Step 2: Run lint on the empty source tree**

```bash
npm run lint
```

Expected: `Checked 0 files` or equivalent clean output.

- [ ] **Step 3: Commit**

```bash
git add biome.json
git commit -m "chore: configure Biome with dependency-direction rule for core"
```

---

## Task 4: Env schema and loading

**Files:**
- Create: `src/config/env.ts`
- Create: `tests/unit/config/env.test.ts`

- [ ] **Step 1: Write a failing test for the env schema**

File: `tests/unit/config/env.test.ts`

```ts
import { describe, it, expect } from 'vitest';
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
    expect(() =>
      parseEnv({ NODE_ENV: 'development', LOG_LEVEL: 'verbose' as never }),
    ).toThrow();
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

```bash
npx vitest run tests/unit/config/env.test.ts
```

Expected: fails because `src/config/env.ts` does not exist.

- [ ] **Step 3: Implement `src/config/env.ts`**

File: `src/config/env.ts`

```ts
import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  PORT: z.coerce.number().int().min(0).max(65535).default(3000),
  LOG_LEVEL: z
    .enum(['silent', 'trace', 'debug', 'info', 'warn', 'error', 'fatal'])
    .default('info'),
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

- [ ] **Step 4: Run the test and confirm it passes**

```bash
npx vitest run tests/unit/config/env.test.ts
```

Expected: 6 tests passed.

- [ ] **Step 5: Commit**

```bash
git add src/config/env.ts tests/unit/config/env.test.ts
git commit -m "feat(config): add Zod-validated env schema with loadEnvOrExit"
```

---

## Task 5: Domain — `HealthStatus` value object

**Files:**
- Create: `src/core/domain/health/HealthStatus.ts`
- Create: `tests/unit/core/domain/health/HealthStatus.test.ts`

- [ ] **Step 1: Write a failing test**

File: `tests/unit/core/domain/health/HealthStatus.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { HealthStatus } from '../../../../../src/core/domain/health/HealthStatus.js';

describe('HealthStatus', () => {
  it('exposes status, timestamp, and uptimeSeconds', () => {
    const now = new Date('2026-04-20T12:00:00.000Z');
    const status = new HealthStatus('ok', now, 42.5);

    expect(status.status).toBe('ok');
    expect(status.timestamp).toEqual(now);
    expect(status.uptimeSeconds).toBe(42.5);
  });

  it('rejects negative uptime', () => {
    expect(() => new HealthStatus('ok', new Date(), -1)).toThrow(
      'uptimeSeconds must be non-negative',
    );
  });

  it('rejects an invalid status string', () => {
    expect(() => new HealthStatus('bogus' as never, new Date(), 0)).toThrow();
  });

  it('is a read-only value object', () => {
    const status = new HealthStatus('ok', new Date(), 0);
    expect(() => {
      (status as unknown as { status: string }).status = 'mutated';
    }).toThrow();
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

```bash
npx vitest run tests/unit/core/domain/health/HealthStatus.test.ts
```

Expected: fails (module not found).

- [ ] **Step 3: Implement `HealthStatus`**

File: `src/core/domain/health/HealthStatus.ts`

```ts
export type HealthStatusCode = 'ok';

const VALID_CODES: ReadonlySet<HealthStatusCode> = new Set(['ok']);

export class HealthStatus {
  readonly status: HealthStatusCode;
  readonly timestamp: Date;
  readonly uptimeSeconds: number;

  constructor(status: HealthStatusCode, timestamp: Date, uptimeSeconds: number) {
    if (!VALID_CODES.has(status)) {
      throw new Error(`Invalid HealthStatus code: ${status}`);
    }
    if (uptimeSeconds < 0) {
      throw new Error('uptimeSeconds must be non-negative');
    }

    this.status = status;
    this.timestamp = timestamp;
    this.uptimeSeconds = uptimeSeconds;

    Object.freeze(this);
  }
}
```

- [ ] **Step 4: Run the test and confirm it passes**

```bash
npx vitest run tests/unit/core/domain/health/HealthStatus.test.ts
```

Expected: 4 tests passed.

- [ ] **Step 5: Commit**

```bash
git add src/core/domain/health/HealthStatus.ts tests/unit/core/domain/health/HealthStatus.test.ts
git commit -m "feat(core): add HealthStatus value object with invariants"
```

---

## Task 6: Domain — `DomainError` base class

**Files:**
- Create: `src/core/domain/errors/DomainError.ts`
- Create: `tests/unit/core/domain/errors/DomainError.test.ts`

- [ ] **Step 1: Write a failing test**

File: `tests/unit/core/domain/errors/DomainError.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { DomainError } from '../../../../../src/core/domain/errors/DomainError.js';

class SampleNotFoundError extends DomainError {
  readonly code = 'SampleNotFound';
}

describe('DomainError', () => {
  it('is an Error subclass with a code and a name matching the subclass', () => {
    const err = new SampleNotFoundError('widget 42 not found');

    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(DomainError);
    expect(err.name).toBe('SampleNotFoundError');
    expect(err.code).toBe('SampleNotFound');
    expect(err.message).toBe('widget 42 not found');
  });

  it('preserves the cause when provided', () => {
    const root = new Error('db timeout');
    const err = new SampleNotFoundError('wrapped failure', root);

    expect(err.cause).toBe(root);
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

```bash
npx vitest run tests/unit/core/domain/errors/DomainError.test.ts
```

Expected: fails (module not found).

- [ ] **Step 3: Implement `DomainError`**

File: `src/core/domain/errors/DomainError.ts`

```ts
export abstract class DomainError extends Error {
  abstract readonly code: string;

  constructor(message: string, cause?: unknown) {
    super(message, cause !== undefined ? { cause } : undefined);
    this.name = this.constructor.name;
  }
}
```

- [ ] **Step 4: Run the test and confirm it passes**

```bash
npx vitest run tests/unit/core/domain/errors/DomainError.test.ts
```

Expected: 2 tests passed.

- [ ] **Step 5: Commit**

```bash
git add src/core/domain/errors/DomainError.ts tests/unit/core/domain/errors/DomainError.test.ts
git commit -m "feat(core): add DomainError abstract base class"
```

---

## Task 7: Core port — `LoggerPort`

**Files:**
- Create: `src/core/ports/LoggerPort.ts`

This task has no test — an interface has no runtime behavior. It will be exercised by the use case tests (Task 8).

- [ ] **Step 1: Create the port interface**

File: `src/core/ports/LoggerPort.ts`

```ts
export type LogContext = Readonly<Record<string, unknown>>;

export interface LoggerPort {
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
  debug(message: string, context?: LogContext): void;
}
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add src/core/ports/LoggerPort.ts
git commit -m "feat(core): add LoggerPort interface"
```

---

## Task 8: Use case — `CheckHealthUseCase` (TDD with `FakeLogger`)

**Files:**
- Create: `src/core/application/health/CheckHealthUseCase.ts`
- Create: `tests/unit/core/application/health/CheckHealthUseCase.test.ts`

- [ ] **Step 1: Write the failing test with a hand-written `FakeLogger`**

File: `tests/unit/core/application/health/CheckHealthUseCase.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { CheckHealthUseCase } from '../../../../../src/core/application/health/CheckHealthUseCase.js';
import type { LoggerPort, LogContext } from '../../../../../src/core/ports/LoggerPort.js';

class FakeLogger implements LoggerPort {
  readonly calls: Array<{ level: 'info' | 'warn' | 'error' | 'debug'; message: string; context?: LogContext }> = [];

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

describe('CheckHealthUseCase', () => {
  it('returns an "ok" HealthStatus with a valid timestamp and non-negative uptime', () => {
    const logger = new FakeLogger();
    const sut = new CheckHealthUseCase(logger);

    const result = sut.execute();

    expect(result.status).toBe('ok');
    expect(result.timestamp).toBeInstanceOf(Date);
    expect(Number.isNaN(result.timestamp.getTime())).toBe(false);
    expect(result.uptimeSeconds).toBeGreaterThanOrEqual(0);
  });

  it('logs an info message each time it is executed', () => {
    const logger = new FakeLogger();
    const sut = new CheckHealthUseCase(logger);

    sut.execute();

    expect(logger.calls).toHaveLength(1);
    expect(logger.calls[0]).toMatchObject({
      level: 'info',
      message: 'health check requested',
    });
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

```bash
npx vitest run tests/unit/core/application/health/CheckHealthUseCase.test.ts
```

Expected: fails (module not found).

- [ ] **Step 3: Implement the use case**

File: `src/core/application/health/CheckHealthUseCase.ts`

```ts
import { HealthStatus } from '../../domain/health/HealthStatus.js';
import type { LoggerPort } from '../../ports/LoggerPort.js';

export class CheckHealthUseCase {
  constructor(private readonly logger: LoggerPort) {}

  execute(): HealthStatus {
    this.logger.info('health check requested');
    return new HealthStatus('ok', new Date(), process.uptime());
  }
}
```

- [ ] **Step 4: Run the test and confirm it passes**

```bash
npx vitest run tests/unit/core/application/health/CheckHealthUseCase.test.ts
```

Expected: 2 tests passed.

- [ ] **Step 5: Commit**

```bash
git add src/core/application/health/CheckHealthUseCase.ts tests/unit/core/application/health/CheckHealthUseCase.test.ts
git commit -m "feat(core): add CheckHealthUseCase with logger port"
```

---

## Task 9: Driven adapter — `PinoLoggerAdapter`

**Files:**
- Create: `src/adapters/logging/PinoLoggerAdapter.ts`
- Create: `tests/unit/adapters/logging/PinoLoggerAdapter.test.ts`

- [ ] **Step 1: Write a failing test that verifies the adapter wraps pino and logs at each level**

File: `tests/unit/adapters/logging/PinoLoggerAdapter.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { Writable } from 'node:stream';
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
```

- [ ] **Step 2: Run the test and confirm it fails**

```bash
npx vitest run tests/unit/adapters/logging/PinoLoggerAdapter.test.ts
```

Expected: fails (module not found).

- [ ] **Step 3: Implement `PinoLoggerAdapter`**

File: `src/adapters/logging/PinoLoggerAdapter.ts`

```ts
import { pino, type Logger as PinoLogger, type DestinationStream } from 'pino';
import type { LogContext, LoggerPort } from '../../core/ports/LoggerPort.js';

export interface PinoLoggerOptions {
  readonly level: 'silent' | 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  readonly pretty?: boolean;
  readonly destination?: DestinationStream;
}

export class PinoLoggerAdapter implements LoggerPort {
  private readonly logger: PinoLogger;

  constructor(options: PinoLoggerOptions) {
    const transport =
      options.pretty && !options.destination
        ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:standard' } }
        : undefined;

    this.logger = pino(
      { level: options.level, ...(transport ? { transport } : {}) },
      options.destination,
    );
  }

  info(message: string, context?: LogContext): void {
    this.logger.info(context ?? {}, message);
  }
  warn(message: string, context?: LogContext): void {
    this.logger.warn(context ?? {}, message);
  }
  error(message: string, context?: LogContext): void {
    this.logger.error(context ?? {}, message);
  }
  debug(message: string, context?: LogContext): void {
    this.logger.debug(context ?? {}, message);
  }
}
```

- [ ] **Step 4: Run the test and confirm it passes**

```bash
npx vitest run tests/unit/adapters/logging/PinoLoggerAdapter.test.ts
```

Expected: 2 tests passed.

- [ ] **Step 5: Commit**

```bash
git add src/adapters/logging/PinoLoggerAdapter.ts tests/unit/adapters/logging/PinoLoggerAdapter.test.ts
git commit -m "feat(adapters): add PinoLoggerAdapter implementing LoggerPort"
```

---

## Task 10: HTTP schemas — `healthSchemas` with Zod + OpenAPI registry

**Files:**
- Create: `src/adapters/http/openapi/registry.ts`
- Create: `src/adapters/http/schemas/healthSchemas.ts`
- Create: `tests/unit/adapters/http/schemas/healthSchemas.test.ts`

- [ ] **Step 1: Create the shared OpenAPI registry**

File: `src/adapters/http/openapi/registry.ts`

```ts
import { OpenAPIRegistry, extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

extendZodWithOpenApi(z);

export const openApiRegistry = new OpenAPIRegistry();
```

- [ ] **Step 2: Write a failing test for `healthSchemas`**

File: `tests/unit/adapters/http/schemas/healthSchemas.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { HealthResponseSchema } from '../../../../../src/adapters/http/schemas/healthSchemas.js';

describe('HealthResponseSchema', () => {
  it('accepts a well-formed health payload', () => {
    const parsed = HealthResponseSchema.parse({
      status: 'ok',
      timestamp: '2026-04-20T12:00:00.000Z',
      uptimeSeconds: 12.5,
    });

    expect(parsed.status).toBe('ok');
    expect(parsed.uptimeSeconds).toBe(12.5);
  });

  it('rejects a missing status', () => {
    expect(() =>
      HealthResponseSchema.parse({ timestamp: '2026-04-20T12:00:00.000Z', uptimeSeconds: 0 }),
    ).toThrow();
  });

  it('rejects an invalid status value', () => {
    expect(() =>
      HealthResponseSchema.parse({
        status: 'down',
        timestamp: '2026-04-20T12:00:00.000Z',
        uptimeSeconds: 0,
      }),
    ).toThrow();
  });

  it('rejects a non-ISO timestamp', () => {
    expect(() =>
      HealthResponseSchema.parse({ status: 'ok', timestamp: 'yesterday', uptimeSeconds: 0 }),
    ).toThrow();
  });

  it('rejects negative uptime', () => {
    expect(() =>
      HealthResponseSchema.parse({
        status: 'ok',
        timestamp: '2026-04-20T12:00:00.000Z',
        uptimeSeconds: -1,
      }),
    ).toThrow();
  });
});
```

- [ ] **Step 3: Run the test and confirm it fails**

```bash
npx vitest run tests/unit/adapters/http/schemas/healthSchemas.test.ts
```

Expected: fails (module not found).

- [ ] **Step 4: Implement `healthSchemas`**

File: `src/adapters/http/schemas/healthSchemas.ts`

```ts
import { z } from 'zod';
import { openApiRegistry } from '../openapi/registry.js';

export const HealthResponseSchema = z
  .object({
    status: z.literal('ok').openapi({ example: 'ok' }),
    timestamp: z.string().datetime().openapi({ example: '2026-04-20T12:00:00.000Z' }),
    uptimeSeconds: z.number().nonnegative().openapi({ example: 12.34 }),
  })
  .openapi('HealthResponse');

export type HealthResponse = z.infer<typeof HealthResponseSchema>;

openApiRegistry.registerPath({
  method: 'get',
  path: '/health',
  summary: 'Liveness probe',
  description: 'Returns the current health status of the service.',
  tags: ['health'],
  responses: {
    200: {
      description: 'Service is healthy.',
      content: {
        'application/json': { schema: HealthResponseSchema },
      },
    },
  },
});
```

- [ ] **Step 5: Run the test and confirm it passes**

```bash
npx vitest run tests/unit/adapters/http/schemas/healthSchemas.test.ts
```

Expected: 5 tests passed.

- [ ] **Step 6: Commit**

```bash
git add src/adapters/http/openapi/registry.ts src/adapters/http/schemas/healthSchemas.ts tests/unit/adapters/http/schemas/healthSchemas.test.ts
git commit -m "feat(http): add HealthResponse Zod schema and OpenAPI registration"
```

---

## Task 11: HTTP — `buildOpenApiDocument`

**Files:**
- Create: `src/adapters/http/openapi/openApiDocument.ts`
- Create: `tests/unit/adapters/http/openapi/openApiDocument.test.ts`

- [ ] **Step 1: Write a failing test**

File: `tests/unit/adapters/http/openapi/openApiDocument.test.ts`

```ts
import { describe, it, expect } from 'vitest';
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
```

- [ ] **Step 2: Run the test and confirm it fails**

```bash
npx vitest run tests/unit/adapters/http/openapi/openApiDocument.test.ts
```

Expected: fails (module not found).

- [ ] **Step 3: Implement `buildOpenApiDocument`**

File: `src/adapters/http/openapi/openApiDocument.ts`

```ts
import { OpenApiGeneratorV3, type OpenAPIObjectConfig } from '@asteasolutions/zod-to-openapi';
import { openApiRegistry } from './registry.js';

export interface OpenApiDocumentOptions {
  readonly title?: string;
  readonly version?: string;
  readonly description?: string;
}

export function buildOpenApiDocument(options: OpenApiDocumentOptions = {}) {
  const generator = new OpenApiGeneratorV3(openApiRegistry.definitions);
  const config: OpenAPIObjectConfig = {
    openapi: '3.0.3',
    info: {
      title: options.title ?? 'TypeScript Hexagonal Template API',
      version: options.version ?? '0.1.0',
      description:
        options.description ?? 'Example API generated from Zod schemas via zod-to-openapi.',
    },
  };
  return generator.generateDocument(config);
}
```

- [ ] **Step 4: Run the test and confirm it passes**

```bash
npx vitest run tests/unit/adapters/http/openapi/openApiDocument.test.ts
```

Expected: 1 test passed.

- [ ] **Step 5: Commit**

```bash
git add src/adapters/http/openapi/openApiDocument.ts tests/unit/adapters/http/openapi/openApiDocument.test.ts
git commit -m "feat(http): build OpenAPI 3 document from Zod registry"
```

---

## Task 12: HTTP controller — `HealthController`

**Files:**
- Create: `src/adapters/http/controllers/HealthController.ts`
- Create: `tests/unit/adapters/http/controllers/HealthController.test.ts`

- [ ] **Step 1: Write a failing test using a fake use case and stub res/next**

File: `tests/unit/adapters/http/controllers/HealthController.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { HealthController } from '../../../../../src/adapters/http/controllers/HealthController.js';
import { HealthStatus } from '../../../../../src/core/domain/health/HealthStatus.js';
import { CheckHealthUseCase } from '../../../../../src/core/application/health/CheckHealthUseCase.js';
import type { LoggerPort } from '../../../../../src/core/ports/LoggerPort.js';

class SilentLogger implements LoggerPort {
  info() {}
  warn() {}
  error() {}
  debug() {}
}

class StubUseCase extends CheckHealthUseCase {
  constructor(private readonly result: HealthStatus) {
    super(new SilentLogger());
  }
  override execute(): HealthStatus {
    return this.result;
  }
}

function makeRes() {
  const res: Partial<Response> & { _status?: number; _json?: unknown } = {};
  res.status = (code: number) => {
    res._status = code;
    return res as Response;
  };
  res.json = (body: unknown) => {
    res._json = body;
    return res as Response;
  };
  return res as Response & { _status?: number; _json?: unknown };
}

describe('HealthController.handleGetHealth', () => {
  it('responds 200 with the serialized HealthStatus', () => {
    const fixed = new HealthStatus('ok', new Date('2026-04-20T12:00:00.000Z'), 7.25);
    const controller = new HealthController(new StubUseCase(fixed));
    const res = makeRes();
    const next: NextFunction = () => {
      throw new Error('next should not be called');
    };

    controller.handleGetHealth({} as Request, res, next);

    expect(res._status).toBe(200);
    expect(res._json).toEqual({
      status: 'ok',
      timestamp: '2026-04-20T12:00:00.000Z',
      uptimeSeconds: 7.25,
    });
  });

  it('calls next(err) when the use case throws', () => {
    const logger = new SilentLogger();
    class ThrowingUseCase extends CheckHealthUseCase {
      constructor() {
        super(logger);
      }
      override execute(): HealthStatus {
        throw new Error('boom');
      }
    }
    const controller = new HealthController(new ThrowingUseCase());
    const res = makeRes();
    let forwarded: unknown;
    const next: NextFunction = (err?: unknown) => {
      forwarded = err;
    };

    controller.handleGetHealth({} as Request, res, next);

    expect(forwarded).toBeInstanceOf(Error);
    expect((forwarded as Error).message).toBe('boom');
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

```bash
npx vitest run tests/unit/adapters/http/controllers/HealthController.test.ts
```

Expected: fails (module not found).

- [ ] **Step 3: Implement `HealthController`**

File: `src/adapters/http/controllers/HealthController.ts`

```ts
import type { Request, Response, NextFunction } from 'express';
import type { CheckHealthUseCase } from '../../../core/application/health/CheckHealthUseCase.js';
import { HealthResponseSchema, type HealthResponse } from '../schemas/healthSchemas.js';

export class HealthController {
  constructor(private readonly useCase: CheckHealthUseCase) {}

  handleGetHealth(_req: Request, res: Response, next: NextFunction): void {
    try {
      const status = this.useCase.execute();
      const body: HealthResponse = HealthResponseSchema.parse({
        status: status.status,
        timestamp: status.timestamp.toISOString(),
        uptimeSeconds: status.uptimeSeconds,
      });
      res.status(200).json(body);
    } catch (err) {
      next(err);
    }
  }
}
```

- [ ] **Step 4: Run the test and confirm it passes**

```bash
npx vitest run tests/unit/adapters/http/controllers/HealthController.test.ts
```

Expected: 2 tests passed.

- [ ] **Step 5: Commit**

```bash
git add src/adapters/http/controllers/HealthController.ts tests/unit/adapters/http/controllers/HealthController.test.ts
git commit -m "feat(http): add HealthController with defensive schema validation"
```

---

## Task 13: HTTP — routes factory and error middleware

**Files:**
- Create: `src/adapters/http/routes/healthRoutes.ts`
- Create: `src/adapters/http/middleware/errorHandler.ts`
- Create: `tests/unit/adapters/http/middleware/errorHandler.test.ts`

- [ ] **Step 1: Create the routes factory**

File: `src/adapters/http/routes/healthRoutes.ts`

```ts
import { Router } from 'express';
import type { HealthController } from '../controllers/HealthController.js';

export function createHealthRouter(controller: HealthController): Router {
  const router = Router();
  router.get('/health', controller.handleGetHealth.bind(controller));
  return router;
}
```

- [ ] **Step 2: Write a failing test for the error handler**

File: `tests/unit/adapters/http/middleware/errorHandler.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { createErrorHandler } from '../../../../../src/adapters/http/middleware/errorHandler.js';
import { DomainError } from '../../../../../src/core/domain/errors/DomainError.js';
import type { LoggerPort } from '../../../../../src/core/ports/LoggerPort.js';

class RecordingLogger implements LoggerPort {
  readonly calls: Array<{ level: string; message: string }> = [];
  info(m: string) { this.calls.push({ level: 'info', message: m }); }
  warn(m: string) { this.calls.push({ level: 'warn', message: m }); }
  error(m: string) { this.calls.push({ level: 'error', message: m }); }
  debug(m: string) { this.calls.push({ level: 'debug', message: m }); }
}

class NotFoundError extends DomainError {
  readonly code = 'NotFound';
}

function makeRes() {
  const res: Partial<Response> & { _status?: number; _json?: unknown } = {};
  res.status = (code: number) => {
    res._status = code;
    return res as Response;
  };
  res.json = (body: unknown) => {
    res._json = body;
    return res as Response;
  };
  return res as Response & { _status?: number; _json?: unknown };
}

const NOOP_NEXT: NextFunction = () => {};

describe('errorHandler', () => {
  it('maps ZodError to 400', () => {
    const logger = new RecordingLogger();
    const handler = createErrorHandler({ logger });
    const res = makeRes();

    const zerr = new ZodError([
      { code: 'invalid_type', expected: 'string', received: 'undefined', path: ['name'], message: 'Required' },
    ]);

    handler(zerr, {} as Request, res, NOOP_NEXT);

    expect(res._status).toBe(400);
    expect(res._json).toMatchObject({ error: 'ValidationError' });
    expect(logger.calls.at(-1)?.level).toBe('warn');
  });

  it('maps a mapped DomainError to its status', () => {
    const logger = new RecordingLogger();
    const handler = createErrorHandler({
      logger,
      domainErrorStatus: { NotFound: 404 },
    });
    const res = makeRes();

    handler(new NotFoundError('widget missing'), {} as Request, res, NOOP_NEXT);

    expect(res._status).toBe(404);
    expect(res._json).toMatchObject({ error: 'NotFound', message: 'widget missing' });
    expect(logger.calls.at(-1)?.level).toBe('warn');
  });

  it('maps an unknown error to 500 and logs at error level without leaking the stack', () => {
    const logger = new RecordingLogger();
    const handler = createErrorHandler({ logger });
    const res = makeRes();

    handler(new Error('db exploded'), {} as Request, res, NOOP_NEXT);

    expect(res._status).toBe(500);
    expect(res._json).toEqual({ error: 'InternalServerError', message: 'Unexpected error' });
    expect(logger.calls.at(-1)?.level).toBe('error');
  });
});
```

- [ ] **Step 3: Run the test and confirm it fails**

```bash
npx vitest run tests/unit/adapters/http/middleware/errorHandler.test.ts
```

Expected: fails (module not found).

- [ ] **Step 4: Implement the error handler**

File: `src/adapters/http/middleware/errorHandler.ts`

```ts
import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { DomainError } from '../../../core/domain/errors/DomainError.js';
import type { LoggerPort } from '../../../core/ports/LoggerPort.js';

export interface ErrorHandlerOptions {
  readonly logger: LoggerPort;
  readonly domainErrorStatus?: Readonly<Record<string, number>>;
}

export function createErrorHandler(options: ErrorHandlerOptions): ErrorRequestHandler {
  const mapping = options.domainErrorStatus ?? {};
  const { logger } = options;

  return (err, req, res, _next) => {
    if (err instanceof ZodError) {
      logger.warn('request validation failed', {
        path: req.path,
        issues: err.issues,
      });
      res.status(400).json({
        error: 'ValidationError',
        issues: err.issues.map((i) => ({ path: i.path, message: i.message })),
      });
      return;
    }

    if (err instanceof DomainError) {
      const status = mapping[err.code] ?? 400;
      logger.warn('domain error', { code: err.code, message: err.message, path: req.path });
      res.status(status).json({ error: err.code, message: err.message });
      return;
    }

    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    logger.error('unhandled error', { path: req.path, message, stack });
    res.status(500).json({ error: 'InternalServerError', message: 'Unexpected error' });
  };
}
```

- [ ] **Step 5: Run the test and confirm it passes**

```bash
npx vitest run tests/unit/adapters/http/middleware/errorHandler.test.ts
```

Expected: 3 tests passed.

- [ ] **Step 6: Commit**

```bash
git add src/adapters/http/routes/healthRoutes.ts src/adapters/http/middleware/errorHandler.ts tests/unit/adapters/http/middleware/errorHandler.test.ts
git commit -m "feat(http): add health router factory and centralized error handler"
```

---

## Task 14: `HttpServer` class

**Files:**
- Create: `src/adapters/http/HttpServer.ts`

No dedicated unit test — the class is thin glue over Express, and will be fully exercised by the integration test in Task 17.

- [ ] **Step 1: Implement `HttpServer`**

File: `src/adapters/http/HttpServer.ts`

```ts
import express, { type Application, type Router } from 'express';
import type { Server } from 'node:http';
import swaggerUi from 'swagger-ui-express';
import type { LoggerPort } from '../../core/ports/LoggerPort.js';
import { createErrorHandler } from './middleware/errorHandler.js';

export interface HttpServerOptions {
  readonly routers: ReadonlyArray<Router>;
  readonly logger: LoggerPort;
  /** OpenAPI document — any JSON-serializable object. Shape is validated by swagger-ui at render time. */
  readonly openApiDoc: object;
}

export class HttpServer {
  private readonly app: Application;
  private readonly logger: LoggerPort;
  private server: Server | undefined;

  constructor(options: HttpServerOptions) {
    this.logger = options.logger;
    this.app = express();
    this.app.disable('x-powered-by');
    this.app.use(express.json());
    this.app.use((req, _res, next) => {
      this.logger.info('http request', { method: req.method, path: req.path });
      next();
    });

    for (const router of options.routers) {
      this.app.use(router);
    }

    this.app.get('/openapi.json', (_req, res) => {
      res.status(200).json(options.openApiDoc);
    });
    this.app.use(
      '/docs',
      swaggerUi.serve,
      swaggerUi.setup(options.openApiDoc as Parameters<typeof swaggerUi.setup>[0]),
    );

    this.app.use(createErrorHandler({ logger: this.logger }));
  }

  /** Read-only access to the underlying Express application. Exposed for integration tests. */
  get expressApp(): Application {
    return this.app;
  }

  async start(port: number): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      this.server = this.app.listen(port, () => {
        this.logger.info('http server listening', { port });
        resolve();
      });
      this.server.once('error', reject);
    });
  }

  async stop(): Promise<void> {
    if (!this.server) return;
    await new Promise<void>((resolve, reject) => {
      this.server?.close((err) => (err ? reject(err) : resolve()));
    });
    this.server = undefined;
  }
}
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add src/adapters/http/HttpServer.ts
git commit -m "feat(http): add HttpServer with swagger-ui, openapi.json, and graceful stop"
```

---

## Task 15: Composition — `container.ts`

**Files:**
- Create: `src/composition/container.ts`

- [ ] **Step 1: Implement the composition root**

File: `src/composition/container.ts`

```ts
import type { Env } from '../config/env.js';
import { PinoLoggerAdapter } from '../adapters/logging/PinoLoggerAdapter.js';
import { CheckHealthUseCase } from '../core/application/health/CheckHealthUseCase.js';
import { HealthController } from '../adapters/http/controllers/HealthController.js';
import { createHealthRouter } from '../adapters/http/routes/healthRoutes.js';
import { HttpServer } from '../adapters/http/HttpServer.js';
import { buildOpenApiDocument } from '../adapters/http/openapi/openApiDocument.js';
// Importing the schemas module registers OpenAPI paths as a side effect.
import '../adapters/http/schemas/healthSchemas.js';

export interface Container {
  readonly httpServer: HttpServer;
}

export function buildContainer(env: Env): Container {
  const logger = new PinoLoggerAdapter({
    level: env.LOG_LEVEL,
    pretty: env.NODE_ENV !== 'production',
  });

  const checkHealth = new CheckHealthUseCase(logger);
  const healthController = new HealthController(checkHealth);
  const healthRouter = createHealthRouter(healthController);

  const openApiDoc = buildOpenApiDocument();

  const httpServer = new HttpServer({
    routers: [healthRouter],
    logger,
    openApiDoc,
  });

  return { httpServer };
}
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add src/composition/container.ts
git commit -m "feat(composition): wire the dependency graph by hand"
```

---

## Task 16: Entrypoint — `main.ts` and `.env.example`

**Files:**
- Create: `src/main.ts`
- Create: `.env.example`

- [ ] **Step 1: Create `.env.example`**

File: `.env.example`

```
NODE_ENV=development
PORT=3000
LOG_LEVEL=info
```

- [ ] **Step 2: Implement `main.ts`**

File: `src/main.ts`

```ts
import { loadEnvOrExit } from './config/env.js';
import { buildContainer } from './composition/container.js';
import { PinoLoggerAdapter } from './adapters/logging/PinoLoggerAdapter.js';

async function bootstrap(): Promise<void> {
  const env = loadEnvOrExit();
  const { httpServer } = buildContainer(env);

  // Separate logger instance for process-level events (before/after the server).
  const processLogger = new PinoLoggerAdapter({
    level: env.LOG_LEVEL,
    pretty: env.NODE_ENV !== 'production',
  });

  const shutdown = async (signal: string): Promise<void> => {
    processLogger.info('shutdown signal received', { signal });
    try {
      await httpServer.stop();
      processLogger.info('http server stopped cleanly');
      process.exit(0);
    } catch (err) {
      processLogger.error('error during shutdown', {
        message: err instanceof Error ? err.message : String(err),
      });
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    processLogger.error('unhandledRejection', {
      reason: reason instanceof Error ? reason.message : String(reason),
    });
    process.exit(1);
  });
  process.on('uncaughtException', (err) => {
    processLogger.error('uncaughtException', { message: err.message, stack: err.stack });
    process.exit(1);
  });

  await httpServer.start(env.PORT);
}

bootstrap().catch((err) => {
  console.error('Failed to bootstrap:', err);
  process.exit(1);
});
```

- [ ] **Step 3: Typecheck and build**

```bash
npm run typecheck && npm run build
```

Expected: both exit 0; `dist/main.js` exists.

- [ ] **Step 4: Smoke test the build (start and stop with curl)**

Run in one terminal:

```bash
cp .env.example .env
node --env-file=.env dist/main.js &
PID=$!
sleep 1
curl -sS http://localhost:3000/health
echo
kill -TERM $PID
wait $PID 2>/dev/null || true
rm .env
```

Expected: one line of JSON containing `"status":"ok"`, then graceful shutdown messages from pino.

- [ ] **Step 5: Commit**

```bash
git add src/main.ts .env.example
git commit -m "feat: add main entrypoint with graceful shutdown handlers"
```

---

## Task 17: Integration test — `GET /health` and `GET /openapi.json` end-to-end

**Files:**
- Create: `tests/integration/http/health.integration.test.ts`

- [ ] **Step 1: Write the integration test**

File: `tests/integration/http/health.integration.test.ts`

```ts
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import type { Application } from 'express';
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
```

- [ ] **Step 2: Run the integration tests**

```bash
npm run test:integration
```

Expected: 3 tests passed.

- [ ] **Step 3: Run the full check (typecheck + lint + all tests with coverage)**

```bash
npm run check
```

Expected: exits 0; all tests pass.

- [ ] **Step 4: Commit**

```bash
git add tests/integration/http/health.integration.test.ts
git commit -m "test(http): add integration test for /health and /openapi.json"
```

---

## Task 18: README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Rewrite `README.md`**

File: `README.md`

````markdown
# TypeScript Hexagonal Template

A starter repository for TypeScript backend services built with **hexagonal architecture**
(Ports & Adapters), object-oriented design, and manual constructor-injected dependency
injection. Ships a working `GET /health` endpoint wired end-to-end so new features can be
added by copying the pattern.

## Stack

- Node.js 22 (LTS)
- TypeScript (strict mode)
- Express 5
- `zod` + `@asteasolutions/zod-to-openapi` (one schema = validation + TS type + OpenAPI fragment)
- `swagger-ui-express` (`/docs`)
- `pino` for structured logging
- `vitest` for unit + integration tests, `supertest` for HTTP integration
- `biome` for lint + format

## Prerequisites

- **Node 22** — recommended via [`nvm`](https://github.com/nvm-sh/nvm):

  ```bash
  nvm install 22
  nvm use 22
  ```

  Or use [`fnm`](https://github.com/Schniz/fnm) / [`volta`](https://volta.sh/). The `.nvmrc`
  file pins the version so `nvm use` picks it up automatically.

- **npm 10+** (ships with Node 22).

- **Git** (for cloning and committing).

TypeScript is installed as a dev dependency — no global install required.

## Quick start

```bash
git clone <your-fork-url> my-service
cd my-service
cp .env.example .env
npm install
npm run dev
```

Then open:

- `http://localhost:3000/health` → JSON payload with `status`, `timestamp`, `uptimeSeconds`
- `http://localhost:3000/docs` → Swagger UI
- `http://localhost:3000/openapi.json` → raw OpenAPI document

## Scripts

| Command                      | Purpose                                                  |
| ---------------------------- | -------------------------------------------------------- |
| `npm run dev`                | Run `src/main.ts` with `tsx watch` (hot reload)          |
| `npm run build`              | Compile to `dist/` with `tsc`                            |
| `npm start`                  | Run the built app: `node --env-file=.env dist/main.js`   |
| `npm test`                   | Run all tests once                                       |
| `npm run test:unit`          | Run only unit tests                                      |
| `npm run test:integration`   | Run only integration tests                               |
| `npm run test:watch`         | Vitest in watch mode                                     |
| `npm run test:coverage`      | Tests + v8 coverage report                               |
| `npm run lint`               | Biome lint + format check                                |
| `npm run lint:fix`           | Biome auto-fix                                           |
| `npm run typecheck`          | `tsc --noEmit`                                           |
| `npm run check`              | `typecheck` + `lint` + `test` (what CI runs)             |

## Architecture

```
src/
├── core/               # pure domain + application logic (no external deps)
│   ├── domain/         # value objects, domain errors
│   ├── application/    # use cases
│   └── ports/          # interfaces the core needs (implemented by adapters)
├── adapters/           # the only layer that touches third-party libraries
│   ├── http/           # Express, routes, controllers, zod schemas, OpenAPI, error middleware
│   └── logging/        # pino adapter implementing LoggerPort
├── config/             # env parsing (zod)
├── composition/        # manual DI wiring (composition root)
└── main.ts             # entrypoint: load env → build container → start server
```

### The one rule

**Dependencies point inward.** `adapters/` and `composition/` may import from `core/`;
`core/` **never** imports from `adapters/`, `composition/`, or third-party libraries
(except pure `import type` of widely-available types). This is enforced by Biome's
`noRestrictedImports` rule scoped to `src/core/**` in `biome.json`.

The distinction between "driving" adapters (call into the core — e.g. `adapters/http`)
and "driven" adapters (implement a port the core needs — e.g. `adapters/logging`) is
implicit: it's determined by the relationship between the adapter and the core, not
by folder structure.

## Adding a new feature

Recipe the template is designed to make mechanical:

1. **Domain:** add value objects and domain errors in `src/core/domain/<feature>/`.
2. **Port (if needed):** if the feature requires something external (DB, API), define a
   port interface in `src/core/ports/<Feature>Port.ts`.
3. **Use case:** write the class in `src/core/application/<feature>/<Feature>UseCase.ts`.
   It receives dependencies via constructor.
4. **Unit test the use case** with hand-written fakes of the ports (no mocking library
   needed) — see `tests/unit/core/application/health/CheckHealthUseCase.test.ts`.
5. **Driven adapter (if a new port was added):** implement it in `src/adapters/<tech>/`.
6. **HTTP schema:** define Zod schemas in `src/adapters/http/schemas/<feature>Schemas.ts`
   and register the path with `openApiRegistry.registerPath(...)`.
7. **Controller:** add a class in `src/adapters/http/controllers/<Feature>Controller.ts`
   that calls the use case and serializes the response through the Zod schema.
8. **Route:** add a factory in `src/adapters/http/routes/<feature>Routes.ts`.
9. **Wire everything** in `src/composition/container.ts` and pass the new router to the
   `HttpServer`.
10. **Integration test:** add `tests/integration/http/<feature>.integration.test.ts`
    following the pattern in `health.integration.test.ts`.

## Testing

Two levels:

- **Unit** (`tests/unit/`, files end in `.test.ts`): `vitest` on individual classes using
  hand-written fakes of ports.
- **Integration** (`tests/integration/`, files end in `.integration.test.ts`): `supertest`
  against the real DI graph built by `buildContainer()`, no running network listener.

Coverage thresholds start at 70% across the repo. Raise them (especially on `core/`)
as the project matures.

## Environment variables

| Var         | Required | Default | Allowed                                                  |
| ----------- | -------- | ------- | -------------------------------------------------------- |
| `NODE_ENV`  | yes      | —       | `development` \| `test` \| `production`                  |
| `PORT`      | no       | `3000`  | any integer in `0..65535`                                |
| `LOG_LEVEL` | no       | `info`  | `silent`\|`trace`\|`debug`\|`info`\|`warn`\|`error`\|`fatal` |

Invalid env crashes the process with a human-readable error at boot.

## Troubleshooting

- **`EADDRINUSE: address already in use :::3000`** — another process is on port 3000.
  Either kill it (`lsof -nP -iTCP:3000 -sTCP:LISTEN`) or set a different `PORT` in `.env`.
- **`Invalid environment variables`** at startup — compare your `.env` with `.env.example`;
  the error prints the exact offending keys.
- **Typescript errors about `.js` extensions in imports** — the repo uses `NodeNext`
  module resolution, which requires explicit `.js` in relative imports from `.ts` files.
  The TypeScript compiler rewrites them at emit time; this is correct and intentional.

## License

MIT (or whatever you want — adjust to taste).
````

- [ ] **Step 2: Verify the README renders (sanity check)**

```bash
head -30 README.md
```

Expected: the title and prerequisite section are readable.

- [ ] **Step 3: Run the full check one last time**

```bash
npm run check
```

Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: write comprehensive README with quick start, architecture, and recipe"
```

---

## Final verification

After all tasks are complete, run:

```bash
npm run check
cp .env.example .env
npm run build
node --env-file=.env dist/main.js &
PID=$!
sleep 1
curl -sS http://localhost:3000/health
curl -sS http://localhost:3000/openapi.json | head -c 200
echo
kill -TERM $PID
wait $PID 2>/dev/null || true
rm .env
```

Expected:
- `npm run check` exits 0 (all typecheck, lint, and tests pass).
- `GET /health` returns JSON with `"status":"ok"`.
- `GET /openapi.json` returns a document starting with `{"openapi":"3.0.3"`.
- Server shuts down cleanly on SIGTERM.

---

## Task summary

| # | Task | Files touched |
|---|---|---|
| 1 | Initialize project | `package.json`, `tsconfig.json`, `.nvmrc`, `.gitignore` |
| 2 | Configure Vitest | `vitest.config.ts` |
| 3 | Configure Biome | `biome.json` |
| 4 | Env schema | `src/config/env.ts` + unit test |
| 5 | `HealthStatus` value object | `src/core/domain/health/` + unit test |
| 6 | `DomainError` base | `src/core/domain/errors/` + unit test |
| 7 | `LoggerPort` interface | `src/core/ports/LoggerPort.ts` |
| 8 | `CheckHealthUseCase` | `src/core/application/health/` + unit test |
| 9 | `PinoLoggerAdapter` | `src/adapters/logging/` + unit test |
| 10 | Health schemas + OpenAPI registry | `src/adapters/http/schemas/`, `src/adapters/http/openapi/registry.ts` + unit test |
| 11 | `buildOpenApiDocument` | `src/adapters/http/openapi/openApiDocument.ts` + unit test |
| 12 | `HealthController` | `src/adapters/http/controllers/` + unit test |
| 13 | Routes factory + error middleware | `src/adapters/http/routes/`, `src/adapters/http/middleware/` + unit test |
| 14 | `HttpServer` class | `src/adapters/http/HttpServer.ts` |
| 15 | Composition root | `src/composition/container.ts` |
| 16 | Entrypoint + `.env.example` | `src/main.ts`, `.env.example` |
| 17 | Integration test | `tests/integration/http/` |
| 18 | README | `README.md` |
