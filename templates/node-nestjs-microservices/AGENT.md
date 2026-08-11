# templates/node-nestjs-microservices/

NestJS + Microservices architecture using `@nestjs/microservices` with pluggable transports (TCP, Redis, Kafka, RabbitMQ, NATS, gRPC).

## Architecture
```
src/
├── main.ts                       ← hybrid HTTP + microservice bootstrap
├── app.module.ts
├── config/
│   └── app.config.ts
└── <moduleName>/
    ├── <moduleName>.controller.ts ← @MessagePattern / @EventPattern handlers
    └── <moduleName>.module.ts
```

## Key traits
- Shared from `_shared/nestjs/files/`
- `stackFeatures: "nestjs"` — full extras checkbox (Swagger, lint, tests, CI, auth, health, Dockerfile, rate limiting)
- `main.ts` creates a **hybrid application**: an HTTP server plus a `connectMicroservice()` transport listener
- Controllers use `@MessagePattern` for request-response (RPC) and `@EventPattern` for fire-and-forget events
- Transport is configured via environment variables (`MICROSERVICE_HOST`, `MICROSERVICE_PORT`, `MICROSERVICE_TRANSPORT`)
- Does **not** include docker-compose microservice orchestration — this is a single-service template that connects to external message brokers
- Post-install adds `@nestjs/microservices` package

## DI token
No custom DI tokens needed — controllers handle messages directly via decorators.
