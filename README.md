# pasha CLI — v2

A project generator: pick a language, pick a framework, pick an architecture — pasha builds the rest.

## Install

### Linux / macOS

```bash
curl -fsSL https://raw.githubusercontent.com/pasha1383/pasha-cli/main/install.sh | bash
```

### Windows

```powershell
irm https://raw.githubusercontent.com/pasha1383/pasha-cli/main/install.ps1 | iex
```

If your PowerShell execution policy blocks that pipeline, download
`install.ps1` and run it explicitly instead of lowering the policy
machine-wide:

```powershell
powershell -ExecutionPolicy Bypass -File install.ps1
```

Both installers check for Node 18+ and git, clone the repo, install
production dependencies, and put a `pasha` command on your PATH (no admin
rights needed on either OS).

### Any platform, via npm

```bash
npm install -g @pasha1383/pasha
```

## Commands

```bash
pasha create     # interactive wizard to scaffold a new project
pasha doctor     # check and install prerequisites (node, git, python3, go, java)
pasha info
pasha --help
```

## Supported combos

| Language | Framework | Architecture |
|---|---|---|
| Node.js | NestJS | Layered (N-Tier) |
| Node.js | NestJS | Clean Architecture |
| Node.js | NestJS | Hexagonal / DDD |
| Node.js | Express | Layered (Controller-Service-Repository) |

Express has no DI container, so wiring is manual (each module's `routes.ts`
constructs `repository → service → controller` itself) and the extra
NestJS-only features (Swagger, JWT auth, health checks, rate limiting, Jest/
ESLint/CI scaffolding) aren't ported over yet — only the core stack (ORM,
database, validation, Redis, message broker) is available for Express so far.

## Stack options

On top of the architecture, `pasha create` asks about:

| Choice | Options |
|---|---|
| Data layer | Prisma, TypeORM, Mongoose, none (in-memory) |
| Database | PostgreSQL, MySQL, MongoDB, SQLite — filtered to what the ORM supports |
| Validation | class-validator + class-transformer, Zod, none |
| Cache | Redis (optional) |
| Message broker | Kafka, RabbitMQ, none |
| AI docs | per-directory `AGENT.md` files (optional) |

Then a checkbox picks any combination of:

| Feature | What you get |
|---|---|
| Swagger / OpenAPI docs | `/api/docs`, `@ApiProperty`/`@ApiTags`/`@ApiOperation` on generated DTOs and controllers |
| ESLint + Prettier | `.eslintrc.js`, `.prettierrc`, `lint`/`format` scripts |
| Jest test scaffold | unit spec per generated use-case/service + e2e config, wired into `package.json` |
| GitHub Actions CI | lint, test, and build on every push/PR |
| JWT authentication | login endpoint, guard, `@CurrentUser()` decorator, global request-logging interceptor |
| Health check (Terminus) | `GET /health`, with an indicator per data store you actually configured |
| Dockerfile for the app | multi-stage build, separate from the infra `docker-compose.yml` |
| Rate limiting | `@nestjs/throttler` registered as a global guard |

Anything requiring a server gets a matching `docker-compose.yml` service and
`.env.example` entries. Files you didn't ask for are never generated.

## Local development

```bash
git clone https://github.com/pasha1383/pasha-cli.git
cd pasha-cli
npm install
npm link
pasha create
```
