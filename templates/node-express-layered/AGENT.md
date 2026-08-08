# templates/node-express-layered/

Express + Layered Architecture (Controller-Service-Repository).

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
│   └── handle-validation-errors.middleware.ts  (express-validator)
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
- **No shared files** (`"shared": null`) — Express has its own set of root files,
  completely separate from NestJS
- `stackFeatures: "express"` — core stack only (ORM/DB/validation/Redis/broker/AGENT.md)
- **No DI container** — manual wiring in each module's `routes.ts`:
  `new Repository(); new Service(repo); new Controller(service);`
- Validation: `express-validator` or Zod (not class-validator)
- TypeScript compilation with `tsc`, dev server with `tsx watch`
- Error classes in `src/errors/` (top-level, not in gated `shared/` — gotcha #8)

## 8 NestJS extras NOT yet ported
Swagger, ESLint+Prettier, Jest tests, GitHub Actions CI, JWT auth, health checks,
Dockerfile, rate limiting are all NestJS-only for now.

## Adding to Express template
Follow the `features-express.js` pattern — reuse shared functions from `features.js`
(`ormChoices`, `databaseChoices`, `brokerChoices`) and add Express-specific variants.
