# templates/node-koa-layered/

Koa + Layered Architecture (Controller-Service-Repository).

## Architecture
```
src/
├── main.ts
├── app.ts
├── config/env.ts
├── errors/app-error.ts
├── middlewares/
│   ├── error-handler.middleware.ts
│   ├── validate-body.middleware.ts            (Zod)
│   └── handle-validation-errors.middleware.ts  (class-validator)
├── routes/
│   └── <moduleName>/
│       ├── <moduleName>.entity.ts             (or .orm-entity for TypeORM/Mongoose)
│       ├── <moduleName>.repository.ts         (TypeORM/Mongoose/in-memory)
│       ├── <moduleName>.service.ts
│       ├── <moduleName>.controller.ts
│       ├── <moduleName>.routes.ts             (composition root!)
│       └── <moduleName>.validation.ts
└── shared/
    ├── database/{prisma.client, typeorm.datasource, mongoose.connection}
    └── cache/redis.client.ts
```

## Key traits
- **No shared files** (`"shared": null`) — Koa has its own set of root files,
  completely separate from Express
- `stackFeatures: "koa"` — core stack only (ORM/DB/validation/Redis/AGENT.md)
- **No DI container** — manual wiring in each module's `routes.ts`:
  `new Repository(); new Service(repo); new Controller(service);`
- Validation: Zod (recommended) or class-validator
- **Koa middleware model:** async/await — top-level error handler catches all
  thrown errors. Controllers throw, no manual try/catch needed.
- Request/response via `ctx.body`, `ctx.status`, `ctx.request.body` — no `res.send()`
- TypeScript compilation with `tsc`, dev server with `tsx watch`
- Error classes in `src/errors/`

## Adding to Koa template
Follow the `features-koa.js` pattern — reuse shared functions from `shared.js`
(`ormChoices`, `databaseChoices`) and add Koa-specific variants.
