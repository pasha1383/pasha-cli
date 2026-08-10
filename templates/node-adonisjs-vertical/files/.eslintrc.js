module.exports = {
  extends: [
    '@adonisjs/eslint-config/app',
    'prettier',
  ],
  plugins: ['prettier'],
  rules: {
    'prettier/prettier': 'error',
  },
};
