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
│   ├── http/           # Express, routes, controllers, Zod schemas, OpenAPI, error middleware
│   └── logging/        # pino adapter implementing LoggerPort
├── config/             # env parsing (Zod)
├── composition/        # manual DI wiring (composition root)
└── main.ts             # entrypoint: load env → build container → start server
```

### The one rule

**Dependencies point inward.** `adapters/` and `composition/` may import from `core/`;
`core/` **never** imports from `adapters/`, `composition/`, or third-party libraries
(except pure `import type` of widely-available types). This is enforced by Biome's
`noRestrictedImports` rule scoped to `src/core/**` in `biome.json`.

The distinction between "driving" adapters (those that call into the core — e.g.
`adapters/http`) and "driven" adapters (those that implement a port the core needs —
e.g. `adapters/logging`) is implicit: it's determined by the relationship between the
adapter and the core, not by folder structure.

## Adding a new feature

Recipe the template is designed to make mechanical:

1. **Domain:** add value objects and domain errors in `src/core/domain/<feature>/`.
2. **Port (if needed):** if the feature requires something external (DB, API), define a
   port interface in `src/core/ports/<Feature>Port.ts`.
3. **Use case:** write the class in `src/core/application/<feature>/<Feature>UseCase.ts`.
   It receives dependencies via constructor.
4. **Unit-test the use case** with hand-written fakes of the ports (no mocking library
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

- **Unit** (`tests/unit/`, files end in `.test.ts`) — Vitest on individual classes using
  hand-written fakes of ports. See `tests/unit/core/application/health/` for the canonical
  example.
- **Integration** (`tests/integration/`, files end in `.integration.test.ts`) — Supertest
  against the real DI graph built by `buildContainer()`, no running network listener.

Coverage thresholds start at 70% across the repo. Raise them (especially on `core/`)
as the project matures.

## Environment variables

| Var         | Required | Default | Allowed                                                          |
| ----------- | -------- | ------- | ---------------------------------------------------------------- |
| `NODE_ENV`  | yes      | —       | `development` \| `test` \| `production`                          |
| `PORT`      | no       | `3000`  | any integer in `0..65535`                                        |
| `LOG_LEVEL` | no       | `info`  | `silent` \| `trace` \| `debug` \| `info` \| `warn` \| `error` \| `fatal` |

Invalid env crashes the process with a human-readable error at boot.

## Troubleshooting

- **`EADDRINUSE: address already in use :::3000`** — another process is on port 3000.
  Either kill it (`lsof -nP -iTCP:3000 -sTCP:LISTEN`) or set a different `PORT` in `.env`.
- **`Invalid environment variables`** at startup — compare your `.env` with `.env.example`;
  the error prints the exact offending keys.
- **TypeScript errors about `.js` extensions in imports** — the repo uses `NodeNext`
  module resolution, which requires explicit `.js` in relative imports from `.ts` files.
  The TypeScript compiler rewrites them at emit time; this is correct and intentional.

## License

MIT (or whatever you want — adjust to taste).
