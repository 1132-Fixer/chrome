/* @ds-bundle name=Fixer1132 kind=vanilla
 * 1132 Fixer Design System — vanilla HTML/CSS system, no framework components.
 * Styling lives entirely in styles.css (tokens + component classes); this
 * bundle only exposes the token map for programmatic use.
 */
(function () {
  'use strict';
  window.Fixer1132 = {
    tokens: {
      bg: { 0: '#17243a', 1: '#203857' },
      surface: { base: '#1e2b46', elev: '#243453' },
      border: { base: 'rgba(255,255,255,0.08)', hi: 'rgba(58,130,247,0.4)' },
      accent: { base: '#3a82f7', hover: '#4b93ff', down: '#2f6fd6', soft: '#8fc2ff' },
      green: { 500: '#39d353' },
      amber: { 400: '#f2c94c' },
      red: { 500: '#f85149' },
      text: { base: '#f4f7fb', dim: '#9ca8bd' },
      radius: { btn: '8px', pill: '999px' },
    },
  };
})();
