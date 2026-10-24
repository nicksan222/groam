import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  useRouter,
  useRouterState
} from '@tanstack/react-router';
import { useCallback, useLayoutEffect, useMemo, useRef } from 'react';
import { parseSearch } from '@/lib/navigation/search';
import type { NavigateOptions, NavigateTarget } from '@/types/navigation';

const browserHref = () => `${location.pathname}${location.search}${location.hash}`;

/** TanStack scrolls to the top on navigation unless `resetScroll` is false. */
const resetScroll = (preserveScroll?: boolean) => (preserveScroll ? false : undefined);

/** A stable function that visits a typed destination through the router. */
export function useNavigate() {
  const router = useRouter({ warn: false });
  const current = useRef(router);
  useLayoutEffect(() => {
    current.current = router;
  }, [router]);
  return useCallback(
    ({ hash, params, preserveScroll, replace, search, to, viewTransition }: NavigateTarget) =>
      current.current.navigate({
        hash,
        params,
        replace,
        resetScroll: resetScroll(preserveScroll),
        search,
        to,
        viewTransition
      } as unknown as Parameters<typeof router.navigate>[0]),
    []
  );
}

/** A stable function that visits an already-built browser URL, such as a canonicalized path. */
export function useVisit() {
  const router = useRouter({ warn: false });
  const current = useRef(router);
  useLayoutEffect(() => {
    current.current = router;
  }, [router]);
  return useCallback(
    async (url: string, { preserveScroll, replace, viewTransition }: NavigateOptions = {}) => {
      const next = new URL(url, location.origin);
      // Visits are app navigation; another origin is never a destination this router owns.
      if (next.origin !== location.origin) throw new Error('Only app URLs can be visited');
      // `href` navigates to the built URL as-is: no `$param` re-interpolation, repeated query keys kept.
      await current.current.navigate({
        href: `${next.pathname}${next.search}${next.hash}`,
        replace,
        resetScroll: resetScroll(preserveScroll),
        viewTransition
      });
    },
    []
  );
}

/**
 * The router in context, or an idle one at the browser's URL where none is mounted (a view
 * under test), so location and params read the same way and are simply empty there.
 */
function useCurrentRouter() {
  const router = useRouter({ warn: false });
  return useMemo(
    () =>
      router ??
      createRouter({
        history: createMemoryHistory({ initialEntries: [browserHref()] }),
        routeTree: createRootRoute()
      }),
    [router]
  );
}

/** The current location (`pathname`, `search`, `hash`) and its parsed query. */
export function useLocation() {
  const router = useCurrentRouter();
  const { hash, pathname, searchStr } = useRouterState({
    router,
    // The resolved location moves with `useParams` (matches), after lazy chunks load.
    select: (state) => state.resolvedLocation ?? state.location
  });
  return useMemo(
    () => ({
      hash: hash ? `#${hash}` : '',
      pathname,
      search: searchStr,
      searchParams: new URLSearchParams(searchStr)
    }),
    [hash, pathname, searchStr]
  );
}

/** The current query, validated by the route's parser. */
export function useSearch<T>(parse: (search: Record<string, unknown>) => T): T {
  const { search } = useLocation();
  return useMemo(() => parse(parseSearch(new URLSearchParams(search))), [parse, search]);
}

/** The matched routes' params, merged; empty outside a router. */
export function useParams<T extends Record<string, string | undefined>>(): Partial<T> {
  const router = useCurrentRouter();
  const key = useRouterState({
    router,
    select: (state) =>
      JSON.stringify(Object.assign({}, ...state.matches.map((match) => match.params)))
  });
  return useMemo(() => JSON.parse(key) as Partial<T>, [key]);
}
