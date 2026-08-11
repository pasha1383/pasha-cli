'use strict';

function ormChoices(_framework) {
  return [
    { name: 'None — HTML is frontend-only', value: 'none' },
  ];
}

function databaseChoices(_orm) {
  return [];
}

function validationChoices() {
  return [
    { name: 'None', value: 'none' },
  ];
}

function brokerChoices() {
  return [
    { name: 'None', value: 'none' },
  ];
}

function extraFeatureChoices() {
  return [
    { name: 'Tailwind CSS (via CDN)', value: 'tailwind', checked: false },
    { name: 'Bootstrap 5 (via CDN)', value: 'bootstrap', checked: false },
    { name: 'CSS Modules (Vite)', value: 'cssmodules', checked: false },
    { name: 'Sass / SCSS', value: 'sass', checked: false },
    { name: 'ESLint + Prettier', value: 'lint', checked: true },
    { name: 'Jest test scaffold', value: 'tests', checked: false },
    { name: 'Playwright E2E tests', value: 'playwright', checked: false },
    { name: 'Dockerfile (nginx)', value: 'dockerfile', checked: false },
  ];
}

function deriveFlags(answers) {
  const flags = {
    orm: 'none',
    database: 'none',
    validation: 'none',
    broker: 'none',
    hasOrm: false,
    hasDatabase: false,
    hasValidation: false,
    useRedis: false,
    hasBroker: false,

    useAgentDocs: answers.useAgentDocs !== false,
  };

  const extras = new Set(answers.extras || []);
  flags.useTailwind = extras.has('tailwind');
  flags.useBootstrap = extras.has('bootstrap');
  flags.useCssModules = extras.has('cssmodules');
  flags.useSass = extras.has('sass');
  flags.useLint = extras.has('lint');
  flags.useTests = extras.has('tests');
  flags.usePlaywright = extras.has('playwright');
  flags.useAppDockerfile = extras.has('dockerfile');

  flags.useDocker = flags.useAppDockerfile;
  flags.useJsx = false;
  flags.useFramework = false;

  return flags;
}

function resolveDependencies(flags) {
  const devDependencies = {
    vite: '^5.4.0',
  };

  if (flags.useSass) {
    devDependencies.sass = '^1.77.0';
  }

  if (flags.useLint) {
    devDependencies.eslint = '^8.57.0';
    devDependencies['@eslint/js'] = '^9.0.0';
    devDependencies['eslint-config-prettier'] = '^9.1.0';
    devDependencies.prettier = '^3.2.5';
  }

  if (flags.useTests) {
    devDependencies.jest = '^29.7.0';
    devDependencies['jest-environment-jsdom'] = '^29.7.0';
    devDependencies['@jest/globals'] = '^29.7.0';
  }

  if (flags.usePlaywright) {
    devDependencies['@playwright/test'] = '^1.44.0';
  }

  return { dependencies: {}, devDependencies };
}

function resolveScripts(flags) {
  const scripts = {
    dev: 'vite',
    build: 'vite build',
    preview: 'vite preview',
  };

  if (flags.useLint) {
    scripts.lint = 'eslint . --fix';
    scripts.format = 'prettier --write "**/*.{html,css,js,json}"';
  }

  if (flags.useTests) {
    scripts.test = 'jest';
    scripts['test:watch'] = 'jest --watch';
    scripts['test:cov'] = 'jest --coverage';
  }

  if (flags.usePlaywright) {
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
