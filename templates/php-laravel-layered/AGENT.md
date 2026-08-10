# AGENT.md — {{projectName}}

Context for AI coding agents working in this repository.

## Project

- **Name:** {{projectName}}
- **Description:** {{description}}
- **Framework:** Laravel (PHP) — N-Tier Layered architecture
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

## Commands

```bash
php artisan serve                        # dev server on :8000
php artisan migrate                      # run migrations
php artisan migrate:fresh --seed         # reset DB + seed
php artisan route:list                   # list all routes
php artisan tinker                       # interactive REPL
{{#if useLint}}
./vendor/bin/pint                        # lint & fix
{{/if}}
{{#if useTests}}
./vendor/bin/phpunit                     # run tests
{{/if}}
{{#if useSwagger}}
php artisan l5-swagger:generate          # regenerate API docs
{{/if}}
{{#if useDocker}}
docker compose up -d                     # start infra
docker compose down
{{/if}}
```

## Architecture layers (top → bottom)

1. **Controllers** (`app/Http/Controllers/`) — HTTP layer: parse requests,
   call services, return responses via API Resources.
2. **Form Requests** (`app/Http/Requests/`) — Validation and authorization gates.
3. **API Resources** (`app/Http/Resources/`) — Response transformation.
4. **Services** (`app/Services/`) — Business logic and orchestration.
5. **Repositories** (`app/Repositories/`) — Data access abstraction over Eloquent.
6. **Models** (`app/Models/`) — Eloquent models; no business logic.

## Hard rules

1. **Strict N-Tier.** Controllers → Services → Repositories → Models.
   No skipping layers. No reverse dependencies.
2. **No Eloquent in Services.** Services depend on Repository interfaces.
   The Repository hides Eloquent behind its API.
3. **Form Requests for validation.** Never call `$request->validate()` in a controller.
4. **API Resources for serialization.** Controllers return Resource classes,
   never raw models or arrays.
5. **`config()` only.** Configuration is read via `config()`, not `env()`.
6. **Services are the only place for business logic.** Controllers are thin.
7. **Adding a module requires every layer:** Controller, FormRequest, Resource,
   Service, Repository, Model{{#if ormEloquent}}, Migration{{/if}}{{#if useTests}}, Feature test{{/if}}.
8. **Routes registered in `routes/api.php`.**

## When you are unsure

Prefer asking over guessing.
