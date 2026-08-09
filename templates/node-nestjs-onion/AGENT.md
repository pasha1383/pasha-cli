# templates/node-nestjs-onion/

NestJS + Onion Architecture.

## Architecture
```
src/
├── domain/                          ← innermost: entities, value objects, domain services
│   ├── entities/<moduleName>.entity.ts
│   ├── services/<moduleName>.domain-service.ts   ← pure domain logic
│   └── repositories/<moduleName>.repository.interface.ts
├── application/                     ← orchestrates domain, depends on ports (no framework)
│   ├── services/<moduleName>.service.ts          ← application service
│   ├── ports/<moduleName>.repository.port.ts     ← DI token + re-exports domain interface
│   ├── ports/messaging.port.ts                   ← messaging abstraction
│   └── dto/create-<moduleName>.dto.ts
├── infrastructure/                  ← adapters that implement ports
│   ├── persistence/<moduleName>.repository.ts
│   ├── web/<moduleName>.controller.ts
│   ├── web/<moduleName>.module.ts
│   └── messaging/kafka.publisher.ts
└── presentation/                    ← NestJS bootstrapping
    ├── app.module.ts
    └── main.ts
```

## Key traits
- **Self-contained** (`shared: null`) — no dependency on `_shared/nestjs/`
- `stackFeatures: "nestjs"` — full extras
- **Domain services** are pure classes with no framework imports — they hold business
  rules that operate on domain entities.
- **Application services** depend on ports (interfaces) and orchestrate domain
  services. They may use `@Injectable()` but have no HTTP/web concerns.
- Repository interface lives in `domain/repositories/` (pure, no DI token). The
  port in `application/ports/` re-exports it and adds the NestJS DI token.
- Module wiring lives in `infrastructure/web/<moduleName>.module.ts`.

## DI token
`{{constantCase moduleName}}_REPOSITORY` — defined in the application port
(`application/ports/<moduleName>.repository.port.ts`), referenced by application
services and module wiring. Must be identical everywhere.

## Dependency rule
`presentation` → `infrastructure` → `application` → `domain`. Nothing in a
concentric layer may import from an outer layer. Domain knows nothing about NestJS,
HTTP, or databases. Infrastructure implements interfaces defined in domain/application.
