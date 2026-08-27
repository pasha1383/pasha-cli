'use strict';
const fs = require('fs');
const path = require('path');
const { run } = require('./exec');
const os = require('os');

const PLATFORM = os.platform();
const SUPPORTED_PLATFORMS = ['darwin', 'linux', 'win32'];

const CHECK_CMDS = {
  node: 'node',
  npm: 'npm',
  git: 'git',
  python3: 'python3',
  pip3: 'pip3',
  go: 'go',
  java: 'java',
  mvn: 'mvn',
  dotnet: 'dotnet',
  php: 'php',
  composer: 'composer',
  rust: 'rustc',
  cargo: 'cargo',
  ruby: 'ruby',
  bundler: 'bundle',
  rails: 'rails',
};

// The official Windows installers for Python don't put a `python3`/`pip3`
// alias on PATH the way most Linux distros and Homebrew do — only
// `python`/`pip`. Everything else on this list keeps the same binary name on
// Windows (npm.cmd, git.exe, mvn.cmd, composer.bat, ... are all still found
// under their Unix name once resolveCommandPath tries PATHEXT extensions).
const WIN_CHECK_CMD_OVERRIDES = {
  python3: 'python',
  pip3: 'pip',
};

// installTool() and CHECK_CMDS/doctor's tool list are keyed by whatever name
// a tool is *checked* under, which isn't always the name of the *package*
// that provides it — e.g. the `rustc` binary and the `cargo` binary both
// ship in the `rust`/`rustup` package, and `npm` ships bundled with `node`.
// INSTALL_MAP is keyed by canonical package id; this maps a checked tool
// name to that id (identity if there's no split). Without this, e.g.
// installTool('rustc') looks up INSTALL_MAP[mgr]['rustc'], which never
// exists (only INSTALL_MAP[mgr]['rust'] does) and always fails with
// "don't know how to install rustc" even on a fully supported OS/manager.
const PACKAGE_ALIASES = {
  rustc: 'rust',
  cargo: 'rust',
  npm: 'node',
  pip3: 'python3',
};

function resolvePackageId(tool) {
  return PACKAGE_ALIASES[tool] || tool;
}

function wingetInstall(id) {
  return [
    'winget', 'install',
    '--id', id,
    '-e',
    '--source', 'winget',
    '--accept-package-agreements',
    '--accept-source-agreements',
  ];
}

// Every table below is keyed by canonical package id (see PACKAGE_ALIASES) —
// `rustc`/`cargo` both resolve to `rust`, `npm` resolves to `node`, `pip3`
// resolves to `python3`, so those don't need (and shouldn't have) their own
// entries here.
const INSTALL_MAP = {
  brew: {
    node: ['brew', 'install', 'node'],
    git: ['brew', 'install', 'git'],
    python3: ['brew', 'install', 'python3'],
    go: ['brew', 'install', 'go'],
    java: ['brew', 'install', 'openjdk@17'],
    mvn: ['brew', 'install', 'maven'],
    dotnet: ['brew', 'install', 'dotnet-sdk'],
    php: ['brew', 'install', 'php'],
    composer: ['brew', 'install', 'composer'],
    rust: ['brew', 'install', 'rustup-init'],
    ruby: ['brew', 'install', 'ruby'],
    bundler: null,
    rails: null,
  },
  'apt-get': {
    node: ['sudo', 'apt-get', 'install', '-y', 'nodejs', 'npm'],
    git: ['sudo', 'apt-get', 'install', '-y', 'git'],
    python3: ['sudo', 'apt-get', 'install', '-y', 'python3', 'python3-pip'],
    go: ['sudo', 'apt-get', 'install', '-y', 'golang-go'],
    java: ['sudo', 'apt-get', 'install', '-y', 'openjdk-17-jdk'],
    mvn: ['sudo', 'apt-get', 'install', '-y', 'maven'],
    dotnet: ['sudo', 'apt-get', 'install', '-y', 'dotnet-sdk-8.0'],
    php: ['sudo', 'apt-get', 'install', '-y', 'php', 'php-cli', 'php-mbstring', 'php-xml', 'php-curl', 'php-pgsql', 'php-mysql', 'php-sqlite3'],
    composer: null,
    rust: null,
    ruby: ['sudo', 'apt-get', 'install', '-y', 'ruby', 'ruby-dev'],
    bundler: null,
    rails: null,
  },
  dnf: {
    node: ['sudo', 'dnf', 'install', '-y', 'nodejs', 'npm'],
    git: ['sudo', 'dnf', 'install', '-y', 'git'],
    python3: ['sudo', 'dnf', 'install', '-y', 'python3', 'python3-pip'],
    go: ['sudo', 'dnf', 'install', '-y', 'golang'],
    java: ['sudo', 'dnf', 'install', '-y', 'java-17-openjdk'],
    mvn: ['sudo', 'dnf', 'install', '-y', 'maven'],
    dotnet: ['sudo', 'dnf', 'install', '-y', 'dotnet-sdk-8.0'],
    php: ['sudo', 'dnf', 'install', '-y', 'php', 'php-cli', 'php-mbstring', 'php-xml', 'php-curl', 'php-pgsql', 'php-mysqlnd', 'php-pdo'],
    composer: null,
    rust: ['sudo', 'dnf', 'install', '-y', 'rust', 'cargo'],
    ruby: ['sudo', 'dnf', 'install', '-y', 'ruby', 'ruby-devel'],
    bundler: null,
    rails: null,
  },
  pacman: {
    node: ['sudo', 'pacman', '-S', '--noconfirm', 'nodejs', 'npm'],
    git: ['sudo', 'pacman', '-S', '--noconfirm', 'git'],
    python3: ['sudo', 'pacman', '-S', '--noconfirm', 'python', 'python-pip'],
    go: ['sudo', 'pacman', '-S', '--noconfirm', 'go'],
    java: ['sudo', 'pacman', '-S', '--noconfirm', 'jdk17-openjdk'],
    mvn: ['sudo', 'pacman', '-S', '--noconfirm', 'maven'],
    dotnet: ['sudo', 'pacman', '-S', '--noconfirm', 'dotnet-sdk'],
    php: ['sudo', 'pacman', '-S', '--noconfirm', 'php'],
    composer: ['sudo', 'pacman', '-S', '--noconfirm', 'composer'],
    rust: ['sudo', 'pacman', '-S', '--noconfirm', 'rust'],
    ruby: ['sudo', 'pacman', '-S', '--noconfirm', 'ruby'],
    bundler: null,
    rails: null,
  },
  // winget ships with Windows 10 (1809+) and Windows 11 out of the box via
  // the "App Installer" package, so it's the best default — no extra setup
  // needed for most users, unlike Chocolatey/Scoop which require their own
  // bootstrap step first.
  winget: {
    node: wingetInstall('OpenJS.NodeJS.LTS'),
    git: wingetInstall('Git.Git'),
    python3: wingetInstall('Python.Python.3'),
    go: wingetInstall('GoLang.Go'),
    java: wingetInstall('Microsoft.OpenJDK.21'),
    mvn: wingetInstall('Apache.Maven'),
    dotnet: wingetInstall('Microsoft.DotNet.SDK.8'),
    php: wingetInstall('PHP.PHP.8.3'),
    composer: wingetInstall('Composer.Composer'),
    rust: wingetInstall('Rustlang.Rustup'),
    ruby: wingetInstall('RubyInstallerTeam.Ruby.3.3'),
    bundler: null,
    rails: null,
  },
};

