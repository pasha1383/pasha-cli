# templates/node-nestjs-serverless/

NestJS + Serverless deployment for AWS Lambda using `@codegenie/serverless-express`.

## Architecture
```
src/
├── main.ts              ← local dev HTTP server
├── lambda.ts            ← AWS Lambda handler entry point
├── handler.ts           ← @codegenie/serverless-express wrapper (cached singleton)
├── app.module.ts
├── config/
│   └── app.config.ts
└── <moduleName>/
    ├── <moduleName>.controller.ts ← HTTP REST controller
    └── <moduleName>.module.ts
serverless.yml           ← Serverless Framework configuration
```

## Key traits
- Shared from `_shared/nestjs/files/`
- `stackFeatures: "nestjs"` — full extras checkbox (Swagger, lint, tests, CI, auth, health, Dockerfile, rate limiting)
- `handler.ts` wraps the NestJS app with `@codegenie/serverless-express`; caches the instance between cold starts via the Lambda execution environment reuse
- `lambda.ts` is the actual Lambda handler exported for AWS — it delegates to the cached serverless-express handler
- `main.ts` is for local development only; runs a standard HTTP server on the configured port
- Controller is a standard NestJS `@Controller` with HTTP REST endpoints — no special Lambda-specific code needed
- `serverless.yml` configured at project root for the Serverless Framework `sls deploy` workflow
- Post-install adds `@codegenie/serverless-express`, `aws-lambda`, and `serverless` packages

## DI token
No custom DI tokens needed — standard NestJS controller injection.
