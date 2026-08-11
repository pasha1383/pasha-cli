'use strict';

function ormChoices(_framework) {
  return [{ name: 'None (frontend only)', value: 'none' }];
}

function databaseChoices(_orm) {
  return [];
}

function validationChoices() {
  return [{ name: 'None', value: 'none' }];
}

function brokerChoices() {
  return [{ name: 'None', value: 'none' }];
}

function extraFeatureChoices() {
  return [
    { name: 'Tailwind CSS', value: 'tailwind', checked: true },
    { name: 'Naive UI', value: 'naive-ui', checked: false },
    { name: 'PrimeVue', value: 'primevue', checked: false },
    { name: 'ESLint + Prettier', value: 'lint', checked: true },
    { name: 'Vitest (unit tests)', value: 'vitest', checked: true },
    { name: 'Playwright (e2e tests)', value: 'playwright', checked: false },
    { name: 'Storybook', value: 'storybook', checked: false },
    { name: 'GitHub Actions CI', value: 'ci', checked: false },
    { name: 'PWA (vite-plugin-pwa)', value: 'pwa', checked: false },
    { name: 'Dockerfile', value: 'dockerfile', checked: false },
    { name: 'Vue Router', value: 'router', checked: true },
    { name: 'Pinia (state management)', value: 'pinia', checked: true },
    { name: 'VueUse', value: 'vueuse', checked: true },
  ];
}

function deriveFlags(answers) {
  const flags = {
    validation: 'none',
    hasValidation: false,
    useAgentDocs: answers.useAgentDocs !== false,
  };

  const extras = new Set(answers.extras || []);
  flags.useTailwind = extras.has('tailwind');
  flags.useNaiveUi = extras.has('naive-ui');
  flags.usePrimevue = extras.has('primevue');
  flags.hasUiLib = extras.has('naive-ui') || extras.has('primevue');
  flags.useLint = extras.has('lint');
  flags.useVitest = extras.has('vitest');
  flags.usePlaywright = extras.has('playwright');
  flags.useStorybook = extras.has('storybook');
  flags.useCI = extras.has('ci');
  flags.usePwa = extras.has('pwa');
  flags.useAppDockerfile = extras.has('dockerfile');
  flags.useRouter = extras.has('router');
  flags.usePinia = extras.has('pinia');
  flags.useVueuse = extras.has('vueuse');

  return flags;
}

function resolveDependencies(flags) {
  const dependencies = {
    vue: '^3.4.0',
  };

  const devDependencies = {
    '@vitejs/plugin-vue': '^5.1.0',
    vite: '^5.4.0',
    typescript: '^5.5.0',
    'vue-tsc': '^2.0.0',
    '@types/node': '^20.0.0',
  };

  if (flags.useRouter) {
    dependencies['vue-router'] = '^4.4.0';
  }

  if (flags.usePinia) {
    dependencies.pinia = '^2.1.0';
  }

  if (flags.useVueuse) {
    dependencies['@vueuse/core'] = '^10.11.0';
  }

  if (flags.useTailwind) {
    devDependencies.tailwindcss = '^3.4.0';
    devDependencies.postcss = '^8.4.0';
    devDependencies.autoprefixer = '^10.4.0';
  }

  if (flags.useNaiveUi) {
    dependencies['naive-ui'] = '^2.39.0';
  }

  if (flags.usePrimevue) {
    dependencies.primevue = '^4.0.0';
    dependencies['@primevue/themes'] = '^4.0.0';
  }

  if (flags.useLint) {
    devDependencies.eslint = '^8.57.0';
    devDependencies['@typescript-eslint/eslint-plugin'] = '^7.18.0';
    devDependencies['@typescript-eslint/parser'] = '^7.18.0';
    devDependencies['eslint-plugin-vue'] = '^9.27.0';
    devDependencies['eslint-config-prettier'] = '^9.1.0';
    devDependencies['eslint-plugin-prettier'] = '^5.2.1';
    devDependencies.prettier = '^3.3.0';
  }

  if (flags.useVitest) {
    devDependencies.vitest = '^1.6.0';
    devDependencies['@vue/test-utils'] = '^2.4.0';
    devDependencies.jsdom = '^24.0.0';
  }

  if (flags.usePlaywright) {
    devDependencies['@playwright/test'] = '^1.45.0';
  }

  if (flags.useStorybook) {
    devDependencies.storybook = '^8.2.0';
    devDependencies['@storybook/vue3'] = '^8.2.0';
    devDependencies['@storybook/vue3-vite'] = '^8.2.0';
    devDependencies['@storybook/addon-essentials'] = '^8.2.0';
    devDependencies['@storybook/addon-interactions'] = '^8.2.0';
    devDependencies['@storybook/addon-links'] = '^8.2.0';
    devDependencies['@storybook/test'] = '^8.2.0';
  }

  if (flags.usePwa) {
    devDependencies['vite-plugin-pwa'] = '^0.20.0';
  }

  return { dependencies, devDependencies };
}

function resolveScripts(flags) {
  const scripts = {
    dev: 'vite',
    build: 'vue-tsc -b && vite build',
    preview: 'vite preview',
  };

  if (flags.useLint) {
    scripts.lint = 'eslint . --ext .vue,.ts --fix';
    scripts.format = 'prettier --write "src/**/*.{vue,ts,css}"';
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
