# templates/node-serverless/

Serverless Handler-per-Function on Node.js/TypeScript — AWS Lambda / Cloudflare Workers.

## Architecture
```
src/
├── handlers/
│   ├── create-<moduleName>.ts      ← POST handler
│   ├── get-<moduleName>.ts         ← GET /:id handler
│   ├── list-<moduleName>s.ts       ← GET / handler
│   └── <moduleName>.entity.ts      ← domain model
├── lib/
│   ├── response.ts                 ← API Gateway / Workers response helpers
│   ├── middleware.ts               ← auth, Zod validation, error handling
│   └── database/
│       ├── prisma.client.ts        ← Prisma singleton (gate: ormPrisma)
│       └── mongoose.connection.ts  ← Mongoose connection (gate: ormMongoose)
├── types/
│   └── <moduleName>.ts             ← TS interfaces
└── infrastructure/
    ├── serverless.yml              ← Serverless Framework config (AWS)
    └── wrangler.toml               ← Cloudflare Workers config
```

## Key traits
- `"shared": null` — no shared files from other templates
- `stackFeatures: "serverless"` — dedicated feature module
- **Handler-per-function**: each endpoint is a standalone file deployable as a Lambda function
- **No Express / Fastify** — handlers receive raw `APIGatewayProxyEvent` and return `APIGatewayProxyResult`
- **Cold-start aware** — no persistent connections, no global state outside lazy init
- ORM: Prisma, Mongoose (both have connection reuse via `callbackWaitsForEmptyEventLoop`)
- Validation: Zod (no express-validator)
- No broker support (serverless functions don't run persistent consumers)
- No rate limiting, no Swagger, no health-check endpoint (not applicable to serverless)
- Auth: raw JWT verification (no passport — too heavy for cold starts)
- Module composition: manual wiring in each handler file

## Adding to Serverless template
Follow the `features-serverless.js` pattern — minimal feature module reusing shared types from `shared.js`.
