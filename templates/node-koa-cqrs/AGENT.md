# templates/node-koa-cqrs/

Koa + CQRS (Command Query Responsibility Segregation) with a simple in-process bus.

## Architecture
```
src/
├── main.ts
├── app.ts
├── config/{env, swagger}
├── errors/app-error.ts
├── middlewares/{error-handler, validate-body}
├── shared/{database, cache, health, auth}
└── features/<moduleName>/
    ├── <moduleName>.routes.ts                    (composition root!)
    ├── commands/
    │   ├── create-<moduleName>.command.ts
    │   ├── create-<moduleName>.handler.ts
    │   ├── update-<moduleName>.command.ts
    │   ├── update-<moduleName>.handler.ts
    │   └── delete-<moduleName>.handler.ts        (command class inline)
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
    │   ├── bus.ts
    │   ├── <moduleName>.controller.ts
    │   ├── <moduleName>.repository.ts            (in-memory)
    │   ├── <moduleName>.orm-entity.ts            (TypeORM)
    │   ├── <moduleName>.typeorm.repository.ts    (TypeORM)
    │   ├── <moduleName>.schema.ts                (Mongoose)
    │   ├── <moduleName>.mongoose.repository.ts   (Mongoose)
    │   └── <moduleName>.prisma.repository.ts     (Prisma)
    └── dto/
        ├── create-<moduleName>.dto.ts
        └── <moduleName>.response.ts
```

## Key traits
- **No shared files** (`"shared": null`) — Koa has its own set of root files
- `stackFeatures: "koa"` — core stack only (ORM/DB/validation/Redis/AGENT.md)
- **No DI container** — manual wiring in each module's `routes.ts`
- Write path (commands) and read path (queries) are fully separated
- **CommandBus** — `execute(command)` returns `Promise<R>`
- **QueryBus** — `execute(query)` returns `Promise<T>` (data)
- Handlers implement `ICommandHandler<C, R>` or `IQueryHandler<Q, R>`
- Controller sends commands via CommandBus and queries via QueryBus — never calls repository directly
- Repository interface lives in `domain/`, implementation in `infrastructure/`
- **Koa middleware model:** async/await — controllers handle ctx directly
- Error handling via thrown `AppError`/`NotFoundError` from `src/errors/`

## How the bus works
In `routes.ts` the module registers every handler with the appropriate bus
by command/query class type. The bus uses `constructor` as the lookup key to find
the correct handler when `execute()` is called.

## Write/read split
- **Commands**: Create, Update, Delete — mutate state, return void or an event
- **Queries**: GetById, List — read state, return data with no side effects

## Per-ORM persistence files
One file per ORM type, gated by `fileConditions` in template.json.
