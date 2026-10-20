---
name: place-ai-ui
description: >-
  Place Groam assistant React UI in packages/ai/src/ui rather than apps/web
  or packages/ui. Use when adding chat widget, composer, message bubble,
  tool-call card, agent run banner, attachment picker, or agent screen-context
  provider pieces.
---

# Place assistant UI

In-app assistant chrome belongs in `packages/ai/src/ui/`. Inspect that tree for
the closest chat, message, form, context, attachment, or run component and follow
its placement. Apps consume published `@groam/ai/ui/` subpaths.

- Read `packages/ai/package.json` for current internal aliases and explicit
  exports. Publish new entrypoints needed by apps; do not import unexported
  internals or copy assistant hooks into the web app.
- Follow one-component-per-file conventions and the active lint configuration
  (`split-feature-tsx`). Add meaningful component/hook coverage beside the code.
- Shared primitives and shell pieces belong in `packages/ui`
  (`place-ui-primitive`); product roster/run-log pages belong in web features
  (`place-feature-view`).
- Agent identity belongs in `packages/ai/src/agents/`, output catalog definitions
  in `packages/ai/src/runtime/output/`, and screen-target types in
  `packages/ai/src/runtime/screen/`. Keep rendering and execution boundaries intact.

Discover export and import checks in `tooling/quality/` and run the relevant
package checks from the manifests.
