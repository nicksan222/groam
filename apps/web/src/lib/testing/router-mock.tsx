import type { ReactNode } from 'react';
import { vi } from 'vite-plus/test';

/**
 * Shared `@tanstack/react-router` mock factory. Use it from a test file as
 * `vi.mock('@tanstack/react-router', async (importOriginal) =>
 *   (await import('@/lib/testing/router-mock')).mockRouter(importOriginal))`.
 * Links render plain anchors with `$param` segments filled in; pass a hoisted
 * `navigate` spy to assert navigation.
 */
export async function mockRouter(importOriginal: <T>() => Promise<T>, navigate = vi.fn()) {
  return {
    ...(await importOriginal<typeof import('@tanstack/react-router')>()),
    Link: ({
      children,
      className,
      params,
      to
    }: {
      children?: ReactNode;
      className?: string;
      params?: Record<string, string>;
      to: string;
    }) => {
      let href = to;
      for (const [key, value] of Object.entries(params ?? {})) {
        href = href.replace(`$${key}`, value);
      }
      return (
        <a className={className} href={href} onClick={(event) => event.preventDefault()}>
          {children}
        </a>
      );
    },
    useNavigate: () => navigate
  };
}

// oxlint-disable-next-line groam/no-local-type-definitions -- test double shape
type RouteTarget = {
  params?: Record<string, string | number>;
  search?: Record<string, unknown>;
  to: string;
};

/**
 * Router mock whose links and `Navigate` expose the resolved href (params and
 * search included), for views that assert on exact destinations.
 */
export async function mockRouterTargets(navigate = vi.fn()) {
  const resolveHref = ({ params = {}, search = {}, to }: RouteTarget) => {
    const path = to.replace(/\$(\w+)/gu, (_, name: string) => String(params[name]));
    const query = new URLSearchParams(
      Object.entries(search).map(([key, value]) => [key, String(value)])
    ).toString();
    return query ? `${path}?${query}` : path;
  };
  return {
    ...(await vi.importActual<typeof import('@tanstack/react-router')>('@tanstack/react-router')),
    Link: ({ children, params, search, to, ...rest }: RouteTarget & { children?: ReactNode }) => (
      <a href={resolveHref({ params, search, to })} {...rest}>
        {children}
      </a>
    ),
    Navigate: (target: RouteTarget) => <div>navigate:{resolveHref(target)}</div>,
    useNavigate: () => navigate
  };
}
