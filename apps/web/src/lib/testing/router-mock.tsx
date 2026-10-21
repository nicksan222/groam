import type { ReactNode } from 'react';
import { vi } from 'vite-plus/test';

// oxlint-disable-next-line groam/no-local-type-definitions -- test double shape
type RouteTarget = {
  hash?: string;
  params?: Record<string, string | number>;
  search?: Record<string, unknown>;
  to: string;
};

/** The app-relative href of a target, as tests assert it (`/trips/abc/board?day=2`). */
function resolveHref({ hash, params = {}, search = {}, to }: RouteTarget) {
  const path = to.replace(/\$(\w+)/gu, (_, name: string) => String(params[name]));
  const query = new URLSearchParams(
    Object.entries(search)
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([key, value]) => [key, String(value)])
  ).toString();
  return `${path}${query ? `?${query}` : ''}${hash ? `#${hash}` : ''}`;
}

/**
 * Shared `@/lib/navigation/router` mock factory. Use it from a test file as
 * `vi.mock('@/lib/navigation/router', async (importOriginal) =>
 *   (await import('@/lib/testing/router-mock')).mockRouter(importOriginal))`.
 * Links render plain anchors with `$param` segments filled in; pass a hoisted
 * `navigate` spy to assert navigation.
 */
export async function mockRouter(importOriginal: <T>() => Promise<T>, navigate = vi.fn()) {
  return {
    ...(await importOriginal<typeof import('@/lib/navigation/router')>()),
    Link: ({
      children,
      className,
      ...target
    }: RouteTarget & { children?: ReactNode; className?: string }) => (
      <a
        className={className}
        href={resolveHref(target)}
        onClick={(event) => event.preventDefault()}
      >
        {children}
      </a>
    ),
    useNavigate: () => navigate
  };
}

/**
 * Router mock whose links and `Navigate` expose the resolved href (params and
 * search included), for views that assert on exact destinations.
 */
export async function mockRouterTargets(navigate = vi.fn()) {
  return {
    ...(await vi.importActual<typeof import('@/lib/navigation/router')>('@/lib/navigation/router')),
    Link: ({
      children,
      hash,
      params,
      search,
      to,
      ...rest
    }: RouteTarget & { children?: ReactNode }) => (
      <a href={resolveHref({ hash, params, search, to })} {...rest}>
        {children}
      </a>
    ),
    Navigate: (target: RouteTarget) => <div>navigate:{resolveHref(target)}</div>,
    useNavigate: () => navigate
  };
}
