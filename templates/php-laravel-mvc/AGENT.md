# AGENT.md — {{projectName}}

Context for AI coding agents working in this repository.

## Project

- **Name:** {{projectName}}
- **Description:** {{description}}
- **Framework:** Laravel (PHP) — MVC architecture
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
./vendor/bin/pint --test                 # lint check only
{{/if}}
{{#if useTests}}
./vendor/bin/phpunit                     # run tests
./vendor/bin/phpunit --filter=ClassName  # filter tests
{{/if}}
{{#if useSwagger}}
php artisan l5-swagger:generate          # regenerate OpenAPI docs
{{/if}}
{{#if useDocker}}
docker compose up -d                     # start databases/brokers
docker compose down
{{/if}}
```

## Hard rules

1. **Controller → Service → Repository → Model.** A layer only calls the one directly
   below it. Controllers never touch Models or Repositories directly.
2. **Form Requests handle validation.** Validation logic lives in
   `app/Http/Requests/`, not in controllers or services.
3. **API Resources shape responses.** Use `app/Http/Resources/` for JSON
   transformation. Never return raw Eloquent models from controllers.
4. **`config/*.php` is the only place that reads `env()`.** Use `config()` helper
   everywhere else.
5. **Business logic belongs in Services.** Controllers orchestrate
   (request → service → resource), they contain no business rules.
6. **Eloquent models are data-access only.** No business logic in models beyond
   accessors, mutators, and relationships.
7. **Adding a module means adding:** Controller, FormRequest, Resource, Model,
   Migration, Service, Repository{{#if useTests}}, tests{{/if}}.
8. **Register new routes** in `routes/api.php` or they won't be reachable.
{{#if useAuth}}
9. **Protected endpoints** use the `auth:sanctum` middleware.
{{/if}}

## When you are unsure

Prefer asking over guessing. Generating a plausible-looking file in the wrong
layer costs more to unpick than a clarifying question costs to answer.
