# templates/_shared/nextjs/

Shared Next.js template files, rendered first before architecture-specific overrides.

## Files
- `package.json.hbs`, `tsconfig.json.hbs` — core config
- `next.config.ts.hbs` — Next.js configuration
- `tailwind.config.ts`, `postcss.config.mjs.hbs`, `src/app/globals.css` — Tailwind CSS
- `src/app/layout.tsx.hbs`, `src/app/page.tsx.hbs` — App Router root layout and page
- `.eslintrc.json.hbs`, `.prettierrc` — linting/formatting
- `jest.config.ts.hbs`, `jest.setup.ts` — unit testing
- `playwright.config.ts.hbs`, `e2e/home.spec.ts.hbs` — E2E testing
- `Dockerfile.hbs`, `.dockerignore` — container build
- `.github/workflows/ci.yml.hbs` — CI pipeline
- `src/i18n.ts.hbs`, `src/messages/en.json.hbs` — i18n with next-intl
- `.editorconfig`, `.gitignore` — standard files
