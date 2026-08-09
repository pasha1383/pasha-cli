'use strict';
const fs = require('fs-extra');

async function loadPreset(filePath) {
  const data = await fs.readJson(filePath);
  return data.answers || data;
}

async function savePreset(filePath, ctx) {
  const preset = {
    timestamp: new Date().toISOString(),
    answers: {
      language: ctx.language,
      framework: ctx.framework,
      architecture: ctx.architecture,
      projectName: ctx.projectName,
      author: ctx.author,
      github: ctx.github,
      description: ctx.description,
      orm: ctx.orm,
      database: ctx.database,
      validation: ctx.validation,
      useRedis: Boolean(ctx.useRedis),
      broker: ctx.broker,
      useAgentDocs: ctx.useAgentDocs !== false,
      extras: ctx.extras || [],
      modules: ctx.modules || [],
    },
  };
  await fs.writeJson(filePath, preset, { spaces: 2 });
  return filePath;
}

module.exports = { loadPreset, savePreset };
