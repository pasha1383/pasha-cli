# templates/node-nestjs-hexagonal/

NestJS + Hexagonal Architecture (Ports & Adapters) with DDD patterns.

## Architecture
```
src/
├── main.ts
├── app.module.ts
├── config/{env, validation, swagger, zod}
├── shared/{database, cache, messaging, auth, health}
├── domain/<moduleName>/
│   ├── entities/<moduleName>.entity.ts
│   └── repositories/<moduleName>.repository.interface.ts
├── application/<moduleName>/
│   ├── dto/create-<moduleName>.dto.ts
│   └── use-cases/
│       ├── get-<moduleName>.use-case.ts
│       ├── create-<moduleName>.use-case.ts
│       └── create-<moduleName>.use-case.spec.ts
└── infrastructure/<moduleName>/
    ├── <moduleName>.module.ts
    ├── controllers/<moduleName>.controller.ts
    └── persistence/
        ├── <moduleName>.orm-entity.ts             (TypeORM)
        ├── <moduleName>.typeorm.repository.ts     (TypeORM)
        ├── <moduleName>.schema.ts                 (Mongoose)
        ├── <moduleName>.mongoose.repository.ts    (Mongoose)
        ├── <moduleName>.prisma.repository.ts      (Prisma)
        └── <moduleName>.repository.ts             (in-memory)
```

## Key traits
- Shared from `_shared/nestjs/files/`
- `stackFeatures: "nestjs"` — full extras
- Domain layer: pure entities + repository interface (no framework imports)
- Application layer: use cases + DTOs (orchestration, no infrastructure)
- Infrastructure layer: NestJS modules, controllers, concrete repository implementations
- Per-ORM persistence files: one file per ORM type, gated by `fileConditions`
  (e.g. `orm-entity.ts.hbs` → `ormTypeorm`, `schema.ts.hbs` → `ormMongoose`,
  `prisma.repository.ts.hbs` → `ormPrisma`, bare `repository.ts.hbs` → `ormNone`)

## DI token
`{{constantCase moduleName}}_REPOSITORY` — in the repository interface, used across
use cases and module wiring.
