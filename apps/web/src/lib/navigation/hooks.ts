import { ParamsContext, useRouter } from '@void/react';
import { useCallback, useContext, useLayoutEffect, useMemo, useRef } from 'react';
import { href } from '@/lib/navigation/paths';
import { parseSearch } from '@/lib/navigation/search';
import type { NavigateOptions, NavigateTarget, RouteTarget } from '@/types/navigation';

/** A stable function that visits a typed destination through Void's router. */
export function useNavigate() {
  const router = useRouter();
  const current = useRef(router);
  useLayoutEffect(() => {
    current.current = router;
  }, [router]);
  return useCallback(
    ({ preserveScroll, replace, viewTransition, ...target }: NavigateTarget) =>
      current.current.visit(href(target as RouteTarget), {
        preserveScroll,
        replace,
        viewTransition
      }),
    []
  );
}

/** A stable function that visits an already-built browser URL, such as a canonicalized path. */
export function useVisit() {
  const router = useRouter();
  const current = useRef(router);
  useLayoutEffect(() => {
    current.current = router;
  }, [router]);
  return useCallback(
    (url: string, options: NavigateOptions = {}) => current.current.visit(url, options),
    []
  );
}

/** The current location (`pathname`, `search`, `hash`) and its parsed query. */
export function useLocation() {
  const { url } = useRouter();
  return useMemo(
    () => ({
      hash: url.hash,
      pathname: url.pathname,
      search: url.search,
      searchParams: new URLSearchParams(url.search)
    }),
    [url.hash, url.pathname, url.search]
  );
}

/** The current query, validated by the route's parser. */
export function useSearch<T>(parse: (search: Record<string, unknown>) => T): T {
  const { search } = useLocation();
  return useMemo(() => parse(parseSearch(new URLSearchParams(search))), [parse, search]);
}

/** The current page's route params; empty outside a Void page (for example, in view tests). */
export function useParams<T extends Record<string, string | undefined>>(): Partial<T> {
  return (useContext(ParamsContext) ?? {}) as Partial<T>;
}
