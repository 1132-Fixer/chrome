'use strict';

const path = require('path');
const { execFileSync } = require('child_process');

/**
 * Resolve the `playwright` module without giving the repo a node_modules
 * dependency (the shipped extension must stay dependency-free).
 *
 * Order: normal resolution → global npm root → Windows global npm prefix.
 * Throws with an actionable message when none of them work.
 */
function requirePlaywright() {
  const candidates = ['playwright'];

  try {
    const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const root = execFileSync(npm, ['root', '-g'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    if (root) candidates.push(path.join(root, 'playwright'));
  } catch {
    // npm not on PATH — fall through to the remaining candidates
  }

  if (process.env.APPDATA) {
    candidates.push(path.join(process.env.APPDATA, 'npm', 'node_modules', 'playwright'));
  }

  const tried = [];
  for (const candidate of candidates) {
    try {
      return require(candidate);
    } catch (e) {
      tried.push(`${candidate} (${e.code || e.message})`);
    }
  }

  throw new Error(
    'playwright is required for this script but could not be resolved.\n' +
    'Install it globally:  npm install -g playwright\n' +
    'Tried:\n  ' + tried.join('\n  ')
  );
}

module.exports = { requirePlaywright };
