# templates/nextjs-atomic-design/

Next.js + Atomic Design (Atoms / Molecules / Organisms / Templates / Pages).

## Architecture
```
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   └── <moduleName>/
│       └── page.tsx                    — page instance (specific content)
├── components/
│   ├── atoms/
│   │   └── Button/
│   │       └── Button.tsx             — primitive, cannot be broken down
│   ├── molecules/
│   │   └── <moduleName>Card/
│   │       └── <moduleName>Card.tsx    — groups of atoms
│   ├── organisms/
│   │   └── <moduleName>List/
│   │       └── <moduleName>List.tsx    — groups of molecules + atoms
│   └── templates/
│       └── <moduleName>Template/
│           └── <moduleName>Template.tsx — page-level layout without content
```

## Key traits
- Shared from `_shared/nextjs/files/`
- `stackFeatures: "nextjs"`
- Atoms: fundamental UI elements (buttons, inputs, labels)
- Molecules: simple component groups (cards, form fields)
- Organisms: complex UI sections (lists, headers, footers)
- Templates: page-level wireframes, abstracting layout from content
- Pages: specific instances — a template filled with real data
- Module files render once per user-named module
