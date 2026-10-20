---
name: place-feature-view
description: >-
  Place product UI in apps/web/src/features rather than routes or packages/ui.
  Use when adding a page, panel, dialog, list, or domain-specific React view
  for trips, ideas, issues, chats, agents, settings, or group.
---

# Place a feature view

Product UI belongs in `apps/web/src/features/<domain>/`; route files compose
views (`add-web-route`). Inspect the feature tree for the closest domain and
screen before creating another area.

- Group a screen's components and tests in a kebab-case area folder. Keep domain
  data hooks in `hooks/` (`add-feature-hook`) and shared non-UI utilities in
  `apps/web/src/lib/` when multiple features need them.
- Export one component per TSX file and follow the current size limits from lint
  configuration (`split-feature-tsx`); keep the page view as a composer.
- Register screen context in the feature view (`register-agent-screen-context`).
- Use published UI primitives, assistant UI, and backend API exports. Resolve
  aliases from the app configuration and package manifests (`use-package-aliases`);
  sibling imports may use `./`, parent-directory imports are prohibited.
- Colocate view and hook tests, following nearby tests and the active web test
  configuration.

Shared primitives belong in `packages/ui`; assistant chrome belongs in
`packages/ai/src/ui`. Do not move domain-specific screens into either package.
