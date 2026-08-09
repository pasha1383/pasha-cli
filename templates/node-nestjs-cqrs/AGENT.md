# templates/node-nestjs-cqrs/

NestJS + CQRS (Command Query Responsibility Segregation) with a simple in-process bus.

## Architecture
```
src/
├── main.ts
├── app.module.ts
├── config/{env, validation, swagger, zod}
├── shared/{database, cache, messaging, auth, health}
└── features/<moduleName>/
    ├── <moduleName>.module.ts
    ├── commands/
    │   ├── create-<moduleName>.command.ts
    │   ├── create-<moduleName>.handler.ts
    │   ├── update-<moduleName>.command.ts
    │   ├── update-<moduleName>.handler.ts
    │   └── delete-<moduleName>.handler.ts
    ├── queries/
    │   ├── get-<moduleName>.query.ts
    │   ├── get-<moduleName>.handler.ts
    │   ├── list-<moduleName>s.query.ts
    │   └── list-<moduleName>s.handler.ts
    ├── domain/
    │   ├── <moduleName>.entity.ts
    │   ├── <moduleName>.repository.interface.ts
    │   └── <moduleName>.events.ts
    ├── infrastructure/
    │   ├── <moduleName>.controller.ts
    │   ├── <moduleName>.repository.ts              (in-memory)
    │   ├── <moduleName>.orm-entity.ts              (TypeORM)
    │   ├── <moduleName>.typeorm.repository.ts      (TypeORM)
    │   ├── <moduleName>.schema.ts                  (Mongoose)
    │   ├── <moduleName>.mongoose.repository.ts     (Mongoose)
    │   ├── <moduleName>.prisma.repository.ts       (Prisma)
    │   └── bus.ts
    └── dto/
        ├── create-<moduleName>.dto.ts
        └── <moduleName>.response.ts
```

## Key traits
- Shared from `_shared/nestjs/files/`
- `stackFeatures: "nestjs"` — full extras
- Write path (commands) and read path (queries) are fully separated
- A simple in-process bus dispatches commands/queries to the right handler
- **CommandBus** — `execute(command)` returns `Promise<void>` or an event
- **QueryBus** — `execute(query)` returns `Promise<T>` (data)
- Handlers implement `ICommandHandler<C, R>` or `IQueryHandler<Q, R>`
- Controller sends commands via CommandBus and queries via QueryBus — never calls the repository directly
- Repository interface lives in `domain/`, implementation in `infrastructure/`
- Domain events are simple data classes for event-driven communication between features
- Per-ORM persistence files: one file per ORM type, gated by `fileConditions`

## DI token
`{{constantCase moduleName}}_REPOSITORY` — in the repository interface, used across
handlers and module wiring.

## How the bus works
At module initialization the module registers every handler with the appropriate bus
by command/query class type. The bus uses `constructor` as the lookup key to find
the correct handler when `execute()` is called.

## Write/read split
- **Commands**: Create, Update, Delete — mutate state, return void or an event
- **Queries**: GetById, List — read state, return data with no side effects
