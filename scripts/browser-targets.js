'use strict';

/**
 * Browser packaging overlays (#20).
 *
 * Root manifest.json is the live Chrome identity. Other targets are generated
 * from that file plus the overlay below — never a second hand-maintained
 * manifest. One zip is not universal.
 *
 * Chromium family (Chrome / Edge / Brave) keeps minimum_chrome_version.
 * Firefox drops it and adds gecko browser_specific_settings.
 * Brave has its own zip so Chrome-only claims stay off that package; there is
 * no Brave store pipeline.
 */

const TARGETS = {
  chrome: {
    id: 'chrome',
    family: 'chromium',
    name: '1132 Fixer for Chrome',
    description: 'Clear Zoom site data in Chrome with one guided action.',
    zipStem: '1132-fixer-chrome',
  },
  edge: {
    id: 'edge',
    family: 'chromium',
    name: '1132 Fixer for Edge',
    description: 'Clear Zoom site data in Edge with one guided action.',
    zipStem: '1132-fixer-edge',
  },
  brave: {
    id: 'brave',
    family: 'chromium',
    name: '1132 Fixer for Brave',
    description: 'Clear Zoom site data in Brave with one guided action.',
    zipStem: '1132-fixer-brave',
  },
  firefox: {
    id: 'firefox',
    family: 'gecko',
    name: '1132 Fixer for Firefox',
    description: 'Clear Zoom site data in Firefox with one guided action.',
    zipStem: '1132-fixer-firefox',
    gecko: {
      id: '1132-fixer@1132-fixer.xyz',
      strict_min_version: '115.0',
    },
  },
};

function applyOverlay(baseManifest, targetId) {
  const target = TARGETS[targetId];
  if (!target) throw new Error('unknown packaging target: ' + targetId);
  const out = Object.assign({}, baseManifest);
  out.name = target.name;
  out.description = target.description;
  if (target.family === 'gecko') {
    delete out.minimum_chrome_version;
    out.browser_specific_settings = {
      gecko: {
        id: target.gecko.id,
        strict_min_version: target.gecko.strict_min_version,
      },
    };
  }
  return out;
}

module.exports = { TARGETS, applyOverlay };
