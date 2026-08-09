'use strict';
const fs = require('fs-extra');
const path = require('path');

const REQUIRED_KEYS = ['name', 'prerequisites', 'fileConditions'];
const ALLOWED_KEYS = [
  'name',
  'prerequisites',
  'shared',
  'stackFeatures',
  'modules',
  'fileConditions',
  'postInstall',
  'gitInit',
];

function validateTemplateConfig(tc, filePath) {
  for (const key of REQUIRED_KEYS) {
    if (!(key in tc)) {
      throw new Error(`${filePath}: missing required key "${key}"`);
    }
  }
  for (const key of Object.keys(tc)) {
    if (!ALLOWED_KEYS.includes(key)) {
      console.warn(`WARN  ${filePath}: unknown key "${key}"`);
    }
  }
  if (tc.fileConditions) {
    for (const [k, v] of Object.entries(tc.fileConditions)) {
      if (typeof v !== 'string' && typeof v !== 'boolean') {
        throw new Error(
          `${filePath}: fileConditions["${k}"] must be string or boolean, got ${typeof v}`
        );
      }
    }
  }
  return tc;
}

async function loadTemplateConfig(dir) {
  const configPath = path.join(dir, 'template.json');
  const tc = await fs.readJson(configPath);
  validateTemplateConfig(tc, configPath);
  return tc;
}

module.exports = { loadTemplateConfig, validateTemplateConfig };
