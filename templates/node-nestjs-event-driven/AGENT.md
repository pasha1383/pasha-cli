# templates/node-nestjs-event-driven/

NestJS + Event-Driven / Event Sourcing architecture. Domain events are the source of truth.

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
            └── outbox.service.ts
```

## Key traits
- Shared from `_shared/nestjs/files/`
- `stackFeatures: "nestjs"` — full extras
- **Domain events are the source of truth** — no direct entity persistence, only event appends
- **Event Store** — append-only immutable log of all domain events
- **Aggregate** — rebuilds state by replaying events (`loadFromHistory`), tracks uncommitted events
- **Projection** — subscribes to events, builds/maintains denormalized read models
- **Outbox** — after appending events, writes to an outbox table for reliable publishing to Kafka/RabbitMQ
- **Command Handler** — validates, loads aggregate, calls domain methods, appends new events to store
- Write path: Controller → Command → Handler → Aggregate → Event Store → Outbox
- Read path: Controller → Query → Projection (read model)
- No traditional repository — all state changes go through the event store
- If broker is selected, the outbox relay polls the outbox and publishes to Kafka/RabbitMQ

## Event Store
In-memory implementation included. For Prisma-backed store, events table has columns:
`id`, `aggregateId`, `aggregateType`, `eventType`, `payload` (json), `version`, `createdAt`.

## Aggregate
Pure domain class. Methods like `create`, `updateName`, `delete` call `this.apply(event)` which
mutates internal state. `getUncommittedEvents()` returns events not yet persisted. After persistence,
`markEventsAsCommitted()` clears the queue.

## Projection
Maintains a materialized view (in-memory Map by default, swappable to Redis/DB).
The `handleXxxEvent(event)` methods update the projection state. Read-side queries hit the
projection directly, never the event store.
