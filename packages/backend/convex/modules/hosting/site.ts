import { registerStaticRoutes } from '@convex-dev/static-hosting';
import { type HttpRouter, httpRouter } from 'convex/server';
import { components } from '#convex-generated/api';
import { httpAction } from '#convex-generated/server';

/** Where the web app (a SPA with client-side routing) is served. */
export const WEB_APP_PATH_PREFIX = '/app/';

type StaticHandler = { _handler: (ctx: never, request: Request) => Promise<Response> };

/**
 * The file a landing-site URL names. The static-hosting component looks files up by exact path
 * and only maps `/` to `index.html`; Astro writes every other page as `<page>/index.html`.
 */
export function landingFilePath(pathname: string): string {
  if (pathname.endsWith('/')) return `${pathname}index.html`;
  const lastSegment = pathname.slice(pathname.lastIndexOf('/') + 1);
  return lastSegment.includes('.') ? pathname : `${pathname}/index.html`;
}

/** The same request for another file; `revalidate: false` drops the validators of the original. */
function withPath(request: Request, pathname: string, { revalidate = true } = {}): Request {
  const url = new URL(request.url);
  url.pathname = pathname;
  const headers = new Headers(request.headers);
  if (!revalidate) headers.delete('If-None-Match');
  return new Request(url, { method: request.method, headers });
}

/**
 * Astro emits every page as a directory (`trailingSlash: 'always'`), so a bare `/pricing` goes to
 * `/pricing/`. Paths with a file extension and the root are left alone.
 */
export function landingRedirectPath(pathname: string): string | null {
  if (pathname.endsWith('/')) return null;
  const lastSegment = pathname.slice(pathname.lastIndexOf('/') + 1);
  return lastSegment.includes('.') ? null : `${pathname}/`;
}

/**
 * The multi-page landing site at the root: directory URLs resolve to their `index.html`, and an
 * unknown URL answers 404 with the site's own `404.html` (there is no SPA fallback).
 */
function landingHandler() {
  const captured = httpRouter();
  registerStaticRoutes(captured, components.landing, { spaFallback: false });
  const route = captured.getRoutes().find(([path]) => path === '/*');
  if (!route) throw new Error('The landing static routes did not register a catch-all.');
  const serve = route[2] as unknown as StaticHandler;

  return httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const { pathname } = url;
    const directory = landingRedirectPath(pathname);
    if (directory) {
      return new Response(null, {
        status: 308,
        headers: { Location: `${directory}${url.search}` }
      });
    }
    const response = await serve._handler(
      ctx as never,
      withPath(request, landingFilePath(pathname))
    );
    if (response.status !== 404) return response;
    // Never revalidate 404.html: a 304 would be a bare body, and an ETag on the 404 would make
    // clients revalidate the missing URL against it.
    const notFound = await serve._handler(
      ctx as never,
      withPath(request, '/404.html', { revalidate: false })
    );
    if (notFound.status !== 200) return response;
    const headers = new Headers(notFound.headers);
    headers.delete('ETag');
    return new Response(notFound.body, { status: 404, headers });
  });
}

/**
 * Serve both frontends from this deployment's HTTP origin. Register after every app route: exact
 * paths and longer prefixes win, so these catch-alls only see what no endpoint claimed.
 */
export function registerSiteRoutes(http: HttpRouter) {
  registerStaticRoutes(http, components.web, { pathPrefix: WEB_APP_PATH_PREFIX });
  http.route({ pathPrefix: '/', method: 'GET', handler: landingHandler() });
}
