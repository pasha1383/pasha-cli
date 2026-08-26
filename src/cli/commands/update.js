'use strict';
const https = require('https');
const chalk = require('chalk');
const log = require('../../utils/logger');
const { run } = require('../../core/system/exec');
const pkg = require('../../../package.json');

const PACKAGE_NAME = '@pasha1383/pasha';
const REGISTRY_URL = `https://registry.npmjs.org/${PACKAGE_NAME}/latest`;
const REQUEST_TIMEOUT_MS = 5000;

/**
 * Fetches the latest published version of the package from the npm registry.
 *
 * Uses Node's built-in `https` module rather than shelling out to `npm view`
 * so behaviour is predictable and easy to test — no dependency on the user's
 * npm config, registry overrides, or npm being on PATH at all.
 *
 * @returns {Promise<string>} the latest version string (e.g. "3.1.0")
 */
function fetchLatestVersion() {
  return new Promise((resolve, reject) => {
    const req = https.get(REGISTRY_URL, { timeout: REQUEST_TIMEOUT_MS }, (res) => {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        res.resume();
        reject(new Error(`Registry responded with status ${res.statusCode}`));
        return;
      }

      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (!parsed || typeof parsed.version !== 'string') {
            reject(new Error('Registry response did not include a version field'));
            return;
          }
          resolve(parsed.version);
        } catch (err) {
          reject(new Error(`Failed to parse registry response: ${err.message}`));
        }
      });
    });

    req.on('timeout', () => {
      req.destroy(new Error(`Request to npm registry timed out after ${REQUEST_TIMEOUT_MS}ms`));
    });

    req.on('error', (err) => {
      reject(new Error(`Could not reach npm registry: ${err.message}`));
    });
  });
}

/**
 * Compares two "major.minor.patch"-style version strings.
 *
 * No new dependency is pulled in for this — it's a plain numeric compare of
 * up to three dot-separated segments. Any non-numeric or missing segment is
 * treated as 0, which is good enough for comparing published npm versions.
 *
 * @param {string} a
 * @param {string} b
 * @returns {number} negative if a<b, 0 if equal, positive if a>b
 */
function compareVersions(a, b) {
  const partsA = String(a).split('.').map((n) => parseInt(n, 10) || 0);
  const partsB = String(b).split('.').map((n) => parseInt(n, 10) || 0);
  const len = Math.max(partsA.length, partsB.length);

  for (let i = 0; i < len; i++) {
    const diff = (partsA[i] || 0) - (partsB[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/**
 * `pasha update` — checks the npm registry for a newer published version and,
 * unless `--check` was passed, installs it globally.
 *
 * @param {object} opts
 * @param {boolean} opts.check  Only check for an update, don't install it.
 */
async function update(opts = {}) {
  const currentVersion = pkg.version;
  log.info(`Current version: ${currentVersion}`);

  let latestVersion;
  try {
    latestVersion = await fetchLatestVersion();
  } catch (err) {
    log.fail(`Could not check for updates: ${err.message}`);
    log.info('Check your internet connection and try again later.');
    process.exit(1);
    return;
  }

  const comparison = compareVersions(currentVersion, latestVersion);

  if (comparison >= 0) {
    log.ok(`You're on the latest version (${currentVersion}).`);
    return;
  }

  log.info(`A new version is available: ${chalk.bold(latestVersion)} (current: ${currentVersion})`);

  if (opts.check) {
    log.info(`Run "pasha update" to install it.`);
    return;
  }

  log.title('Updating pasha...');
  try {
    await run('npm', ['install', '-g', `${PACKAGE_NAME}@latest`]);
    log.ok(`Updated to ${latestVersion}.`);
  } catch (err) {
    log.fail(`Update failed: ${err.message}`);
    log.info(`You can update manually by running: npm install -g ${PACKAGE_NAME}@latest`);
    process.exit(1);
  }
}

module.exports = { update, compareVersions, fetchLatestVersion, PACKAGE_NAME, REGISTRY_URL };
