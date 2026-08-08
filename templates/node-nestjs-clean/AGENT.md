# templates/node-nestjs-clean/

NestJS + Clean Architecture.

## Architecture
```
src/
├── main.ts
├── app.module.ts
├── config/{env, validation, swagger, zod}
├── shared/{database, cache, messaging, auth, health}
├── core/
│   ├── use-cases/<moduleName>/
│   │   ├── get-<moduleName>s.use-case.ts
│   │   ├── create-<moduleName>.use-case.ts
│   │   └── create-<moduleName>.use-case.spec.ts
│   ├── ports/<moduleName>.repository.port.ts
│   └── entities/<moduleName>.entity.ts
├── adapters/
│   └── <moduleName>/
│       ├── dto/create-<moduleName>.dto.ts
│       ├── presenters/<moduleName>.presenter.ts
│       ├── controllers/<moduleName>.controller.ts
│       └── repositories/
│           ├── <moduleName>.orm-entity.ts         (TypeORM)
│           ├── <moduleName>.schema.ts             (Mongoose)
│           └── <moduleName>.repository.ts         (in-memory)
└── modules/<moduleName>.module.ts
```

## Key traits
- Shared from `_shared/nestjs/files/`
- `stackFeatures: "nestjs"` — full extras
- **Presenter output boundary** — the detail that distinguishes Clean from Hexagonal.
  The use case returns a domain entity; the presenter maps it to a response DTO.
- Repository port is in `core/ports/` (abstract interface with DI token`), concrete
  implementations in `adapters/<name>/repositories/`
- Module wiring lives in `modules/<moduleName>.module.ts` (composes adapter + core)

## DI token
`{{constantCase moduleName}}_REPOSITORY` — defined in the port, referenced by use cases
and module wiring. Must be identical everywhere.
