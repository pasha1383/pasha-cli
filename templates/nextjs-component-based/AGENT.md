# templates/nextjs-component-based/

Next.js + Component-Based Architecture (Atoms / Molecules / Organisms).

## Architecture
```
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   └── <moduleName>/
│       └── page.tsx             — page using organism components
├── components/
│   ├── atoms/
│   │   └── Button/
│   │       └── Button.tsx       — smallest building blocks
│   ├── molecules/
│   │   └── <moduleName>Card/
│   │       ├── <moduleName>Card.tsx   — composite of atoms
│   │       └── <moduleName>Card.spec.tsx
│   └── organisms/
│       └── <moduleName>List/
│           └── <moduleName>List.tsx   — composite of molecules
```

## Key traits
- Shared from `_shared/nextjs/files/`
- `stackFeatures: "nextjs"` — full extras checkbox (Tailwind, ESLint, Prettier, Jest, Playwright, Storybook, CI, PWA, i18n, Dockerfile)
- Atoms: primitive UI elements (buttons, inputs, labels)
- Molecules: combinations of atoms (cards, forms, search bars)
- Organisms: complete sections composed of molecules and atoms
- Module files render once per user-named module, adding molecule/organism for that entity
