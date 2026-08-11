# templates/nextjs-page-based/

Next.js + Page-Based Architecture (Pages / Components / Hooks / Utils).

## Architecture
```
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   └── <moduleName>/
│       └── page.tsx                — route page, composes components
├── components/
│   └── <moduleName>/
│       ├── <moduleName>Card.tsx     — entity-specific UI
│       └── <moduleName>List.tsx     — entity list component
├── hooks/
│   └── use<moduleName>.ts           — data fetching / state logic
└── utils/
    └── <moduleName>.utils.ts        — formatting, filtering helpers
```

## Key traits
- Shared from `_shared/nextjs/files/`
- `stackFeatures: "nextjs"`
- Pages: app/ routes, thin — compose components and hooks
- Components: entity-scoped UI components (one folder per entity)
- Hooks: reusable state and data-fetching logic
- Utils: pure functions for formatting, filtering, validation
- Traditional but scales well for smaller projects
- Module files render once per user-named module
