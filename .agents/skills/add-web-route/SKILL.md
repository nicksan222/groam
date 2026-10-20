---
name: add-web-route
description: >-
  Add a TanStack Router product route under apps/web/src/routes. Use when
  creating a new page, URL, nested workspace section, or file-based route —
  never by editing routeTree.gen.ts by hand.
---

# Add a web route

Routes live in `apps/web/src/routes/`. Inspect neighboring files and
`apps/web/vite.config.ts` for current file-routing conventions, authenticated
layouts, parameter naming, and generation. Never edit `routeTree.gen.ts` or
introduce a parallel route registry.

- Keep route files as composition: read params and pass them to feature views.
  Place fetching, dialogs, and product markup in `apps/web/src/features/`
  (`place-feature-view`).
- Discover allowed imports in the `route-imports` check under `tooling/quality/`
  and package exports rather than copying an allowlist into another instruction.
- Register screen context from the view (`register-agent-screen-context`). Read
  `apps/web/src/features/assistant/agent-context-coverage.test.ts` for exemptions.
- Preserve a persistent screen shell while loading, following neighboring views
  and `apps/web/src/features/assistant/loading-state-coverage.test.ts`. Avoid
  swapping the whole screen for a separate loading tree.
- Add navigation when needed (`add-sidebar-nav`). Find the current route codegen
  command in the root manifest and run the relevant coverage and view tests.
