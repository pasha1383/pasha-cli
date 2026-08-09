'use strict';
const fs = require('fs-extra');
const path = require('path');

const MANIFEST_PATH = path.join(__dirname, '../../../templates/manifest.json');

async function loadManifest() {
  return fs.readJson(MANIFEST_PATH);
}

function getLanguages(manifest) {
  return Object.entries(manifest.languages).map(([value, l]) => ({ name: l.label, value }));
}

function getFrameworks(manifest, langKey) {
  const frameworks = manifest.languages[langKey].frameworks;
  return Object.entries(frameworks).map(([value, f]) => ({ name: f.label, value }));
}

function getArchitectures(manifest, langKey, fwKey) {
  const archs = manifest.languages[langKey].frameworks[fwKey].architectures;
  return Object.entries(archs).map(([value, a]) => ({ name: a.label, value }));
}

function getTemplateDir(manifest, langKey, fwKey, archKey) {
  return manifest.languages[langKey].frameworks[fwKey].architectures[archKey].template;
}

module.exports = { loadManifest, getLanguages, getFrameworks, getArchitectures, getTemplateDir };
