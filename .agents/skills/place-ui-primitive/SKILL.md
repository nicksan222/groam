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
