'use strict';
const path = require('path');
const fs = require('fs-extra');
const { renderTemplateDir, renderModuleFiles } = require('../src/core/engine/renderer');
const { makeIncludeCheck } = require('../src/core/engine/conditions');
const { resolveRecipe } = require('../src/core/engine/layers');

const TEMPLATES_ROOT = path.join(__dirname, '..', 'templates');
const OLD_SHARED = path.join(TEMPLATES_ROOT, '_shared/nestjs/files');
const OLD_TEMPLATE = path.join(TEMPLATES_ROOT, 'node-nestjs-layered/files');
const OLD_MODULE_FILES = path.join(TEMPLATES_ROOT, 'node-nestjs-layered/moduleFiles');

const ctx = {
  projectName: 'test-project',
  author: 'Test Author',
  github: 'testuser',
  description: 'Test project',
  moduleName: 'product',
  ormPrisma: true,
  useSwagger: true,
  useLint: true,
  useTests: true,
  useCI: true,
  useDocker: true,
  useAuth: true,
  useHealthCheck: true,
  useRedis: true,
  useKafka: true,
  useRabbitmq: true,
  useAppDockerfile: true,
  useAgentDocs: true,
  hasOrm: true,
  hasSharedInfra: true,
  hasBroker: true,
  hasValidation: true,
  useClassValidator: true,
  useZod: false,
  ormTypeorm: false,
  ormMongoose: false,
};

async function renderOld(tmpDir) {
  await fs.ensureDir(tmpDir);
  const tc = await fs.readJson(path.join(TEMPLATES_ROOT, 'node-nestjs-layered', 'template.json'));
  const shouldInclude = makeIncludeCheck(tc.fileConditions, ctx);
  await renderTemplateDir(OLD_SHARED, tmpDir, ctx, shouldInclude);
  await renderTemplateDir(OLD_TEMPLATE, tmpDir, ctx, shouldInclude);
  if (await fs.pathExists(OLD_MODULE_FILES)) {
    await renderModuleFiles(OLD_MODULE_FILES, tmpDir, ctx, ['product'], shouldInclude);
  }
}

async function renderNew(tmpDir) {
  await fs.ensureDir(tmpDir);
  const { layers, recipe, merged } = await resolveRecipe('node-nestjs-layered');
  const shouldInclude = makeIncludeCheck(merged.fileConditions, ctx);
  for (const layer of layers) {
    if (layer.filesDir) {
      await renderTemplateDir(layer.filesDir, tmpDir, ctx, shouldInclude);
    }
    if (layer.moduleFilesDir) {
      await renderModuleFiles(layer.moduleFilesDir, tmpDir, ctx, ['product'], shouldInclude);
    }
  }
}

async function collectFiles(dir, prefix = '') {
  const files = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const rel = path.join(prefix, e.name);
    if (e.isDirectory()) {
      const sub = await collectFiles(path.join(dir, e.name), rel);
      files.push(...sub);
    } else {
      files.push(rel);
    }
  }
  return files;
}

async function main() {
  const tmpOld = await fs.mkdtemp('/tmp/pasha-verify-old-');
  const tmpNew = await fs.mkdtemp('/tmp/pasha-verify-new-');

  try {
    await renderOld(tmpOld);
    await renderNew(tmpNew);

    const oldFiles = (await collectFiles(tmpOld)).sort();
    const newFiles = (await collectFiles(tmpNew)).sort();

    console.log(`Old rendered files: ${oldFiles.length}`);
    console.log(`New rendered files: ${newFiles.length}`);
    console.log('');

    const oldSet = new Set(oldFiles);
    const newSet = new Set(newFiles);

    const onlyOld = oldFiles.filter(f => !newSet.has(f));
    const onlyNew = newFiles.filter(f => !oldSet.has(f));

    if (onlyOld.length > 0) {
      console.log('Files ONLY in old rendering:');
      onlyOld.forEach(f => console.log(`  < ${f}`));
      console.log('');
    }
    if (onlyNew.length > 0) {
      console.log('Files ONLY in new rendering:');
      onlyNew.forEach(f => console.log(`  > ${f}`));
      console.log('');
    }

    if (onlyOld.length === 0 && onlyNew.length === 0) {
      console.log('File lists match exactly.');

      let contentMismatches = 0;
      for (const f of oldFiles) {
        const oldContent = await fs.readFile(path.join(tmpOld, f));
        const newContent = await fs.readFile(path.join(tmpNew, f));
        if (!oldContent.equals(newContent)) {
          contentMismatches++;
          console.log(`Content differs for: ${f}`);
        }
      }
      if (contentMismatches === 0) {
        console.log('All file contents match exactly.');
      } else {
        console.log(`${contentMismatches} files have different content.`);
        process.exit(1);
      }
    } else {
      process.exit(1);
    }
  } finally {
    await fs.remove(tmpOld);
    await fs.remove(tmpNew);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
