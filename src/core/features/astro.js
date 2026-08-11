'use strict';

function ormChoices(_framework) {
  return [
    { name: 'None — not applicable', value: 'none' },
  ];
}

function databaseChoices(_orm) {
  return [];
}

function brokerChoices() {
  return [
    { name: 'None', value: 'none' },
  ];
}

function validationChoices() {
  return [
    { name: 'Zod', value: 'zod' },
    { name: 'None', value: 'none' },
  ];
}

function extraFeatureChoices() {
  return [
    { name: 'Tailwind CSS', value: 'tailwind', checked: true },
    { name: 'MDX support', value: 'mdx', checked: false },
    { name: 'ESLint + Prettier', value: 'lint', checked: true },
    { name: 'Vitest test scaffold', value: 'tests', checked: true },
    { name: 'Playwright E2E tests', value: 'e2e', checked: false },
    { name: 'GitHub Actions CI', value: 'ci', checked: false },
    { name: 'Dockerfile (multi-stage)', value: 'dockerfile', checked: false },
  ];
}

function deriveFlags(answers) {
  const orm = answers.orm || 'none';
  const database = answers.database || 'none';
  const validation = answers.validation || 'none';
  const broker = answers.broker || 'none';

  const flags = {
    orm,
    database,
    validation,
    broker,

    ormNone: true,
    hasOrm: false,
    hasDatabase: false,
    dbNeedsServer: false,
    dbPort: null,

    useZod: validation === 'zod',
    hasValidation: validation !== 'none',

    useRedis: false,
    hasBroker: false,

    useAgentDocs: answers.useAgentDocs !== false,
  };

  const extras = new Set(answers.extras || []);
  flags.useTailwind = extras.has('tailwind');
  flags.useMdx = extras.has('mdx');
  flags.useLint = extras.has('lint');
  flags.useTests = extras.has('tests');
  flags.useE2E = extras.has('e2e');
  flags.useCI = extras.has('ci');
  flags.useAppDockerfile = extras.has('dockerfile');
  flags.useSwagger = false;
  flags.useAuth = false;
  flags.useHealthCheck = false;
  flags.useRateLimit = false;

  flags.useDocker = false;
  flags.hasSharedInfra = false;

  return flags;
}

function resolveDependencies(flags) {
  const dependencies = {
    astro: '^5.0.0',
  };

  const devDependencies = {};

  if (flags.useZod) {
    dependencies.zod = '^3.23.8';
  }

  if (flags.useTailwind) {
    devDependencies['@astrojs/tailwind'] = '^5.0.0';
  }

  if (flags.useMdx) {
    devDependencies['@astrojs/mdx'] = '^4.0.0';
  }

  if (flags.useLint) {
    devDependencies.eslint = '^9.0.0';
    devDependencies['@eslint/js'] = '^9.0.0';
    devDependencies['eslint-config-prettier'] = '^10.0.0';
    devDependencies['eslint-plugin-prettier'] = '^5.1.3';
    devDependencies['eslint-plugin-astro'] = '^1.0.0';
    devDependencies['typescript-eslint'] = '^8.0.0';
    devDependencies.prettier = '^3.4.0';
  }

  devDependencies['@astrojs/svelte'] = '^7.0.0';
  devDependencies.svelte = '^5.0.0';

  if (flags.useTests) {
    devDependencies.vitest = '^3.0.0';
    devDependencies['@testing-library/jest-dom'] = '^6.0.0';
    devDependencies['jsdom'] = '^25.0.0';
  }

  if (flags.useE2E) {
    devDependencies['@playwright/test'] = '^1.50.0';
  }

  return { dependencies, devDependencies };
}

function resolveScripts(flags) {
  const scripts = {
    dev: 'astro dev',
    build: 'astro build',
    preview: 'astro preview',
    start: 'astro dev',
  };

  if (flags.useLint) {
    scripts.lint = 'eslint "src/**/*.{astro,ts,tsx}" --fix';
    scripts.format = 'prettier --write "src/**/*.{astro,ts,tsx,css}"';
  }

  if (flags.useTests) {
    scripts.test = 'vitest run';
    scripts['test:watch'] = 'vitest';
    scripts['test:cov'] = 'vitest run --coverage';
  }

  if (flags.useE2E) {
    scripts['test:e2e'] = 'playwright test';
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
