# templates/_shared/nestjs/

Shared files reused by all NestJS architectures (layered, clean, hexagonal).

## Contents overview
- **Root config files**: `.env.example`, `.gitignore`, `.prettierrc`, `.eslintrc.js`,
  `.dockerignore`, `Dockerfile`, `nest-cli.json`, `tsconfig.json`, `docker-compose.yml`
- **`src/main.ts`**: NestJS bootstrap — reads port from env/config module
- **`src/app.module.ts`**: root module — imports shared infra (database, cache, messaging)
  and conditionally registers auth/health modules and global guards (rate limiting, auth)
- **`src/config/`**: app config (`@nestjs/config`), Zod validation pipe, class-validator
  pipe, Swagger setup
- **`src/shared/`**: infrastructure modules — database (Prisma/TypeORM/Mongoose),
  cache (Redis), messaging (Kafka/RabbitMQ), auth (JWT + Passport), health (Terminus)

## Conditional rendering
Everything is gated by `fileConditions` in each template's `template.json`. For example,
`src/shared/health/` only renders when `useHealthCheck` is true. The shared directory
contains all possible files; the conditions in each architecture template determine
which subset actually gets rendered.

## Rendering order
Shared files render **first**, then the architecture-specific `files/` from the template
directory. This means a template can theoretically override a shared file, but in practice
no template currently does — all overrides happen through file conditions.

## Files of particular note
- `src/shared/auth/auth.service.ts.hbs`: starter admin credentials from env —
  loudly documented as not production-ready
- `src/config/swagger.ts.hbs`: currently stock `SwaggerModule.setup()` — custom CSS
  from Parsa was planned but never integrated
- `test/app.e2e-spec.ts.hbs` and `test/jest-e2e.json`: e2e test scaffolding,
  only rendered when `useTests` is on

## When modifying shared files
Changes to this directory affect ALL three NestJS architectures simultaneously. Always
re-validate at least one template from each architecture after touching shared files.
