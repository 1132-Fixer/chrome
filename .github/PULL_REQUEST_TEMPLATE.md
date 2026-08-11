## What this changes

<!-- One or two sentences. One change per PR. -->

## Checklist

- [ ] `npm test` passes locally (validator + popup e2e).
- [ ] The change keeps the invariants: Zoom-only hosts, cookies-only clearing,
      one-button popup, no telemetry, no remote code, no new permissions.
- [ ] Version numbers were not hand-edited (`scripts/bump-version.js` owns them).
- [ ] Docs updated if behavior or wording changed.
