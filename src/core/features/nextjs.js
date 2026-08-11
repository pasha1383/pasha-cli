'use strict';

/**
 * Next.js frontend feature selection.
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
    { name: 'ESLint', value: 'lint', checked: true },
    { name: 'Prettier', value: 'prettier', checked: true },
    { name: 'Jest', value: 'tests', checked: true },
    { name: 'Playwright (E2E)', value: 'playwright', checked: false },
    { name: 'Storybook', value: 'storybook', checked: false },
    { name: 'GitHub Actions CI (lint, test, build)', value: 'ci', checked: false },
    { name: 'PWA (next-pwa)', value: 'pwa', checked: false },
    { name: 'i18n (next-intl)', value: 'i18n', checked: false },
    { name: 'Dockerfile', value: 'dockerfile', checked: false },
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
  flags.useLint = extras.has('lint');
  flags.usePrettier = extras.has('prettier');
  flags.useTests = extras.has('tests');
  flags.usePlaywright = extras.has('playwright');
  flags.useStorybook = extras.has('storybook');
  flags.useCI = extras.has('ci');
  flags.usePWA = extras.has('pwa');
  flags.useI18n = extras.has('i18n');
  flags.useDockerfile = extras.has('dockerfile');

  return flags;
}

function resolveDependencies(flags) {
  const dependencies = {
    next: '^14.2.0',
    react: '^18.3.0',
    'react-dom': '^18.3.0',
  };

  const devDependencies = {
    typescript: '^5.4.0',
    '@types/node': '^20.0.0',
    '@types/react': '^18.3.0',
    '@types/react-dom': '^18.3.0',
  };

  if (flags.useTailwind) {
    devDependencies.tailwindcss = '^3.4.0';
    devDependencies.postcss = '^8.4.0';
    devDependencies.autoprefixer = '^10.4.0';
  }

  if (flags.useZod) {
    dependencies.zod = '^3.23.0';
  }

  if (flags.useYup) {
    dependencies.yup = '^1.4.0';
  }

  if (flags.useLint) {
    devDependencies.eslint = '^8.57.0';
    devDependencies['eslint-config-next'] = '^14.2.0';
  }

  if (flags.usePrettier) {
    devDependencies.prettier = '^3.2.0';
    devDependencies['eslint-config-prettier'] = '^9.1.0';
    devDependencies['prettier-plugin-tailwindcss'] = '^0.5.0';
  }

  if (flags.useTests) {
    devDependencies.jest = '^29.7.0';
    devDependencies['@types/jest'] = '^29.5.0';
    devDependencies['@testing-library/react'] = '^15.0.0';
    devDependencies['@testing-library/jest-dom'] = '^6.4.0';
    devDependencies['jest-environment-jsdom'] = '^29.7.0';
  }

  if (flags.usePlaywright) {
    devDependencies['@playwright/test'] = '^1.43.0';
  }

  if (flags.useStorybook) {
    devDependencies['@storybook/react'] = '^8.0.0';
    devDependencies['@storybook/addon-essentials'] = '^8.0.0';
    devDependencies['@storybook/addon-interactions'] = '^8.0.0';
    devDependencies['@storybook/addon-links'] = '^8.0.0';
    devDependencies['@storybook/nextjs'] = '^8.0.0';
    devDependencies.storybook = '^8.0.0';
    if (flags.useTailwind) {
      devDependencies['@storybook/addon-styling-webpack'] = '^1.0.0';
    }
  }

  if (flags.useI18n) {
    dependencies['next-intl'] = '^3.14.0';
  }

  return { dependencies, devDependencies };
}

function resolveScripts(flags) {
  const scripts = {
    dev: 'next dev',
    build: 'next build',
    start: 'next start',
  };

  if (flags.useLint) {
    scripts.lint = 'next lint';
  }

  if (flags.usePrettier) {
    scripts.format = 'prettier --write "src/**/*.{ts,tsx}"';
  }

  if (flags.useTests) {
    scripts.test = 'jest';
    scripts['test:watch'] = 'jest --watch';
    scripts['test:cov'] = 'jest --coverage';
  }

  if (flags.usePlaywright) {
    scripts['test:e2e'] = 'playwright test';
    scripts['test:e2e:ui'] = 'playwright test --ui';
  }

  if (flags.useStorybook) {
    scripts.storybook = 'storybook dev -p 6006';
    scripts['storybook:build'] = 'storybook build';
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
