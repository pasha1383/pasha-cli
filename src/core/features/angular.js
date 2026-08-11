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
    { name: 'Tailwind CSS', value: 'tailwind', checked: false },
    { name: 'Angular Material', value: 'material', checked: false },
    { name: 'ESLint + Prettier', value: 'lint', checked: true },
    { name: 'Jest test scaffold', value: 'tests', checked: true },
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
  flags.useMaterial = extras.has('material');
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
    '@angular/core': '^20.0.0',
    '@angular/common': '^20.0.0',
    '@angular/compiler': '^20.0.0',
    '@angular/platform-browser': '^20.0.0',
    '@angular/platform-browser-dynamic': '^20.0.0',
    '@angular/router': '^20.0.0',
    '@angular/forms': '^20.0.0',
    rxjs: '~7.8.0',
    tslib: '^2.6.0',
    zone: '^0.15.0',
    '@ngrx/store': '^20.0.0',
    '@ngrx/effects': '^20.0.0',
  };

  const devDependencies = {
    '@angular-devkit/build-angular': '^20.0.0',
    '@angular/cli': '^20.0.0',
    '@angular/compiler-cli': '^20.0.0',
    '@ngrx/store-devtools': '^20.0.0',
    typescript: '~5.8.0',
  };

  if (flags.useZod) {
    dependencies.zod = '^3.23.8';
  }

  if (flags.useMaterial) {
    dependencies['@angular/material'] = '^20.0.0';
    dependencies['@angular/cdk'] = '^20.0.0';
  }

  if (flags.useTailwind) {
    devDependencies.tailwindcss = '^4.0.0';
    devDependencies['@tailwindcss/postcss'] = '^4.0.0';
  }

  if (flags.useLint) {
    devDependencies.eslint = '^9.0.0';
    devDependencies['angular-eslint'] = '^20.0.0';
    devDependencies['@angular-eslint/eslint-plugin'] = '^20.0.0';
    devDependencies['@angular-eslint/eslint-plugin-template'] = '^20.0.0';
    devDependencies['@angular-eslint/template-parser'] = '^20.0.0';
    devDependencies['eslint-config-prettier'] = '^10.0.0';
    devDependencies.prettier = '^3.4.0';
  }

  if (flags.useTests) {
    devDependencies.jest = '^29.7.0';
    devDependencies['@types/jest'] = '^29.5.12';
    devDependencies['jest-preset-angular'] = '^14.1.0';
    devDependencies['@angular-builders/jest'] = '^20.0.0';
  }

  if (flags.useE2E) {
    devDependencies['@playwright/test'] = '^1.50.0';
  }

  return { dependencies, devDependencies };
}

function resolveScripts(flags) {
  const scripts = {
    start: 'ng serve',
    build: 'ng build',
    watch: 'ng build --watch --configuration development',
  };

  if (flags.useLint) {
    scripts.lint = 'ng lint';
    scripts.format = 'prettier --write "src/**/*.{ts,html,scss,css}"';
  }

  if (flags.useTests) {
    scripts.test = 'ng test';
    scripts['test:ci'] = 'ng test --no-watch --browsers=ChromeHeadlessCI';
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
