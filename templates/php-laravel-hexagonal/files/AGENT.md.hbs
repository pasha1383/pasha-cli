# AGENT.md — {{projectName}}

Context for AI coding agents working in this repository.

## Project

- **Name:** {{projectName}}
- **Description:** {{description}}
- **Framework:** Laravel (PHP) — Hexagonal / DDD
- **Architecture:** {{architectureLabel}}
{{#if ormEloquent}}
- **ORM:** Eloquent (built-in){{/if}}
{{#if ormNone}}
- **Data layer:** in-memory repositories{{/if}}
{{#if hasDatabase}}
- **Database:** {{database}}{{/if}}
{{#if hasValidation}}
- **Validation:** Laravel Validator{{/if}}
{{#if useRedis}}
- **Cache:** Redis (Predis){{/if}}
{{#if hasBroker}}
- **Queue:** Redis Queue{{/if}}
{{#if useSwagger}}
- **API docs:** Swagger UI via L5-Swagger{{/if}}
{{#if useAuth}}
- **Auth:** Laravel Sanctum (token-based){{/if}}
{{#if useHealthCheck}}
- **Health:** `GET /api/health`{{/if}}
{{#if useRateLimit}}
- **Rate limiting:** Laravel throttle middleware{{/if}}

## Modules

{{#each modules}}
- `{{this}}`
{{/each}}

## Architecture

```
[HTTP Adapter] → [Application Port] → [Domain] ← [Persistence Port] ← [Persistence Adapter]
```

1. **Domain** (`src/Domain/`) — Domain entities, value objects, domain services.
2. **Application** (`src/Application/`) — Ports (interfaces) and Use Cases.
3. **Infrastructure** (`src/Infrastructure/`) — Adapters: HTTP controllers,
   Eloquent repositories, external services.

## Commands

```bash
php artisan serve                        # dev server on :8000
php artisan migrate                      # run migrations
php artisan route:list                   # list all routes
php artisan tinker                       # interactive REPL
{{#if useLint}}
./vendor/bin/pint                        # lint & fix
{{/if}}
{{#if useTests}}
./vendor/bin/phpunit                     # run tests
{{/if}}
{{#if useDocker}}
docker compose up -d
docker compose down
{{/if}}
```

## Hard rules

1. **Ports define contracts.** `src/Application/Ports/` contains interfaces.
   Adapters implement these interfaces.
2. **Domain is pure.** No framework code, no persistence annotations, no HTTP.
3. **Adapters depend on ports.** Infrastructure implements Application ports.
   Never the other way.
4. **Use Cases orchestrate.** `src/Application/UseCases/` accepts port interfaces
   via constructor DI and calls them.
5. **Controllers are HTTP adapters.** They translate HTTP requests to use case
   inputs and use case outputs to HTTP responses.
6. **Every external boundary is a port+adapter pair.** DB, cache, queue, mail,
   etc.
7. **`config()` only.** No `env()` outside config files.

## When you are unsure

Prefer asking over guessing.
