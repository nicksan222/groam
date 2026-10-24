import type { FunctionReference } from 'convex/server';
import { afterEach, describe, expect, test, vi } from 'vite-plus/test';
import { components } from '#convex-generated/api';
import http from '#convex/http';
import { createTest } from '#testing/factory';
import { landingFilePath, landingRedirectPath } from './site';

test.each([
  ['/', '/index.html'],
  ['/pricing/', '/pricing/index.html'],
  ['/it/pricing/', '/it/pricing/index.html'],
  ['/pricing', '/pricing/index.html'],
  ['/_astro/app.abc123.css', '/_astro/app.abc123.css'],
  ['/sitemap.xml', '/sitemap.xml']
])('the landing URL %s is the file %s', (pathname, file) => {
  expect(landingFilePath(pathname)).toBe(file);
});

/** The label of the route a request reaches (its pattern), or null when none does. */
const routed = (path: string, method: 'GET' | 'POST' = 'GET') =>
  http.lookup(path, method)?.[2] ?? null;

test('app endpoints keep their URLs ahead of the frontend catch-alls', () => {
  const landing = routed('/anything/');
  const web = routed('/app/trips/abc');
  expect(landing).not.toBeNull();
  expect(web).not.toBeNull();
  expect(web).not.toBe(landing);
  expect(landing).toBe('/*');
  expect(web).toBe('/app/*');
  expect(routed('/app')).toBe('/app');
  expect(routed('/app/')).toBe('/app/*');
  for (const [path, method] of [
    ['/api/auth/get-session', 'GET'],
    ['/api/auth/sign-in/email', 'POST'],
    ['/payments/webhook', 'POST'],
    ['/auth/chatgpt/callback', 'GET']
  ] as const) {
    const route = routed(path, method);
    expect(route, `${method} ${path}`).not.toBeNull();
    expect(route).not.toBe(landing);
    expect(route).not.toBe(web);
  }
});

test('only GET reaches the frontends', () => {
  expect(routed('/pricing/', 'POST')).toBeNull();
  expect(routed('/app/', 'POST')).toBeNull();
});

/** The component's seeding mutation: internal, so absent from its public `ComponentApi` type. */
const landing = components.landing.lib as unknown as {
  recordAsset: FunctionReference<
    'mutation',
    'internal',
    { path: string; storageId: string; contentType: string; deploymentId: string }
  >;
};

describe('the landing site', () => {
  afterEach(() => vi.unstubAllGlobals());

  const html = (title: string) => `<!doctype html><title>${title}</title>`;

  /**
   * Convex storage URLs are not reachable in tests, so the handler's fetch of a stored file is
   * answered from the files seeded here.
   */
  async function seed(files: Record<string, string>) {
    const t = createTest();
    const bodies = new Map<string, string>();
    for (const [path, body] of Object.entries(files)) {
      const storageId = await t.run((ctx) =>
        ctx.storage.store(new Blob([body], { type: 'text/html' }))
      );
      bodies.set(storageId, body);
      await t.run((ctx) =>
        ctx.runMutation(landing.recordAsset, {
          path,
          storageId,
          contentType: 'text/html; charset=utf-8',
          deploymentId: 'deploy-1'
        })
      );
    }
    vi.stubGlobal('fetch', async (input: string | URL | Request) => {
      const id =
        String(input instanceof Request ? input.url : input)
          .split('/')
          .pop() ?? '';
      const body = bodies.get(id);
      return body === undefined ? new Response('missing', { status: 404 }) : new Response(body);
    });
    return t;
  }

  test('serves a directory URL from its index.html', async () => {
    const t = await seed({ '/index.html': html('home'), '/x/index.html': html('x') });
    const response = await t.fetch('/x/');
    expect(response.status).toBe(200);
    expect(await response.text()).toContain('<title>x</title>');
  });

  test('answers a missing page with the 404.html body and status 404', async () => {
    const t = await seed({ '/index.html': html('home'), '/404.html': html('lost') });
    const response = await t.fetch('/nope/');
    expect(response.status).toBe(404);
    expect(response.headers.get('ETag')).toBeNull();
    expect(await response.text()).toContain('<title>lost</title>');
  });

  test('a revalidating client still gets the HTML 404', async () => {
    const t = await seed({ '/index.html': html('home'), '/404.html': html('lost') });
    const etag = (await t.fetch('/404.html')).headers.get('ETag');
    expect(etag).toBeTruthy();
    const response = await t.fetch('/nope/', { headers: { 'If-None-Match': etag! } });
    expect(response.status).toBe(404);
    expect(await response.text()).toContain('<title>lost</title>');
  });

  test('redirects a directory URL without its trailing slash, keeping the query', async () => {
    const t = await seed({ '/pricing/index.html': html('pricing') });
    const response = await t.fetch('/pricing?plan=pro', { redirect: 'manual' });
    expect(response.status).toBe(308);
    expect(response.headers.get('Location')).toBe('/pricing/?plan=pro');
  });
});

test.each([
  ['/pricing', '/pricing/'],
  ['/it/pricing', '/it/pricing/'],
  ['/', null],
  ['/pricing/', null],
  ['/sitemap.xml', null]
])('the landing path %s redirects to %s', (pathname, target) => {
  expect(landingRedirectPath(pathname)).toBe(target);
});
