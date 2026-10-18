import { registerStaticRoutes } from '@convex-dev/static-hosting';
import {
  httpActionGeneric,
  httpRouter,
  type GenericActionCtx,
  type GenericDataModel,
  type HttpRouter,
  type PublicHttpAction
} from 'convex/server';

export type StaticHostingComponent = Parameters<typeof registerStaticRoutes>[1];
// registerStaticRoutes intentionally keeps the serving action private. Convex exposes its
// runtime handler even though the published PublicHttpAction type omits that internal field.
// Keep the version-pinned adapter in this file so all asset responses still come from the
// component's tested MIME, cache, ETag, storage, and CDN implementation.
type InvokableHttpAction = PublicHttpAction & {
  _handler: (ctx: GenericActionCtx<GenericDataModel>, request: Request) => Promise<Response>;
};

function staticHandler(
  component: StaticHostingComponent,
  options: Parameters<typeof registerStaticRoutes>[2]
): InvokableHttpAction {
  const router = httpRouter();
  registerStaticRoutes(router, component, options);
  const lookupPath = options?.pathPrefix ?? '/';
  const route = router.lookup(lookupPath, 'GET');
  if (!route) throw new Error(`Static hosting did not register ${lookupPath}`);
  return route[0] as InvokableHttpAction;
}

function encodeDecodedPath(path: string) {
  return path
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

function requestAtPath(request: Request, path: string, includeValidators = true) {
  const url = new URL(request.url);
  url.pathname = encodeDecodedPath(path);
  const headers = new Headers(request.headers);
  if (!includeValidators) headers.delete('If-None-Match');
  return new Request(url, { headers, method: request.method });
}

function decodePath(request: Request) {
  try {
    return decodeURIComponent(new URL(request.url).pathname);
  } catch {
    return null;
  }
}

function hasFileExtension(path: string) {
  const lastSegment = path.split('/').at(-1) ?? '';
  return lastSegment.includes('.') && !lastSegment.startsWith('.');
}

function localizedNotFoundPath(path: string) {
  return path === '/it' || path.startsWith('/it/') ? '/it/404/index.html' : '/404.html';
}

async function serveNotFound(
  handler: InvokableHttpAction,
  ctx: GenericActionCtx<GenericDataModel>,
  request: Request,
  path: string
) {
  const response = await handler._handler(
    ctx,
    requestAtPath(request, localizedNotFoundPath(path), false)
  );
  if (response.status !== 200) return response;
  return new Response(response.body, { headers: response.headers, status: 404 });
}

async function serveFilePath(
  handler: InvokableHttpAction,
  ctx: GenericActionCtx<GenericDataModel>,
  request: Request,
  path: string
) {
  const response = await handler._handler(ctx, request);
  return response.status === 404 && path.toLowerCase().endsWith('.html')
    ? await serveNotFound(handler, ctx, request, path)
    : response;
}

async function servePagePath({
  component,
  ctx,
  handler,
  path,
  request
}: {
  component: StaticHostingComponent;
  ctx: GenericActionCtx<GenericDataModel>;
  handler: InvokableHttpAction;
  path: string;
  request: Request;
}) {
  if (path.endsWith('/')) {
    const response = await handler._handler(ctx, requestAtPath(request, `${path}index.html`));
    return response.status === 404 ? await serveNotFound(handler, ctx, request, path) : response;
  }

  const exact = await handler._handler(ctx, request);
  if (exact.status !== 404) return exact;

  const asset = await ctx.runQuery(component.lib.resolveAssetForHttp, {
    path: `${path}/index.html`,
    spaFallback: false
  });
  if (!asset) return await serveNotFound(handler, ctx, request, path);

  const target = new URL(request.url);
  target.pathname = encodeDecodedPath(`${path}/`);
  return new Response(null, { headers: { Location: target.toString() }, status: 308 });
}

/** Register the pre-rendered marketing site at the deployment root. */
export function registerLandingStaticRoutes(router: HttpRouter, component: StaticHostingComponent) {
  const handler = staticHandler(component, { spaFallback: false });
  const landing = httpActionGeneric(async (ctx, request) => {
    const path = decodePath(request);
    if (path === null || path === '/') {
      return await handler._handler(ctx, request);
    }
    if (hasFileExtension(path)) {
      return await serveFilePath(handler, ctx, request, path);
    }
    return await servePagePath({ component, ctx, handler, path, request });
  });

  router.route({ pathPrefix: '/', method: 'GET', handler: landing });
}

/** Register an SPA below a path prefix and canonicalize its bare mount. */
export function registerSpaStaticRoutes(
  router: HttpRouter,
  component: StaticHostingComponent,
  pathPrefix: string
) {
  if (!pathPrefix.startsWith('/') || !pathPrefix.endsWith('/') || pathPrefix === '/') {
    throw new Error('The SPA path prefix must start and end with / and must not be the root');
  }
  const mountPath = pathPrefix.slice(0, -1);
  const handler = staticHandler(component, { pathPrefix, spaFallback: true });
  const redirect = httpActionGeneric(async (_ctx, request) => {
    const target = new URL(request.url);
    target.pathname = pathPrefix;
    return new Response(null, { headers: { Location: target.toString() }, status: 308 });
  });

  router.route({ path: mountPath, method: 'GET', handler: redirect });
  router.route({ pathPrefix, method: 'GET', handler });
}
