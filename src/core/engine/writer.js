'use strict';
const fs = require('fs-extra');
const path = require('path');
const os = require('os');

async function writeFiles(files, concurrency = 8) {
  let i = 0;
  const results = [];

  async function worker() {
    while (i < files.length) {
      const idx = i++;
      const { destPath, content } = files[idx];
      const dir = path.dirname(destPath);
      await fs.ensureDir(dir);
      await fs.writeFile(destPath, content, 'utf8');
      results[idx] = destPath;
    }
  }

  const workers = [];
  for (let w = 0; w < Math.min(concurrency, files.length); w++) {
    workers.push(worker());
  }
  await Promise.all(workers);
  return results;
}

async function atomicDir(tmpDir, finalDir) {
  const basename = path.basename(finalDir);
  if (await fs.pathExists(finalDir)) {
    const err = new Error(`Directory "${basename}" already exists.`);
    err.code = 'EEXIST';
    throw err;
  }
  await fs.move(tmpDir, finalDir, { overwrite: false });
}

module.exports = { writeFiles, atomicDir };
