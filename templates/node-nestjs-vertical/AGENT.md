# templates/node-nestjs-vertical/

NestJS + Vertical Slice Architecture.

## Architecture
```
src/
├── main.ts
├── app.module.ts
├── config/{env, validation, swagger, zod}
├── shared/{database, cache, messaging, auth, health}
├── features/
│   └── <feature-name>/
│       ├── <name>.module.ts             ← NestJS module for this feature
│       ├── <name>.controller.ts         ← HTTP entry point (thin)
│       ├── <name>.handler.ts            ← business logic / use-case
│       ├── <name>.entity.ts             ← domain model
│       ├── <name>.repository.ts         ← data access (branched by ORM)
│       ├── create-<name>.dto.ts         ← input validation
│       ├── <name>.response.ts           ← output DTO
│       └── <name>.controller.spec.ts    ← test
```

## Key traits
- Shared from `_shared/nestjs/files/`
- `stackFeatures: "nestjs"` — full extras checkbox (Swagger, lint, tests, CI, auth,
  health, Dockerfile, rate limiting)
- ORM entity representation varies: TypeORM/Mongoose decorate the entity class itself
  (`hasOrmClassEntity` flag), Prisma uses a generate-then-use workflow, in-memory
  repository has a plain class with constructor
- Module files render once per user-named feature
- AGENT.md files per meaningful directory (when enabled)
- Every feature folder is self-contained — no layers split across directories
- Cross-cutting concerns belong in `src/shared/`
- Slices communicate through the NestJS module system (export handler, import module)
- Controller is thin: parse request, call handler, return response
- Handler contains all business logic, no HTTP concepts

## Module file path pattern
- Module files go in: `src/features/{{kebabCase moduleName}}/`
- Each file name uses the kebab-case module name: `{{moduleName}}.handler.ts`
- PascalCase is used for class names: `{{pascalCase moduleName}}Handler`
