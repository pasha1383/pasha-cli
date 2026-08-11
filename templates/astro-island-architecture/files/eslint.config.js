import eslint from '@eslint/js';
import astroPlugin from 'eslint-plugin-astro';
import prettierConfig from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

export default [
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...astroPlugin.configs.recommended,
  prettierConfig,
  { ignores: ['dist/', '.astro/', 'node_modules/'] },
];
