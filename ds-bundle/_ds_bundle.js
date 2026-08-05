/* @ds-bundle name=Fixer1132 kind=vanilla
 * 1132 Fixer Design System — vanilla HTML/CSS system, no framework components.
 * Styling lives entirely in styles.css (tokens + component classes); this
 * bundle only exposes the token map for programmatic use.
 */
(function () {
  'use strict';
  window.Fixer1132 = {
    tokens: {
      ink: { 900: '#050a14', 800: '#081018', 700: '#0a1020' },
      amber: { 400: '#f5a623', 500: '#ff8c00' },
      blue: { 300: '#4aa3ff', 400: '#2d8cff', 600: '#1a6fb5' },
      green: { 500: '#22c55e' },
      red: { 500: '#ef4444' },
      text: { base: '#f0f0f0', dim: '#8ca4c0' },
      hazard: { yellow: '#f5c518', black: '#1a1a1a' },
    },
  };
})();
