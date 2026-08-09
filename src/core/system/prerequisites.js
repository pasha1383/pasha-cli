'use strict';
const fs = require('fs');
const path = require('path');
const { run } = require('./exec');
const os = require('os');

const PLATFORM = os.platform();
const SUPPORTED_PLATFORMS = ['darwin', 'linux'];

const CHECK_CMDS = {
  node: 'node',
  npm: 'npm',
  git: 'git',
  python3: 'python3',
  pip3: 'pip3',
  go: 'go',
  java: 'java',
};

const INSTALL_MAP = {
  brew: {
    node: ['brew', 'install', 'node'],
    git: ['brew', 'install', 'git'],
    python3: ['brew', 'install', 'python3'],
    go: ['brew', 'install', 'go'],
    java: ['brew', 'install', 'openjdk'],
  },
  'apt-get': {
    node: ['sudo', 'apt-get', 'install', '-y', 'nodejs', 'npm'],
    git: ['sudo', 'apt-get', 'install', '-y', 'git'],
    python3: ['sudo', 'apt-get', 'install', '-y', 'python3', 'python3-pip'],
    go: ['sudo', 'apt-get', 'install', '-y', 'golang-go'],
    java: ['sudo', 'apt-get', 'install', '-y', 'default-jdk'],
  },
  dnf: {
    node: ['sudo', 'dnf', 'install', '-y', 'nodejs', 'npm'],
    git: ['sudo', 'dnf', 'install', '-y', 'git'],
    python3: ['sudo', 'dnf', 'install', '-y', 'python3', 'python3-pip'],
    go: ['sudo', 'dnf', 'install', '-y', 'golang'],
    java: ['sudo', 'dnf', 'install', '-y', 'java-latest-openjdk'],
  },
  pacman: {
    node: ['sudo', 'pacman', '-S', '--noconfirm', 'nodejs', 'npm'],
    git: ['sudo', 'pacman', '-S', '--noconfirm', 'git'],
    python3: ['sudo', 'pacman', '-S', '--noconfirm', 'python', 'python-pip'],
    go: ['sudo', 'pacman', '-S', '--noconfirm', 'go'],
    java: ['sudo', 'pacman', '-S', '--noconfirm', 'jdk-openjdk'],
  },
};

function resolveCommandPath(cmd) {
  const pathEnv = process.env.PATH || '';
  for (const dir of pathEnv.split(path.delimiter)) {
    if (!dir) continue;
    const fullPath = path.join(dir, cmd);
    try {
      fs.accessSync(fullPath, fs.constants.X_OK);
      return fullPath;
    } catch {
      // not in this dir, keep looking
    }
  }
  return null;
}

function commandExists(cmd) {
  return resolveCommandPath(cmd) !== null;
}

function detectLinuxPackageManager() {
  for (const mgr of ['apt-get', 'dnf', 'pacman']) {
    if (commandExists(mgr)) return mgr;
  }
  return null;
}

function resolvePackageManager() {
  if (PLATFORM === 'darwin') {
    return commandExists('brew') ? 'brew' : null;
  }
  if (PLATFORM === 'linux') {
    return detectLinuxPackageManager();
  }
  return null;
}

function checkTool(tool) {
  const cmd = CHECK_CMDS[tool] || tool;
  return { tool, installed: commandExists(cmd) };
}

function checkAll(tools) {
  return tools.map(checkTool);
}

async function installTool(tool) {
  if (!SUPPORTED_PLATFORMS.includes(PLATFORM)) {
    throw new Error('Automatic install is currently only supported on Linux and macOS.');
  }
  const pkgManager = resolvePackageManager();
  if (!pkgManager) {
    if (PLATFORM === 'darwin') {
      throw new Error('Homebrew is not installed — install it first from https://brew.sh');
    }
    throw new Error('No known package manager (apt/dnf/pacman) was found.');
  }
  const cmdParts = INSTALL_MAP[pkgManager]?.[tool];
  if (!cmdParts) {
    throw new Error(`Don't know how to install "${tool}" via ${pkgManager} — please install it manually.`);
  }
  await run(cmdParts[0], cmdParts.slice(1), { stdio: 'inherit' });
}

module.exports = {
  PLATFORM,
  SUPPORTED_PLATFORMS,
  commandExists,
  resolveCommandPath,
  resolvePackageManager,
  checkTool,
  checkAll,
  installTool,
};
