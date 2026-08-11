'use strict';

/**
 * Shared feature module for frontend frameworks (React, Vue, Svelte, etc.).
 *
 * Frontend frameworks don't use ORM/database/broker/Redis. The CLI skips
 * those questions when it detects a frontend stack flavor. This module
 * provides the required interface with trivial implementations for those.
 */

const FRAMEWORK_DEPS = {
  nextjs: {
    dependencies: { next: '^14.0.0', react: '^18.0.0', 'react-dom': '^18.0.0' },
    devDependencies: { '@types/react': '^18.0.0', '@types/react-dom': '^18.0.0' },
  },
  react: {
    dependencies: { react: '^18.0.0', 'react-dom': '^18.0.0' },
    devDependencies: { '@vitejs/plugin-react': '^4.0.0', '@types/react': '^18.0.0', '@types/react-dom': '^18.0.0' },
  },
  vue: {
    dependencies: { vue: '^3.4.0' },
    devDependencies: { '@vitejs/plugin-vue': '^5.0.0' },
  },
  svelte: {
    devDependencies: { '@sveltejs/vite-plugin-svelte': '^3.0.0', svelte: '^4.0.0' },
  },
  angular: {
    dependencies: { '@angular/core': '^17.0.0', '@angular/platform-browser-dynamic': '^17.0.0' },
    devDependencies: { '@angular/cli': '^17.0.0' },
  },
  astro: {
    dependencies: { astro: '^4.0.0' },
  },
  html: {
    dependencies: {},
    devDependencies: {},
  },
};

const CSS_DEPS = {
  tailwind: { devDependencies: { tailwindcss: '^3.4.0', postcss: '^8.4.0', autoprefixer: '^10.4.0' } },
  bootstrap: { dependencies: { bootstrap: '^5.3.0' } },
  'material-ui': { dependencies: { '@mui/material': '^5.15.0', '@emotion/react': '^11.11.0', '@emotion/styled': '^11.11.0' } },
  'chakra-ui': { dependencies: { '@chakra-ui/react': '^2.8.0', '@emotion/react': '^11.11.0', '@emotion/styled': '^11.11.0', 'framer-motion': '^10.0.0' } },
};

const STATE_DEPS = {
  redux: { dependencies: { '@reduxjs/toolkit': '^2.0.0', 'react-redux': '^9.0.0' } },
  zustand: { dependencies: { zustand: '^4.4.0' } },
  pinia: { dependencies: { pinia: '^2.1.0' } },
  jotai: { dependencies: { jotai: '^2.6.0' } },
};

const ROUTING_DEPS = {
  'react-router': { dependencies: { 'react-router-dom': '^6.21.0' } },
  'vue-router': { dependencies: { 'vue-router': '^4.2.0' } },
  tanstack: { dependencies: { '@tanstack/react-router': '^1.0.0' } },
};

const FRONTEND_TEST_DEPS = {
  devDependencies: {
    vitest: '^1.2.0',
    'jsdom': '^24.0.0',
    '@testing-library/react': '^14.0.0',
    '@testing-library/jest-dom': '^6.0.0',
    '@testing-library/user-event': '^14.0.0',
  },
};

function ormChoices(_framework) {
  return [{ name: 'None', value: 'none' }];
}

function databaseChoices(_orm) {
  return [];
}

function brokerChoices() {
  return [{ name: 'None', value: 'none' }];
}

function validationChoices() {
  return [
    { name: 'Zod', value: 'zod' },
    { name: 'None', value: 'none' },
  ];
}

function extraFeatureChoices() {
  return [
    { name: 'Tailwind CSS', value: 'css-tailwind', checked: true },
    { name: 'Bootstrap', value: 'css-bootstrap', checked: false },
    { name: 'Material UI', value: 'css-material-ui', checked: false },
    { name: 'Chakra UI', value: 'css-chakra-ui', checked: false },
    { name: 'React Router', value: 'routing-react-router', checked: false },
    { name: 'Redux Toolkit', value: 'state-redux', checked: false },
    { name: 'Zustand', value: 'state-zustand', checked: false },
    { name: 'Testing (Vitest + Testing Library)', value: 'tests', checked: true },
    { name: 'ESLint + Prettier', value: 'lint', checked: true },
    { name: 'AGENT.md', value: 'agent-docs', checked: true },
  ];
}

