---
name: add-web-route
description: >-
  Add a Void product page under apps/web/pages. Use when creating a new
  page, URL, nested workspace section, layout, or redirect — pages are
  file-routed, with no generated route tree to edit.
---

# Add a web route

The web app is a [Void](https://void.cloud) app. Pages live in
`apps/web/pages/`, served from the root of the app's own origin (there is no
`/app` prefix; the landing site is a separate deployment). Void discovers pages
from the file tree; there is no route tree to generate or register. Inspect
neighboring pages, `apps/web/void.config.ts`, and `apps/web/vite.config.ts` for
current conventions.

- A page is `<name>.tsx` with a default export, plus a sibling
  `<name>.server.ts` containing `export const ssr = false;`. Convex owns data
  and sessions in the browser, so pages are client-mounted. Copy a neighbor's
  `.server.ts` rather than writing new server behavior.
- File names are kebab-case; dynamic segments are `[param]` (`[tripId].tsx`,
  `[tripId]/index.tsx`), catch-alls `[...path]`, and route groups `(name)`.
  `(workspace)` is the signed-in shell group: its `layout.tsx` mounts the
  workspace providers and sidebar once and keeps them mounted between pages.
  The root `pages/layout.tsx` re-exports `AppLayout` from
  `apps/web/src/app-layout.tsx`.
- A nested `layout.tsx` takes `LayoutProps` (`children`) from
  `@/lib/navigation/router`. Add one only when a section needs shared chrome
  that survives navigation (see `chat/layout.tsx`).
- Add the page's pattern to the `AppPath` union in
  `apps/web/src/types/navigation.ts`, using `$param` for dynamic segments
  (`/trips/$tripId/$section`). `Link`, `useNavigate`, and `Navigate` only accept
  listed paths, and `params` must supply every `$param`.
- Navigate with `Link`, `useNavigate`, `Navigate`, `useParams`, `useSearch`, and
  `useLocation` from `@/lib/navigation/router`; never import `@void/react`
  routing helpers in feature code or use raw internal `<a>` tags. Paths are
  plain paths (`/trips`); `href()` in `apps/web/src/lib/navigation/paths.ts` builds them. Workspace features that accept
  trip or issue references use the wrappers in
  `apps/web/src/features/workspace/navigation/router.ts`. Read search params
  through `useSearch` with a parser, as `trip-route-search.ts` does.
- View transitions are enabled app-wide (`voidReact({ viewTransitions: true })`
  in `apps/web/vite.config.ts`). Pass `viewTransition` to `Link`,
  `useNavigate`, or `Navigate` only where a neighbor already does.
- Keep page files as composition: read params and pass them to feature views.
  Place fetching, dialogs, and product markup in `apps/web/src/features/`
  (`place-feature-view`).
- Page files may import only what the `pageImports` pattern in
  `tooling/oxc-config/lint.ts` allows (feature, lib, and a few package aliases);
  read it rather than copying an allowlist into another instruction.
- A workspace page renders one feature `*View` from a `*-view.tsx` module, or
  only redirects with `<Navigate>`; the view registers screen context
  (`register-agent-screen-context`). Oxlint enforces both; layouts are exempt.
- Preserve a persistent screen shell while loading, following neighboring views
  and `apps/web/src/features/assistant/loading-state-coverage.test.ts`. Avoid
  swapping the whole screen for a separate loading tree.
- Journeys mount the real page tree in-process
  (`apps/web/src/journeys/journey-pages.tsx`, `void-pages-manifest.ts`), so a new
  page is picked up without extra registration. View tests mock
  `@/lib/navigation/router` with `@/lib/testing/router-mock` (`add-web-view-test`).
- Add navigation when needed (`add-sidebar-nav`). Run the typecheck, the
  coverage tests above, and the relevant view tests; `vp dev` in `apps/web`
  serves the page at its path on `localhost:5173`. Void writes types under `.void/` (ignored);
  never hand-edit generated files.

Page headers use `Shell.Header` (`@groam/ui/components/shell/client`) with `parent`, `title`, `status`, `actions`, and `meta`; never hand-draw a page header. While data loads render `PageLoading`; never draw a skeleton. Header `actions` are `Shell.Action` (`icon`, `label`, `tone`): a labelled button on desktop, a round icon in the bottom-right dock on phones; never a bare `Button`.
