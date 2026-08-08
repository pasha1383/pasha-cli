# templates/node-nestjs-layered/

NestJS + Layered Architecture (N-Tier).

## Architecture
```
src/
├── main.ts
├── app.module.ts
├── config/{env, validation, swagger, zod}
├── shared/{database, cache, messaging, auth, health}
├── modules/
│   └── <moduleName>/
│       ├── dto/create-<moduleName>.dto.ts
│       ├── <moduleName>.entity.ts           (or .orm-entity.ts for TypeORM/Mongoose)
│       ├── <moduleName>.repository.ts       (TypeORM/Mongoose/in-memory)
│       ├── <moduleName>.service.ts
│       ├── <moduleName>.service.spec.ts
│       ├── <moduleName>.controller.ts
│       └── <moduleName>.module.ts
```

## Key traits
- Shared from `_shared/nestjs/files/`
- `stackFeatures: "nestjs"` — full extras checkbox (Swagger, lint, tests, CI, auth,
  health, Dockerfile, rate limiting)
- ORM entity representation varies: TypeORM/Mongoose decorate the entity class itself
  (`hasOrmClassEntity` flag), Prisma uses a generate-then-use workflow, in-memory
  repository has a plain class with constructor
- Module files render once per user-named module
- AGENT.md files per meaningful directory (when enabled)

## DI token
Repository token: `{{constantCase moduleName}}_REPOSITORY`
Must match everywhere: entity, repository, service, module wiring.
