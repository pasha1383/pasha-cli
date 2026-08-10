# templates/node-koa-event-driven/

Koa + Event-Driven / Event Sourcing architecture. Domain events are the source of truth.

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
    ├── <moduleName>.routes.ts                   (composition root!)
    ├── commands/
    │   ├── create-<moduleName>.command.ts
    │   └── create-<moduleName>.command-handler.ts
    ├── events/
    │   ├── <moduleName>-created.event.ts
    │   ├── <moduleName>-updated.event.ts
    │   └── <moduleName>-deleted.event.ts
    ├── aggregates/
    │   └── <moduleName>.aggregate.ts
    ├── projections/
    │   └── <moduleName>.projection.ts
    ├── event-store/
    │   └── event-store.ts
    ├── dto/
    │   └── create-<moduleName>.dto.ts
    └── infrastructure/
        ├── <moduleName>.controller.ts
        └── outbox/
            └── outbox.ts
```

## Key traits
- **No shared files** (`"shared": null`) — Koa has its own set of root files
- `stackFeatures: "koa"` — core stack only (ORM/DB/validation/Redis/AGENT.md)
- **No DI container** — manual wiring in each module's `routes.ts`
- **Domain events are the source of truth** — no direct entity persistence, only event appends
- **Event Store** — append-only immutable log of all domain events
- **Aggregate** — rebuilds state by replaying events (`loadFromHistory`), tracks uncommitted events
- **Projection** — subscribes to events, builds/maintains denormalized read models
- **Outbox** — after appending events, stores them for reliable publishing
- **Command Handler** — validates, loads aggregate, calls domain methods, appends new events to store
- Write path: Controller → Command → Handler → Aggregate → Event Store → Outbox
- Read path: Controller → Projection (read model)
- No traditional repository — all state changes go through the event store
- **Koa middleware model:** async/await — controllers handle ctx directly
- Error handling via thrown `AppError`/`NotFoundError` from `src/errors/`

## Event Store
In-memory implementation included. Append-only with concurrency checks via expected version.
StoredEvent shape: `{ id, aggregateId, aggregateType, eventType, payload, version, createdAt }`.

## Aggregate
Pure domain class. Methods like `create`, `updateName`, `delete` call private `applyChange(event)` which
mutates internal state. `getUncommittedEvents()` returns events not yet persisted. After persistence,
`markEventsAsCommitted()` clears the queue.

## Projection
Maintains a materialized view (in-memory Map by default). The `handleXxxEvent(event)` methods update
the projection state. Read-side queries hit the projection directly, never the event store.

## Outbox
Simple in-memory outbox queue. Events are enqueued after store append. In production this would
be backed by a DB table with a relay polling and publishing to a message broker.
