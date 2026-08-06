'use strict';
const { execa } = require('execa');
const os = require('os');

const PLATFORM = os.platform(); // 'darwin' | 'linux' | others (unsupported for now)
const SUPPORTED_PLATFORMS = ['darwin', 'linux'];

// command used to check whether each tool is installed
const CHECK_CMDS = {
  node: 'node',
  npm: 'npm',
  git: 'git',
  python3: 'python3',
  pip3: 'pip3',
  go: 'go',
  java: 'java',
};

// install command for each tool, per package manager
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

async function commandExists(cmd) {
  try {
    await execa('bash', ['-lc', `command -v ${cmd}`]);
    return true;
  } catch {
    return false;
  }
}

async function detectLinuxPackageManager() {
  for (const mgr of ['apt-get', 'dnf', 'pacman']) {
    if (await commandExists(mgr)) return mgr;
  }
  return null;
}

async function resolvePackageManager() {
  if (PLATFORM === 'darwin') {
    return (await commandExists('brew')) ? 'brew' : null;
  }
  if (PLATFORM === 'linux') {
    return detectLinuxPackageManager();
  }
  return null;
}

async function checkTool(tool) {
  const cmd = CHECK_CMDS[tool] || tool;
  return { tool, installed: await commandExists(cmd) };
}

async function checkAll(tools) {
  const results = [];
  for (const tool of tools) results.push(await checkTool(tool));
  return results;
}

async function installTool(tool) {
  if (!SUPPORTED_PLATFORMS.includes(PLATFORM)) {
    throw new Error('Automatic install is currently only supported on Linux and macOS.');
  }
  const pkgManager = await resolvePackageManager();
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
  await execa(cmdParts[0], cmdParts.slice(1), { stdio: 'inherit' });
}

module.exports = {
  PLATFORM,
  SUPPORTED_PLATFORMS,
  commandExists,
  resolvePackageManager,
  checkTool,
  checkAll,
  installTool,
};
