# AGENT.md — {{projectName}}

Context for AI coding agents working in this repository.

## Project

- **Name:** {{projectName}}
- **Description:** {{description}}
- **Framework:** Laravel (PHP) — Clean Architecture
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

## Architecture layers (inner → outer)

1. **Domain** (`src/Domain/`) — Enterprise entities. No framework dependencies.
2. **Application** (`src/Application/UseCases/`) — Use cases / interactors.
   Depends only on Domain.
3. **Infrastructure** (`src/Infrastructure/`) — Framework adapters.
   Http controllers, Eloquent persistence, external integrations.

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

1. **Dependency rule.** Dependencies point inward. Domain knows nothing.
   Application knows only Domain. Infrastructure knows Application + Domain.
2. **Entities are plain PHP objects.** No Eloquent, no annotations, no framework
   code in `src/Domain/`.
3. **Repository interfaces in Domain.** `src/Domain/{{pascalCase moduleName}}RepositoryInterface.php`.
   Implementations are in `src/Infrastructure/Persistence/`.
4. **Use Cases are single-purpose.** One public method per use case.
   `Create{{pascalCase moduleName}}UseCase`, `Get{{pascalCase moduleName}}UseCase`, etc.
5. **Controllers wire use cases.** Controllers receive the use case via DI,
   call it, return a Resource.
6. **No `env()` outside bootstrap.** Use `config()` for configuration.
7. **Form Requests** handle validation in `src/Infrastructure/Http/Requests/`.

## When you are unsure

Prefer asking over guessing.
