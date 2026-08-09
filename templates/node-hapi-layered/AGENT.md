# templates/node-hapi-layered/

Hapi + Layered Architecture (Handler-Service-Repository).

## Architecture
```
src/
├── main.ts                                     ← bootstraps and starts the server
├── server.ts                                    ← initServer() factory, plugin + route registration
├── config/env.ts
├── errors/app-error.ts
├── plugins/
│   ├── swagger.ts                               (gate: useSwagger)
│   └── auth.ts                                  (gate: useAuth)
├── routes/
│   └── <moduleName>/
│       ├── <moduleName>.entity.ts               (or .orm-entity for TypeORM/Mongoose)
│       ├── <moduleName>.repository.ts           (TypeORM/Mongoose/in-memory)
│       ├── <moduleName>.service.ts
│       ├── <moduleName>.handler.ts              (Hapi route handlers)
│       ├── <moduleName>.routes.ts               (exports ServerRoute[])
│       └── <moduleName>.validation.ts           (Joi/Zod)
└── shared/
    ├── database/{prisma.client, typeorm.datasource, mongoose.connection}
    ├── cache/redis.client.ts
    └── health/health.routes.ts
```

## Key traits
- **No shared files** (`"shared": null`) — Hapi has its own set of root files
- `stackFeatures: "hapi"` — core stack only (ORM/DB/validation/Redis/AGENT.md)
- **No DI container** — manual wiring in each module's `routes.ts`
- **No middleware** — Hapi uses the plugin system and `server.ext()` for cross-cutting concerns
- Route config: `{ method, path, handler, options: { validate: { payload: schema } } }`
- Handlers: `async (request, h) => h.response(data).code(201)`
- Plugins registered via `await server.register([...])`
- TypeScript compilation with `tsc`, dev server with `tsx watch`
