'use strict';
const Handlebars = require('handlebars');
const { pascalCase, camelCase, constantCase, snakeCase } = require('../../utils/strings');

Handlebars.registerHelper('pascalCase', (str) => pascalCase(str));
Handlebars.registerHelper('camelCase', (str) => camelCase(str));
Handlebars.registerHelper('constantCase', (str) => constantCase(str));
Handlebars.registerHelper('snakeCase', (str) =>
  snakeCase(String(str).split(/[-\s]+/).join('_').toLowerCase())
);

Handlebars.registerHelper('eq', function eq(a, b, options) {
  return a === b ? options.fn(this) : options.inverse(this);
});

Handlebars.registerHelper('shellDefault', (varName, fallback) =>
  '${' + varName + ':-' + fallback + '}'
);

module.exports = {};
