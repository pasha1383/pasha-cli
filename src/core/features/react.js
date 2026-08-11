'use strict';

/**
 * React (Vite SPA) frontend feature selection.
 *
 * Frontend architecture means component organisation, not dependency direction.
 * Feature options reflect frontend concerns — no ORM, no database, no broker.
 */

function ormChoices(_framework) {
  return [];
}

function databaseChoices(_orm) {
  return [];
}

function validationChoices() {
  return [
    { name: 'Zod', value: 'zod' },
    { name: 'Yup', value: 'yup' },
    { name: 'None', value: 'none' },
  ];
}

function brokerChoices() {
  return [];
}

function extraFeatureChoices() {
  return [
    { name: 'Tailwind CSS', value: 'tailwind', checked: true },
    { name: 'Shadcn/ui', value: 'shadcn', checked: false },
    { name: 'ESLint + Prettier', value: 'lint', checked: true },
    { name: 'Vitest (unit tests)', value: 'vitest', checked: true },
    { name: 'Playwright (e2e tests)', value: 'playwright', checked: false },
    { name: 'Storybook', value: 'storybook', checked: false },
    { name: 'GitHub Actions CI', value: 'ci', checked: false },
    { name: 'PWA (vite-plugin-pwa)', value: 'pwa', checked: false },
    { name: 'Dockerfile', value: 'dockerfile', checked: false },
    { name: 'React Router', value: 'reactRouter', checked: true },
    { name: 'TanStack Query', value: 'tanstackQuery', checked: false },
    { name: 'Zustand', value: 'zustand', checked: false },
    { name: 'Redux Toolkit', value: 'reduxToolkit', checked: false },
  ];
}

function deriveFlags(answers) {
  const validation = answers.validation || 'none';

  const flags = {
    validation,

    useZod: validation === 'zod',
    useYup: validation === 'yup',
    hasValidation: validation !== 'none',

    useAgentDocs: answers.useAgentDocs !== false,
  };

  const extras = new Set(answers.extras || []);
  flags.useTailwind = extras.has('tailwind');
  flags.useShadcn = extras.has('shadcn');
  flags.useLint = extras.has('lint');
  flags.useVitest = extras.has('vitest');
  flags.usePlaywright = extras.has('playwright');
  flags.useStorybook = extras.has('storybook');
  flags.useCI = extras.has('ci');
  flags.usePWA = extras.has('pwa');
  flags.useDockerfile = extras.has('dockerfile');
  flags.useReactRouter = extras.has('reactRouter');
  flags.useTanstackQuery = extras.has('tanstackQuery');
  flags.useZustand = extras.has('zustand');
  flags.useReduxToolkit = extras.has('reduxToolkit');

  return flags;
}

function resolveDependencies(flags) {
  const dependencies = {
    react: '^18.3.1',
    'react-dom': '^18.3.1',
  };

  const devDependencies = {
    vite: '^5.4.0',
    '@vitejs/plugin-react': '^4.3.1',
    typescript: '^5.5.0',
    '@types/react': '^18.3.3',
    '@types/react-dom': '^18.3.0',
  };

  if (flags.useTailwind) {
    devDependencies.tailwindcss = '^3.4.7';
    devDependencies.postcss = '^8.4.40';
    devDependencies.autoprefixer = '^10.4.20';
  }

  if (flags.useShadcn) {
    devDependencies['@types/node'] = '^20.14.0';
    dependencies['class-variance-authority'] = '^0.7.0';
    dependencies.clsx = '^2.1.1';
    dependencies['tailwind-merge'] = '^2.4.0';
    dependencies['lucide-react'] = '^0.424.0';
    devDependencies['@radix-ui/react-slot'] = '^1.1.0';
    devDependencies['tailwindcss-animate'] = '^1.0.7';
  }

  if (flags.useLint) {
    devDependencies.eslint = '^8.57.0';
    devDependencies['@typescript-eslint/eslint-plugin'] = '^7.18.0';
    devDependencies['@typescript-eslint/parser'] = '^7.18.0';
    devDependencies['eslint-plugin-react-hooks'] = '^4.6.2';
    devDependencies['eslint-plugin-react-refresh'] = '^0.4.9';
    devDependencies['eslint-config-prettier'] = '^9.1.0';
    devDependencies['eslint-plugin-prettier'] = '^5.2.1';
    devDependencies.prettier = '^3.3.3';
  }

  if (flags.useVitest) {
    devDependencies.vitest = '^2.0.5';
    devDependencies['@testing-library/react'] = '^16.0.0';
    devDependencies['@testing-library/jest-dom'] = '^6.4.8';
    devDependencies['@testing-library/user-event'] = '^14.5.2';
    devDependencies['jsdom'] = '^24.1.1';
  }

  if (flags.usePlaywright) {
    devDependencies['@playwright/test'] = '^1.46.0';
  }

  if (flags.useStorybook) {
    devDependencies.storybook = '^8.2.8';
    devDependencies['@storybook/react'] = '^8.2.8';
    devDependencies['@storybook/react-vite'] = '^8.2.8';
    devDependencies['@storybook/addon-essentials'] = '^8.2.8';
    devDependencies['@storybook/addon-interactions'] = '^8.2.8';
    devDependencies['@storybook/addon-links'] = '^8.2.8';
    devDependencies['@storybook/test'] = '^8.2.8';
  }

  if (flags.usePWA) {
    devDependencies['vite-plugin-pwa'] = '^0.20.1';
    devDependencies['workbox-window'] = '^7.1.0';
  }

  if (flags.useReactRouter) {
    dependencies['react-router-dom'] = '^6.26.0';
  }

  if (flags.useTanstackQuery) {
    dependencies['@tanstack/react-query'] = '^5.51.0';
  }

  if (flags.useZustand) {
    dependencies.zustand = '^4.5.4';
  }

  if (flags.useReduxToolkit) {
    dependencies['@reduxjs/toolkit'] = '^2.2.7';
    dependencies['react-redux'] = '^9.1.2';
  }

  return { dependencies, devDependencies };
}

function resolveScripts(flags) {
  const scripts = {
    dev: 'vite',
    build: 'tsc -b && vite build',
    preview: 'vite preview',
  };

  if (flags.useLint) {
    scripts.lint = 'eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0';
    scripts.format = 'prettier --write "src/**/*.{ts,tsx,css}"';
  }

  if (flags.useVitest) {
    scripts.test = 'vitest run';
    scripts['test:watch'] = 'vitest';
    scripts['test:cov'] = 'vitest run --coverage';
  }

  if (flags.usePlaywright) {
    scripts['test:e2e'] = 'playwright test';
  }

  if (flags.useStorybook) {
    scripts.storybook = 'storybook dev -p 6006';
    scripts['build-storybook'] = 'storybook build';
  }

  return scripts;
}

module.exports = {
  ormChoices,
  databaseChoices,
  validationChoices,
  brokerChoices,
  extraFeatureChoices,
  deriveFlags,
  resolveDependencies,
  resolveScripts,
};
