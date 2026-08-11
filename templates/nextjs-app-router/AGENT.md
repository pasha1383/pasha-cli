# templates/nextjs-app-router/

Next.js + App Router native architecture.

## Architecture
```
src/
├── app/
│   ├── layout.tsx                        — root layout (Server Component)
│   ├── page.tsx                          — root page
│   ├── globals.css
│   └── <moduleName>/
│       ├── page.tsx                      — route page (Server Component by default)
│       └── components/
│           ├── <moduleName>Card.tsx       — entity card
│           └── <moduleName>List.tsx       — entity list (Client Component)
├── lib/
│   └── <moduleName>.ts                   — data fetching, business logic
```

## Key traits
- Shared from `_shared/nextjs/files/`
- `stackFeatures: "nextjs"`
- Colocation: component files live next to the page that uses them
- Server Components by default — pages are server-rendered unless 'use client' is specified
- `lib/` for shared data access and business logic
- Minimal abstraction — paths match URLs directly
- Best for projects that want to leverage Next.js App Router conventions without extra structural layers
- Module files render once per user-named module
