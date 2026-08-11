# AGENT.md — {{projectName}}

Context for AI coding agents working in this repository.

## Project

- **Name:** {{projectName}}
- **Description:** {{description}}
- **Framework:** Laravel (PHP) — Modular Monolith
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

## Module structure

Each module under `Modules/{{pascalCase moduleName}}/` is self-contained:

```
Modules/{{pascalCase moduleName}}/
  Http/Controllers/
  Http/Requests/
  Http/Resources/
  Models/
  Services/
  Repositories/
  Database/Migrations/
  Routes/api.php
  Tests/
```

## Commands

```bash
php artisan serve                        # dev server on :8000
php artisan migrate                      # run all module migrations
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

1. **One module per business capability.** Each module is vertically sliced
   and owns its HTTP, persistence, and business logic.
2. **Modules communicate through Services, not DB.** Cross-module calls go
   through service classes or events, never direct queries.
3. **Each module registers its own routes.** Module routes live in
   `Modules/{{pascalCase moduleName}}/Routes/api.php` and are loaded by the RouteServiceProvider.
4. **Controller → Service → Repository → Model** within each module.
5. **Form Requests per module.** Validation never leaks between modules.
6. **Shared code lives in `app/` (the framework shell).** If two modules need
   the same thing, consider an abstraction in `app/`.
7. **`config()` only.** No `env()` outside config files.
8. **Migrations stay in their module** under `Database/Migrations/`.
   The framework discovers them via the module service provider.

## When you are unsure

Prefer asking over guessing.
