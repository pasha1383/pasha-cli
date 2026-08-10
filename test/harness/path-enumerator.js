'use strict';

const fs = require('fs-extra');
const path = require('path');

const MANIFEST_PATH = path.join(__dirname, '../../templates/manifest.json');
const TEMPLATES_ROOT = path.join(__dirname, '../../templates');

async function loadManifest() {
  return fs.readJson(MANIFEST_PATH);
}

function getLanguages(manifest) {
  return Object.keys(manifest.languages);
}

function getFrameworks(manifest, lang) {
  return Object.keys(manifest.languages[lang].frameworks);
}

function getArchitectures(manifest, lang, fw) {
  return Object.keys(manifest.languages[lang].frameworks[fw].architectures);
}

function getTemplateDir(manifest, lang, fw, arch) {
  return manifest.languages[lang].frameworks[fw].architectures[arch].template;
}

async function buildPath(manifest, lang, fw, arch) {
  try {
    const templateDir = getTemplateDir(manifest, lang, fw, arch);
    const tc = await fs.readJson(path.join(TEMPLATES_ROOT, templateDir, 'template.json'));
    const stackFlavor = tc.stackFeatures || null;

    const { REGISTRY } = require('../../src/core/features/index');
    const mod = stackFlavor ? REGISTRY[stackFlavor] : null;

    const orms = mod ? mod.ormChoices(fw).map(c => c.value) : ['none'];
    const firstOrm = orms[0];
    const dbs = firstOrm !== 'none' && mod ? mod.databaseChoices(firstOrm).map(c => c.value) : ['none'];
    const firstDb = dbs[0] || 'none';
    const validations = mod ? mod.validationChoices().map(c => c.value) : ['none'];
    const firstValidation = validations[0];
    const brokers = mod ? mod.brokerChoices().map(c => c.value) : ['none'];
    const firstBroker = brokers[0];
    const defaultModule = tc.modules && tc.modules.enabled ? [tc.modules.default || 'product'] : [];

    return {
      id: [lang, fw, arch, firstOrm, firstDb].join('-'),
      language: lang,
      framework: fw,
      architecture: arch,
      orm: firstOrm,
      database: firstDb,
      validation: firstValidation,
      useRedis: false,
      broker: firstBroker,
      useAgentDocs: true,
      extras: [],
      modules: defaultModule,
      projectName: 'pasha-t-' + lang + '-' + fw + '-' + arch,
      author: 'Walker Test',
      description: 'Walker smoke test',
      github: 'walkertest',
    };
  } catch (err) {
    return null;
  }
}

async function enumerateSmoke() {
  const manifest = await loadManifest();
  const langs = getLanguages(manifest);
  const paths = [];

  for (const lang of langs) {
    const fws = getFrameworks(manifest, lang);
    for (const fw of fws) {
      const archs = getArchitectures(manifest, lang, fw);
      for (const arch of archs) {
        const p = await buildPath(manifest, lang, fw, arch);
        if (p) paths.push(p);
      }
    }
  }

  return paths;
}

async function enumerateFull() {
  return enumerateSmoke();
}

function pathToCliArgs(p) {
  const args = [
    'create', '--yes',
    '--language', p.language,
    '--framework', p.framework,
    '--architecture', p.architecture,
    '--orm', p.orm,
    '--database', p.database,
    '--validation', p.validation,
    '--broker', p.broker,
    '--skip-install',
    '--skip-git',
  ];

  if (p.useRedis) args.push('--redis');
  else args.push('--no-redis');

  if (p.useAgentDocs) args.push('--agent-docs');
  else args.push('--no-agent-docs');

  args.push('--extras', (p.extras || []).join(','));

  if (p.modules.length > 0) {
    args.push('--modules', p.modules.join(','));
  }

  return args;
}

module.exports = {
  enumerateSmoke,
  enumerateFull,
  pathToCliArgs,
  getLanguages,
  getFrameworks,
  getArchitectures,
  getTemplateDir,
  loadManifest,
};
