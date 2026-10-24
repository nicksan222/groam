---
name: place-ui-primitive
description: >-
  Decide where a reusable Groam UI primitive belongs and how to export it from
  packages/ui. Use when adding a button, dialog, shell piece, hook, or any
  component meant to be shared across features or apps.
---

# Place a UI primitive

Reusable look-and-feel belongs in `packages/ui`; product views and assistant
chrome have their own feature/package homes.

1. Inspect `packages/ui/src/components/`, `hooks/`, and `lib/` for an existing
   primitive or appropriate location. Follow comparable file naming and tests.
2. Read `packages/ui/package.json` for internal alias mappings and published
   subpaths. Use the mapping for the actual source extension; do not assume
   TypeScript and TSX aliases are interchangeable.
3. Publish the new entrypoint with an explicit export following the manifest.
   Consumers import the public subpath, never `@groam/ui/src/` or package-private
   aliases. Use semantic styling (`use-semantic-colors`).
4. Discover import/export checks in `tooling/quality/` and run the relevant
   conventions, package, and component checks from the current scripts.

Trip/idea/issue/chat views belong in web features (`place-feature-view`).
Assistant widgets and messages belong in `packages/ai/src/ui` (`place-ai-ui`).
Model-emitted form catalog definitions belong in `packages/ai/src/runtime/output`.

## Reuse before rebuilding: the `prefer-*` lint rules

Features (`apps/web/src/features`) and assistant UI (`packages/ai/src/ui`) must
render the primitive instead of copying its class recipe. Oxlint pattern rules
in `tooling/oxc-config/plugin/patterns/` (`prefer-muted-copy`, `prefer-icon-tile`,
`prefer-separator`, `prefer-removable-chip`, `prefer-error-well`,
`prefer-shell-eyebrow`, `prefer-card`, `prefer-panel`, `prefer-collapsible`,
`prefer-table`, `no-copied-ui-slots`) report a hand-built copy and name the
primitive and its import path.

- If a copy differs slightly, add a variant to the primitive (a `size`,
  `variant`, or `radius` prop, with a test) and migrate; do not keep a near-copy.
- A new primitive needs a real consumer: the `unused-ui-components` convention
  fails when no app, `packages/ai`, or other ui component imports it.
- A new signature rule is one JSON file with reporting and non-reporting
  examples (`tooling/oxc-config/README.md`); keep it token-exact so it cannot
  flag a legitimate one-off.
