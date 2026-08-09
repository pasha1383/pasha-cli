'use strict';

const nestjs = require('./nestjs');
const express = require('./express');
const fastify = require('./fastify');
const python = require('./python');
const go = require('./go');

const REGISTRY = {
  nestjs,
  express,
  fastify,
  python,
  go,
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
