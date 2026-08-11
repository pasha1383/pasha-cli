'use strict';

const nestjs = require('./nestjs');
const express = require('./express');
const fastify = require('./fastify');
const koa = require('./koa');
const serverless = require('./serverless');
const python = require('./python');
const flask = require('./flask');
const go = require('./go');
const goStdlib = require('./go-stdlib');
const chi = require('./chi');
const hapi = require('./hapi');
const springBoot = require('./spring-boot');
const aspnet = require('./aspnet');
const adonis = require('./adonis');
const litestar = require('./litestar');
const tornado = require('./tornado');
const laravel = require('./laravel');
const axum = require('./axum');
const rails = require('./rails');
const html = require('./html');
const react = require('./react');
const nextjs = require('./nextjs');
const svelte = require('./svelte');
const angular = require('./angular');
const astro = require('./astro');
const vue = require('./vue');

const REGISTRY = {
  nestjs,
  express,
  fastify,
  koa,
  serverless,
  python,
  flask,
  go,
  'go-stdlib': goStdlib,
  chi,
  hapi,
  'spring-boot': springBoot,
  aspnet,
  adonis,
  litestar,
  tornado,
  laravel,
  axum,
  rails,
  html,
  nextjs,
  react,
  svelte,
  angular,
  astro,
  vue,
};

// Validates at load time that every module exports the required interface
const REQUIRED_EXPORTS = [
  'ormChoices',
  'databaseChoices',
  'validationChoices',
  'brokerChoices',
  'extraFeatureChoices',
  'deriveFlags',
  'resolveDependencies',
  'resolveScripts',
];

for (const [flavor, mod] of Object.entries(REGISTRY)) {
  for (const key of REQUIRED_EXPORTS) {
    if (typeof mod[key] !== 'function') {
      throw new Error(`Feature module "${flavor}" is missing required export "${key}"`);
    }
  }
}

function resolveFeatures(flavor) {
  const mod = REGISTRY[flavor];
  if (!mod) throw new Error(`Unknown stack flavor "${flavor}" — available: ${Object.keys(REGISTRY).join(', ')}`);
  return mod;
}

module.exports = { resolveFeatures, REGISTRY };
