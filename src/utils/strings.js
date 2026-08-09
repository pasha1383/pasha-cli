'use strict';

function pascalCase(str) {
  return String(str)
    .split(/[-_\s]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');
}

function camelCase(str) {
  const p = pascalCase(str);
  return p.charAt(0).toLowerCase() + p.slice(1);
}

function constantCase(str) {
  return String(str)
    .split(/[-_\s]+/)
    .join('_')
    .toUpperCase();
}

function snakeCase(str) {
  return String(str)
    .split(/[-\s]+/)
    .join('_')
    .toLowerCase();
}

function kebabCase(str) {
  return String(str)
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .replace(/[_\s]+/g, '-')
    .toLowerCase();
}

module.exports = { pascalCase, camelCase, constantCase, snakeCase, kebabCase };
