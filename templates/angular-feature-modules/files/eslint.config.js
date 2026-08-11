import eslint from '@eslint/js';
import prettierConfig from 'eslint-config-prettier';

export default [
  eslint.configs.recommended,
  prettierConfig,
  {
    rules: {
      'no-undef': 'off',
    },
  },
  {
    ignores: ['dist/', '.angular/', 'node_modules/'],
  },
];