function deriveFlags(answers) {
  const extras = new Set(answers.extras || []);

  return {
    orm: 'none',
    database: 'none',
    validation: answers.validation || 'none',
    broker: 'none',
    ormNone: true,
    hasOrm: false,
    hasDatabase: false,
    dbNeedsServer: false,
    dbPort: null,
    useZod: answers.validation === 'zod',
    hasValidation: answers.validation !== 'none',
    useRedis: false,
    hasBroker: false,
    useAgentDocs: answers.useAgentDocs !== false,

    useTests: extras.has('tests'),
    useLint: extras.has('lint'),

    cssTailwind: extras.has('css-tailwind'),
    cssBootstrap: extras.has('css-bootstrap'),
    cssMaterialUI: extras.has('css-material-ui'),
    cssChakraUI: extras.has('css-chakra-ui'),

    useRouting: extras.has('routing-react-router'),

    stateRedux: extras.has('state-redux'),
    stateZustand: extras.has('state-zustand'),
    useStateMgmt: extras.has('state-redux') || extras.has('state-zustand'),

    _frontendFlavor: answers._frontendFlavor || 'react',
  };
}

function resolveDependencies(flags) {
  const flavor = flags._frontendFlavor || 'react';
  const frameworkInfo = FRAMEWORK_DEPS[flavor] || FRAMEWORK_DEPS.react;

  const dependencies = Object.assign({}, frameworkInfo.dependencies || {});

  const devDependencies = Object.assign(
    {
      vite: '^5.1.0',
      typescript: '^5.4.0',
      '@types/node': '^20.0.0',
    },
    frameworkInfo.devDependencies || {},
  );

  if (flags.cssTailwind) {
    Object.assign(devDependencies, CSS_DEPS.tailwind.devDependencies);
  }
  if (flags.cssBootstrap) {
    Object.assign(dependencies, CSS_DEPS.bootstrap.dependencies);
  }
  if (flags.cssMaterialUI) {
    Object.assign(dependencies, CSS_DEPS['material-ui'].dependencies);
  }
  if (flags.cssChakraUI) {
    Object.assign(dependencies, CSS_DEPS['chakra-ui'].dependencies);
  }

  if (flags.useStateMgmt) {
    if (flags.stateRedux) Object.assign(dependencies, STATE_DEPS.redux.dependencies);
    if (flags.stateZustand) Object.assign(dependencies, STATE_DEPS.zustand.dependencies);
  }

  if (flags.useRouting) {
    Object.assign(dependencies, ROUTING_DEPS['react-router'].dependencies);
  }

  if (flags.useTests) {
    Object.assign(devDependencies, FRONTEND_TEST_DEPS.devDependencies);
  }

  if (flags.useLint) {
    devDependencies.eslint = '^8.57.0';
    devDependencies['eslint-plugin-react-hooks'] = '^4.6.0';
    devDependencies['eslint-plugin-react-refresh'] = '^0.4.0';
    devDependencies.prettier = '^3.2.5';
  }

  return { dependencies, devDependencies };
}

function resolveScripts(flags) {
  const scripts = {
    dev: 'vite',
    build: 'tsc && vite build',
    preview: 'vite preview',
  };

  if (flags.useTests) {
    scripts.test = 'vitest';
    scripts['test:ui'] = 'vitest --ui';
  }

  if (flags.useLint) {
    scripts.lint = 'eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0';
    scripts.format = 'prettier --write "src/**/*.{ts,tsx,css}"';
  }

  return scripts;
}

module.exports = {
  ormChoices,
  databaseChoices,
  brokerChoices,
  validationChoices,
  extraFeatureChoices,
  deriveFlags,
  resolveDependencies,
  resolveScripts,
};
