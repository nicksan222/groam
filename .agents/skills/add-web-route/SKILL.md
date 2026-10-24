---
name: add-web-route
description: >-
  Add a TanStack Router product page to apps/web. Use when creating a new
  page, URL, nested workspace section, layout, or redirect — routes are a
  code-based tree in apps/web/src/routes/route-tree.tsx.
---

# Add a web route

The web app is a client-only Vite SPA on [TanStack Router](https://tanstack.com/router),
served from the root of its own origin (there is no `/app` prefix; the landing site is a separate
deployment). Routes are a code-based tree in `apps/web/src/routes/route-tree.tsx`; page
components live in `apps/web/pages/`. Inspect neighboring pages and that tree for
current conventions.

- A page is `<name>.tsx` in `apps/web/pages/(workspace)/` with a default export; kebab-case
  names. Register it in `buildRouteTree()` with `at('/path/$param', () => import('#pages/(workspace)/<name>'))`
  under the `workspace` layout route (the signed-in shell, mounted once and kept between pages).
  A section that needs shared chrome across navigation gets a layout route with a
  `layout.tsx`, as `chat` does.
- Add the pattern to the `AppPath` union in `apps/web/src/types/navigation.ts`, using `$param` for
  dynamic segments (`/trips/$tripId/$section`). `Link`, `useNavigate`, and `Navigate` only accept
  listed paths, and `params` must supply every `$param`.
- Navigate with `Link`, `useNavigate`, `Navigate`, `useParams`, `useSearch`, and `useLocation` from
  `@/lib/navigation/router`; never import `@tanstack/react-router` in feature code or use raw
  internal `<a>` tags. `href()` in `apps/web/src/lib/navigation/paths.ts` builds plain paths.
  Workspace features that accept trip or issue references use the wrappers in
  `apps/web/src/features/workspace/navigation/router.ts`. Read search params through `useSearch`
  with a parser, as `trip-route-search.ts` does.
- View transitions are on app-wide (`defaultViewTransition` in `createAppRouter`). Pass
  `viewTransition` only to opt out (`Navigate` redirects already skip it).
- Keep page files as composition: read params and pass them to feature views. Place fetching,
  dialogs, and product markup in `apps/web/src/features/` (`place-feature-view`).
- Page files may import only what the `pageImports` pattern in `tooling/oxc-config/lint.ts` allows
  (feature, lib, and a few package aliases); read it rather than copying an allowlist.
- A page renders one feature `*View` from a `*-view.tsx` module, or only redirects with
  `<Navigate>`; the view registers screen context (`register-agent-screen-context`). Oxlint
  enforces both; `layout.tsx` files are exempt.
- Preserve a persistent screen shell while loading, following neighboring views and
  `apps/web/src/features/assistant/loading-state-coverage.test.ts`. Avoid swapping the whole screen
  for a separate loading tree.
- Journeys mount the same route tree in-process (`apps/web/src/journeys/journey-pages.tsx`, via `createAppRouter`), so a
  new route needs no extra registration. View tests mock `@/lib/navigation/router` with
  `@/lib/testing/router-mock` (`add-web-view-test`).
- Unknown URLs fall to the root route's not-found view. In production, Convex static
  hosting serves `index.html` for every path under `/app/` (the web component instance's SPA
  fallback; see `packages/backend/convex/modules/hosting/site.ts`).
- Add navigation when needed (`add-sidebar-nav`). Run the typecheck, the coverage tests above, and
  the relevant view tests; `vp dev` in `apps/web` serves the page at its path on `localhost:5173`.

Page headers use `Shell.Header` (`@groam/ui/components/shell/client`) with `parent`, `title`, `status`, `actions`, and `meta`; never hand-draw a page header. While data loads render `PageLoading`; never draw a skeleton. Header `actions` are `Shell.Action` (`icon`, `label`, `tone`): a labelled button on desktop, a round icon in the bottom-right dock on phones; never a bare `Button`.
