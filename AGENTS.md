# AGENTS.md

This file provides context for AI coding agents working on this repository.

## Repository Overview

`sourcecode-editor` is a web-based source code editor platform with three components:

- **sourcecode-editor-server** – Node.js/TypeScript backend (Fastify API, SQLite, Git/GitHub integration, LLM-powered editing)
- **sourcecode-editor-web** – Nuxt 3 frontend (Vue, SSR)
- **sourcecode-editor-proxy** – Traefik reverse proxy for development/production routing

## Project Structure

```
sourcecode-editor/
  sourcecode-editor-server/        # Backend API server
    src/
      App.ts                       # Entry point – initializes OTel, DB, routes, Fastify
      Config.ts                    # Extends ConfigBase from @devopsplaybook.io/common-utils
      OTelContext.ts               # OpenTelemetry context (wraps createOTelContext)
      ai/                          # LLM integration (DeepSeek-compatible API)
        LLM.ts                     # Chat completion client
      events/                      # WebSocket event broadcasting
        EventBus.ts                # Pub/sub event bus
        RepositoryEventTypes.ts    # Event type definitions
        WebSocketRoutes.ts         # Fastify WebSocket routes
      files/                       # File system operations on project files
        Files.ts
      git/                         # Git operations (clone, commit, push, branch mgmt)
        Git.ts
      github/                      # GitHub API integration
        GitHubApi.ts               # REST/GraphQL client for GitHub
        GitHubCache.ts             # Local caching of GitHub data
        GitHubCacheRoutes.ts       # API routes for cache management
        GitHubMetrics.ts           # Prometheus metrics for GitHub API calls
        GitHubRoutes.ts            # API routes for GitHub operations
        WatchedRepos.ts            # Watched repository tracking
      model/                       # Data models
        Project.ts, User.ts, UserSession.ts, ...
      projects/                    # Project management
        ProjectsData.ts            # CRUD operations on projects table
        ProjectsFilesRoutes.ts     # File read/write API routes
        ProjectsLLMRoutes.ts       # LLM chat API routes
        ProjectsOperationsRoutes.ts # Git operations API routes
        ProjectsRoutes.ts          # Project CRUD API routes
        ProjectsSync.ts            # Periodic sync with GitHub
        ProjectOperationEvents.ts  # Operation status event broadcasting
      ssh/                         # SSH key management
        SSH.ts                     # SSH key generation/access
        SSHRoutes.ts               # SSH public key API routes
      users/                       # Authentication and user management
        Auth.ts                    # JWT auth init, token generation, middleware
        UserPassword.ts            # bcrypt password hashing
        UsersData.ts               # CRUD operations on users table
        UsersRoutes.ts             # User/login API routes
      utils-std-ts/                # Shared utility re-exports & project-specific helpers
        SqlDbUtils.ts              # Re-exports from @devopsplaybook.io/common-utils
        SqlDbUtilsNoTelemetry.ts   # Re-exports from @devopsplaybook.io/common-utils
        SystemCommand.ts           # Re-exports from @devopsplaybook.io/common-utils
        Timeout.ts                 # Re-exports from @devopsplaybook.io/common-utils
        ApiUtils.ts                # Project-specific HTTP helpers
        PromisePool.ts             # Concurrency-limited promise pool
    sql/                           # Database migration files
      init-0000.sql                # metadata table (required by convention)
      init-0001.sql                # users table
      init-0002.sql                # projects table
  sourcecode-editor-web/           # Nuxt 3 frontend
  sourcecode-editor-proxy/         # Traefik proxy config
  .github/workflows/               # CI/CD (reusable workflows from common-utils)
```

## Key Conventions

- **TypeScript**: Target ES2019, CommonJS output, strict mode, declarations generated.
- **Fastify**: HTTP framework. Routes are class-based, registered via `fastify.register()`.
- **OpenTelemetry**: Every module creates a `ModuleLogger` via `OTelLogger().createModuleLogger(name)`. Functions accept a `Span` context as the first parameter for distributed tracing.
- **better-sqlite3 (synchronous)**: Database operations from `@devopsplaybook.io/common-utils` return values directly (NOT Promises). Do NOT `await` calls to `SqlDbUtilsQuerySQL`, `SqlDbUtilsExecSQL`, `DbUtilsNoTelemetryExecSQL`, or `DbUtilsNoTelemetryQuerySQL`.
- **SystemCommandExecute**: From common-utils. Does NOT take a `Span` as the first argument. Signature: `(command: string, options?) => Promise<string>`.
- **No default exports**: All modules use named exports only.
- **ESLint**: Uses `typescript-eslint` with `strict` and `stylistic` rule sets. Minimize `eslint-disable` comments.

## Dependencies

| Package                                 | Role                                               |
| --------------------------------------- | -------------------------------------------------- |
| `@devopsplaybook.io/common-utils`       | Shared DB utils, ConfigBase, OTelContext, commands |
| `@devopsplaybook.io/otel-utils`         | StandardTracer, StandardLogger, StandardMeter      |
| `@devopsplaybook.io/otel-utils-fastify` | Fastify OTel hooks middleware                      |
| `fastify`                               | HTTP framework                                     |
| `better-sqlite3`                        | Synchronous SQLite driver                          |
| `jsonwebtoken` / `bcrypt`               | JWT auth and password hashing                      |
| `axios`                                 | HTTP client for GitHub API and LLM API             |
| `uuid`                                  | v14+ ESM – requires Jest transform config          |

## Architecture Notes

- **Config**: Extends `ConfigBase` (3-layer: env > config.json > defaults). Project-specific fields: `PROJECTS_SYNC_FREQUENCY`, `GIT_USERNAME`, `GIT_EMAIL`, `LLM_API_KEY`, `LLM_API_URL`, `LLM_MODEL`, `GITHUB_TOKEN`, `GITHUB_SYNC_FREQUENCY`.
- **OTelContext**: Wraps `createOTelContext()` from common-utils. Exports backward-compatible functions (`OTelLogger()`, `OTelTracer()`, `OTelMeter()`, `OTelSetTracer()`, `OTelSetMeter()`).
- **DB initialization**: `App.ts` calls `SqlDbUtilsSetOTel()` and `DbUtilsNoTelemetrySetLogger()` before `SqlDbUtilsInit(span, config, sqlDir)`.
- **SQL migrations**: Files in `sql/` named `init-NNNN.sql`. Applied in order; tracked in `metadata` table.

## Build and Verification

```bash
cd sourcecode-editor-server
npm install
npm run build    # tsc -> dist/ (must succeed with 0 errors)
npm run lint     # eslint src (must pass with 0 errors)
npm run test     # jest --coverage (all 28 tests must pass)
```

All three commands must pass before committing.

## CI/CD

- **main-build.yml**: On push to `main` → reusable-merge-build (lint + test + build + Docker image)
- **pr-check.yml**: On PR to `main` → reusable-pr-verify (matrix Node.js + Docker build)
- Both use reusable workflows from `devopsplaybook-io/common-utils`.

## Known Gotchas

- **uuid ESM**: `uuid` v14+ ships ESM. Jest config has `transformIgnorePatterns` and `allowJs: true` in `tsconfig.spec.json` to handle this.
- **better-sqlite3 is synchronous**: Never `await` DB calls from common-utils `SqlDbUtils*` or `DbUtilsNoTelemetry*` functions.
- **SystemCommandExecute signature**: Does NOT accept a `Span` first argument. Pass only `(command, options?)`.
- **Git operations**: All `SystemCommandExecute` calls in `Git.ts` and `SSH.ts` use command strings only (no span parameter).
