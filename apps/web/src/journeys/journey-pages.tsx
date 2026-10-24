import { NavigationContext, ParamsContext, RouterContext } from '@void/react';
import {
  type ComponentType,
  lazy,
  type ReactNode,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState
} from 'react';
import { components, layoutTree, pagePatterns } from 'virtual:groam/void-pages';
import { idleNavigationState, type VoidRouter } from 'void/pages-client';

/** The app's root layout; journeys supply its providers themselves, with their own client. */
const rootLayoutId = 'layout';

const pages = Object.fromEntries(
  Object.entries(components).map(([id, load]) => [id, lazy(load) as ComponentType])
);

const isCatchAll = (segment: string) => segment === '*' || segment.includes('{.+}');

// Static segments win over params, params over catch-alls, as in Void's Worker router.
const routes = pagePatterns
  .map(({ id, pattern }) => ({ id, segments: pattern.split('/').filter(Boolean) }))
  .sort((a, b) => rank(a.segments) - rank(b.segments));

function rank(segments: string[]) {
  return segments.reduce(
    (total, segment, index) =>
      total +
      (segment === '*' || segment.includes('{.+}') ? 100 : segment.startsWith(':') ? 1 : 0) /
        (index + 1),
    0
  );
}

/** The params of a route's segments for the path's parts, or null when they don't match. */
function matchSegments(segments: string[], parts: string[]) {
  const params: Record<string, string> = {};
  for (const [index, segment] of segments.entries()) {
    const part = parts[index];
    if (isCatchAll(segment)) return part === undefined ? null : params;
    if (part === undefined || (!segment.startsWith(':') && segment !== part)) return null;
    if (segment.startsWith(':')) params[segment.slice(1)] = part;
  }
  return segments.length === parts.length ? params : null;
}

function decodeSegment(segment: string) {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

function matchPage(pathname: string) {
  const parts = pathname.split('/').filter(Boolean).map(decodeSegment);
  for (const { id, segments } of routes) {
    const params = matchSegments(segments, parts);
    if (params) return { id, params };
  }
  return null;
}

function currentUrl() {
  return `${location.pathname}${location.search}${location.hash}`;
}

/**
 * Mounts the real Void page tree in-process: the page for the current URL inside its layouts,
 * with a history-backed stand-in for Void's router. Workspace pages render on the client and load
 * no Worker data, so only the Worker round trip is left out.
 */
export function JourneyPages({ root }: { root: (page: ReactNode) => ReactNode }) {
  const [url, setUrl] = useState(currentUrl);

  useEffect(() => {
    const onPopState = () => setUrl(currentUrl());
    addEventListener('popstate', onPopState);
    return () => removeEventListener('popstate', onPopState);
  }, []);

  const visit = useCallback(async (to: string | URL, options: { replace?: boolean } = {}) => {
    const next = new URL(to, location.origin);
    if (next.origin !== location.origin) {
      if (next.protocol !== 'https:' && next.protocol !== 'http:')
        throw new Error(`Journeys only navigate to web URLs, not ${next.protocol}`);
      // fallow-ignore-next-line security-sink -- test harness; targets come from app navigation and only http(s) passes the guard above
      location.assign(next.href);
      return undefined;
    }
    const path = `${next.pathname}${next.search}${next.hash}`;
    if (options.replace) history.replaceState(null, '', path);
    else history.pushState(null, '', path);
    setUrl(path);
    return undefined;
  }, []);

  const parsed = new URL(url, location.origin);
  const match = matchPage(parsed.pathname);
  const paramsKey = JSON.stringify(match?.params ?? {});
  const params = useMemo(() => JSON.parse(paramsKey) as Record<string, string>, [paramsKey]);
  const router = useMemo<VoidRouter>(() => {
    const at = new URL(url, location.origin);
    return {
      _hoverDelay: 75,
      flush: () => undefined,
      flushAll: () => undefined,
      params,
      path: at.pathname,
      prefetch: async () => undefined,
      query: at.searchParams,
      refresh: async () => undefined,
      url: at,
      visit
    };
  }, [params, url, visit]);

  let page: ReactNode = null;
  if (match) {
    const Page = pages[match.id];
    page = Page ? <Page /> : null;
    for (const layoutId of [...(layoutTree[match.id] ?? [])].reverse()) {
      const Layout = pages[layoutId] as ComponentType<{ children: ReactNode }> | undefined;
      if (layoutId !== rootLayoutId && Layout) page = <Layout>{page}</Layout>;
    }
  }

  return (
    <RouterContext value={router}>
      <NavigationContext value={idleNavigationState()}>
        <ParamsContext value={params}>{root(<Suspense>{page}</Suspense>)}</ParamsContext>
      </NavigationContext>
    </RouterContext>
  );
}
