'use strict';
const fs = require('fs-extra');
const path = require('path');
const os = require('os');

const HISTORY_DIR = path.join(os.homedir(), '.pasha-cli', 'sessions');

let dirReady = false;

function ensureDirSync() {
  if (!dirReady) {
    fs.ensureDirSync(HISTORY_DIR);
    dirReady = true;
  }
}

async function ensureDir() {
  if (!dirReady) {
    await fs.ensureDir(HISTORY_DIR);
    dirReady = true;
  }
}

function toSafe(str) {
  return String(str || '').replace(/[:.]/g, '-');
}

function reconstructExtras(ctx) {
  if (Array.isArray(ctx.extras)) return [...ctx.extras];
  const extras = [];
  if (ctx.useSwagger) extras.push('swagger');
  if (ctx.useLint) extras.push('lint');
  if (ctx.useTests) extras.push('tests');
  if (ctx.useCI) extras.push('ci');
  if (ctx.useAuth) extras.push('auth');
  if (ctx.useHealthCheck) extras.push('health');
  if (ctx.useAppDockerfile) extras.push('dockerfile');
  if (ctx.useRateLimit) extras.push('rateLimit');
  return extras;
}

function buildSession(ctx) {
  const now = new Date().toISOString();

  return {
    timestamp: now,
    projectName: ctx.projectName || '',
    language: ctx.language || '',
    framework: ctx.framework || '',
    architecture: ctx.architecture || ctx.architectureLabel || '',
    answers: {
      projectName: ctx.projectName || '',
      author: ctx.author || '',
      github: ctx.github || '',
      description: ctx.description || '',
      orm: ctx.orm || '',
      database: ctx.database || '',
      validation: ctx.validation || '',
      useRedis: Boolean(ctx.useRedis),
      broker: ctx.broker || '',
      useAgentDocs: ctx.useAgentDocs !== false,
      extras: reconstructExtras(ctx),
      modules: Array.isArray(ctx.modules) ? ctx.modules : [],
      architectureLabel: ctx.architectureLabel || '',
    },
  };
}

function sessionFilename(session) {
  const ts = toSafe(session.timestamp);
  const name = (session.projectName || 'unnamed').replace(/[^a-z0-9-]/gi, '-').replace(/-+/g, '-');
  return `${ts}-${name}.json`;
}

async function saveSession(ctx) {
  try {
    await ensureDir();
    const session = buildSession(ctx);
    const filePath = path.join(HISTORY_DIR, sessionFilename(session));
    await fs.writeJson(filePath, session, { spaces: 2 });
    return filePath;
  } catch {
    return null;
  }
}

async function loadSession(timestamp) {
  try {
    await ensureDir();
    const files = await fs.readdir(HISTORY_DIR);
    const safeTs = toSafe(timestamp);
    const match = files.find((f) => f.startsWith(safeTs));
    if (!match) return null;
    return await fs.readJson(path.join(HISTORY_DIR, match));
  } catch {
    return null;
  }
}

async function listSessions(limit = 10) {
  try {
    await ensureDir();
    const files = await fs.readdir(HISTORY_DIR);
    const sessions = [];
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      try {
        const session = await fs.readJson(path.join(HISTORY_DIR, file));
        sessions.push({
          timestamp: session.timestamp,
          projectName: session.projectName,
          framework: session.framework,
          architecture: session.architecture,
          path: path.join(HISTORY_DIR, file),
        });
      } catch {
        // skip unreadable files
      }
    }
    sessions.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    return sessions.slice(0, limit);
  } catch {
    return [];
  }
}

function sessionToAnswers(session) {
  if (!session || !session.answers) return {};
  return Object.assign({}, session.answers, {
    projectName: session.projectName || session.answers.projectName,
    language: session.language,
    framework: session.framework,
    architecture: session.architecture,
  });
}

async function lastSession() {
  const sessions = await listSessions(1);
  if (sessions.length === 0) return null;
  try {
    return await fs.readJson(sessions[0].path);
  } catch {
    return null;
  }
}

module.exports = {
  HISTORY_DIR,
  saveSession,
  loadSession,
  listSessions,
  sessionToAnswers,
  lastSession,
};
