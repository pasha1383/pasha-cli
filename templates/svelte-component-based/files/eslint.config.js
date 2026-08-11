import js from '@eslint/js';
import sveltePlugin from 'eslint-plugin-svelte';
import prettierConfig from 'eslint-config-prettier';

export default [
  js.configs.recommended,
  ...sveltePlugin.configs['flat/recommended'],
  prettierConfig,
  {
    rules: {
      'no-undef': 'off',
    },
  },
  {
    files: ['**/*.svelte'],
    languageOptions: {
      parserOptions: {
        parser: '@typescript-eslint/parser',
      },
    },
  },
  {
    ignores: ['dist/', '.svelte-kit/', 'node_modules/'],
  },
];
