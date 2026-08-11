# templates/nextjs-feature-sliced/

Next.js + Feature-Sliced Design (FSD).

## Architecture
```
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   └── <moduleName>/
│       └── page.tsx                 — thin route entry, delegates to feature
├── features/                         — business logic, self-contained
│   └── <moduleName>/
│       ├── ui/
│       │   └── <moduleName>List.tsx  — UI components
│       ├── model/
│       │   └── types.ts             — types and validation schemas
│       └── api/
│           └── <moduleName>.api.ts   — API layer
└── shared/                           — reusable across features
    └── ui/
        └── Button/
            └── Button.tsx
```

## Key traits
- Shared from `_shared/nextjs/files/`
- `stackFeatures: "nextjs"`
- Pages: route entry points, compose features into pages
- Widgets: composite UI blocks (not used in minimal scaffold)
- Features: business logic slices — model, api, ui per feature
- Entities: domain types (folded into feature model for simplicity)
- Shared: reusable UI kit and utilities
- Each feature is self-contained with its own API layer, types, and UI
