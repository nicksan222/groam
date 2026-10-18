import {
  httpActionGeneric,
  httpRouter,
  type GenericActionCtx,
  type GenericDataModel,
  type PublicHttpAction
} from 'convex/server';
import { expect, test } from 'vite-plus/test';
import {
  registerLandingStaticRoutes,
  registerSpaStaticRoutes,
  type StaticHostingComponent
} from './hosting';

const component = {
  lib: { resolveAssetForHttp: 'staticHosting:resolveAssetForHttp' }
} as unknown as StaticHostingComponent;

type InvokableHttpAction = PublicHttpAction & {
  _handler: (ctx: GenericActionCtx<GenericDataModel>, request: Request) => Promise<Response>;
};

type Asset = {
  body: string;
  contentType?: string;
  etag?: string;
};

function testContext(assets: Record<string, Asset>) {
  return {
    runQuery: async (_reference: unknown, args: { path: string; spaFallback?: boolean }) => {
      let path = args.path;
      if (!(path in assets) && args.spaFallback && !path.split('/').at(-1)?.includes('.')) {
        path = '/index.html';
      }
      const asset = assets[path];
      if (!asset) return null;
      return {
        appStorageId: path,
        contentType: asset.contentType ?? 'text/html; charset=utf-8',
        etag: asset.etag ?? `"${path}"`
      };
    },
    storage: {
      get: async (id: string) => {
        const asset = assets[id];
        return asset ? new Blob([asset.body], { type: asset.contentType }) : null;
      }
    }
  } as unknown as GenericActionCtx<GenericDataModel>;
}

async function fetchRoute(
  router: ReturnType<typeof httpRouter>,
  path: string,
  assets: Record<string, Asset>,
  init?: RequestInit
) {
  const request = new Request(`https://groam.convex.site${path}`, init);
  const route = router.lookup(new URL(request.url).pathname, 'GET');
  if (!route) throw new Error(`No GET route for ${path}`);
  return await (route[0] as InvokableHttpAction)._handler(testContext(assets), request);
}

function landingRouter() {
  const router = httpRouter();
  registerLandingStaticRoutes(router, component);
  return router;
}

test('landing serves its root index', async () => {
  const response = await fetchRoute(landingRouter(), '/', {
    '/index.html': { body: '<h1>Plan your next trip</h1>' }
  });

  expect(response.status).toBe(200);
  expect(await response.text()).toContain('Plan your next trip');
});

test('landing serves directory indexes with the component response headers', async () => {
  const response = await fetchRoute(landingRouter(), '/about/', {
    '/about/index.html': {
      body: '<h1>About Groam</h1>',
      etag: '"about-v1"'
    }
  });

  expect(response.status).toBe(200);
  expect(response.headers.get('Content-Type')).toBe('text/html; charset=utf-8');
  expect(response.headers.get('Cache-Control')).toBe('public, max-age=0, must-revalidate');
  expect(response.headers.get('ETag')).toBe('"about-v1"');
  expect(await response.text()).toContain('About Groam');
});

test('landing redirects known extensionless pages to a query-preserving slash URL', async () => {
  const response = await fetchRoute(landingRouter(), '/about?from=nav', {
    '/about/index.html': { body: '<h1>About</h1>' }
  });

  expect(response.status).toBe(308);
  expect(response.headers.get('Location')).toBe('https://groam.convex.site/about/?from=nav');
});

test('landing serves the localized Italian 404 document with status 404', async () => {
  const response = await fetchRoute(landingRouter(), '/it/non-esiste', {
    '/it/404/index.html': { body: '<h1>Pagina non trovata</h1>', etag: '"it-404"' }
  });

  expect(response.status).toBe(404);
  expect(response.headers.get('Content-Type')).toBe('text/html; charset=utf-8');
  expect(response.headers.get('Cache-Control')).toBe('public, max-age=0, must-revalidate');
  expect(response.headers.get('ETag')).toBe('"it-404"');
  expect(await response.text()).toContain('Pagina non trovata');
});

test('landing serves the default 404 document for unknown directory paths', async () => {
  const response = await fetchRoute(landingRouter(), '/missing/', {
    '/404.html': { body: '<h1>Page not found</h1>' }
  });

  expect(response.status).toBe(404);
  expect(await response.text()).toContain('Page not found');
});

test('landing serves the default 404 document for an unknown explicit HTML path', async () => {
  const response = await fetchRoute(landingRouter(), '/missing.html', {
    '/404.html': { body: '<h1>Page not found</h1>' }
  });

  expect(response.status).toBe(404);
  expect(response.headers.get('Content-Type')).toBe('text/html; charset=utf-8');
  expect(await response.text()).toContain('Page not found');
});

test('landing leaves missing asset requests as plain 404 responses', async () => {
  const response = await fetchRoute(landingRouter(), '/assets/missing.js', {
    '/404.html': { body: '<h1>Page not found</h1>' }
  });

  expect(response.status).toBe(404);
  expect(response.headers.get('Content-Type')).toBe('text/plain');
  expect(await response.text()).toBe('Not Found');
});

test('landing rejects malformed URL encoding', async () => {
  const response = await fetchRoute(landingRouter(), '/bad%ZZpath', {});

  expect(response.status).toBe(400);
  expect(await response.text()).toBe('Bad Request');
});

test('landing decodes each path segment exactly once when mapping directory indexes', async () => {
  const response = await fetchRoute(landingRouter(), '/docs%252Fguide/', {
    '/docs%2Fguide/index.html': { body: '<h1>Literal encoded slash</h1>' },
    '/docs/guide/index.html': { body: '<h1>Wrong nested page</h1>' }
  });

  expect(response.status).toBe(200);
  expect(await response.text()).toContain('Literal encoded slash');
});

test('SPA redirects its bare mount and falls back only below /app/', async () => {
  const router = httpRouter();
  registerSpaStaticRoutes(router, component, '/app/');
  const assets = {
    '/index.html': { body: '<div id="app">Groam</div>' },
    '/404.html': { body: '<h1>Landing 404</h1>' }
  };

  const bare = await fetchRoute(router, '/app?from=login', assets);
  expect(bare.status).toBe(308);
  expect(bare.headers.get('Location')).toBe('https://groam.convex.site/app/?from=login');

  const settings = await fetchRoute(router, '/app/settings', assets);
  expect(settings.status).toBe(200);
  expect(await settings.text()).toContain('id="app"');

  const asset = await fetchRoute(router, '/app/assets/missing.js', assets);
  expect(asset.status).toBe(404);
  expect(await asset.text()).toBe('Not Found');
});

test('exact application routes stay ahead of the landing catch-all', async () => {
  const router = httpRouter();
  const auth = httpActionGeneric(async () => new Response('auth'));
  router.route({ path: '/api/auth/session', method: 'GET', handler: auth });
  registerLandingStaticRoutes(router, component);

  const response = await fetchRoute(router, '/api/auth/session', {
    '/404.html': { body: '<h1>Page not found</h1>' }
  });

  expect(response.status).toBe(200);
  expect(await response.text()).toBe('auth');
});