// Windows PATH entries are `;`-delimited (path.delimiter is already
// platform-aware, so no change needed there) and executables typically need
// one of the extensions listed in PATHEXT (.COM;.EXE;.BAT;.CMD;... by
// default) — `git` on PATH is really `git.exe`, `npm` is `npm.cmd`, etc. A
// bare `fs.accessSync(path.join(dir, 'git'))` never matches those.
function windowsExecExtensions() {
  const raw = process.env.PATHEXT || '.COM;.EXE;.BAT;.CMD';
  return raw.split(';').filter(Boolean);
}

function resolveCommandPath(cmd) {
  const pathEnv = process.env.PATH || '';
  const dirs = pathEnv.split(path.delimiter).filter(Boolean);

  if (PLATFORM === 'win32') {
    // If the caller already passed an extension (e.g. an explicit "foo.exe"),
    // don't also try appending PATHEXT suffixes on top of it.
    const alreadyHasExt = /\.[^.\\/]+$/.test(cmd);
    const exts = alreadyHasExt ? [''] : windowsExecExtensions();
    for (const dir of dirs) {
      for (const ext of exts) {
        const fullPath = path.join(dir, cmd + ext);
        try {
          // X_OK isn't meaningful on Windows (no execute permission bit) —
          // existence is what actually matters here.
          fs.accessSync(fullPath, fs.constants.F_OK);
          return fullPath;
        } catch {
          // not in this dir/extension, keep looking
        }
      }
    }
    return null;
  }

  for (const dir of dirs) {
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
  if (PLATFORM === 'win32') {
    return commandExists('winget') ? 'winget' : null;
  }
  return null;
}

function checkTool(tool) {
  const overrides = PLATFORM === 'win32' ? WIN_CHECK_CMD_OVERRIDES : null;
  const cmd = (overrides && overrides[tool]) || CHECK_CMDS[tool] || tool;
  return { tool, installed: commandExists(cmd) };
}

function checkAll(tools) {
  return tools.map(checkTool);
}

async function installTool(tool, opts = {}) {
  const { stdio = 'inherit' } = opts;
  if (!SUPPORTED_PLATFORMS.includes(PLATFORM)) {
    throw new Error('Automatic install is currently only supported on Linux, macOS, and Windows.');
  }
  const pkgManager = resolvePackageManager();
  if (!pkgManager) {
    if (PLATFORM === 'darwin') {
      throw new Error('Homebrew is not installed — install it first from https://brew.sh');
    }
    if (PLATFORM === 'win32') {
      throw new Error('winget was not found — install "App Installer" from the Microsoft Store, or update Windows, then try again.');
    }
    throw new Error('No known package manager (apt/dnf/pacman) was found.');
  }
  // Look up the install command by canonical package id, not by whatever
  // name the tool happens to be checked under (see PACKAGE_ALIASES) — this
  // is what makes installTool('rustc') and installTool('npm') resolve to
  // the `rust`/`node` package entries instead of failing to find a
  // same-named entry that was never meant to exist.
  const pkgId = resolvePackageId(tool);
  const cmdParts = INSTALL_MAP[pkgManager]?.[pkgId];
  if (!cmdParts) {
    throw new Error(`Don't know how to install "${tool}" via ${pkgManager} — please install it manually.`);
  }
  await run(cmdParts[0], cmdParts.slice(1), { stdio });
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
