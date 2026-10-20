type AssetBinding = { fetch(request: Request): Promise<Response> };

function isLandingPage(path: string): boolean {
  const lastSegment = path.split('/').at(-1) ?? '';
  return (
    !lastSegment.includes('.') ||
    lastSegment.startsWith('.') ||
    path.toLowerCase().endsWith('.html')
  );
}

function fallbackRequest(url: URL, request: Request): Request {
  const headers = new Headers(request.headers);
  // A fallback is a different representation: validators and byte ranges belong to the
  // originally requested resource and must not produce a 304 or partial error document.
  for (const name of ['If-None-Match', 'If-Modified-Since', 'Range', 'If-Range'])
    headers.delete(name);
  return new Request(url, { method: request.method, headers });
}

async function landingDirectoryRedirect(url: URL, assets: AssetBinding): Promise<Response | null> {
  if (url.pathname.endsWith('/')) return null;
  const indexUrl = new URL(url);
  indexUrl.pathname += '/index.html';
  const index = await assets.fetch(new Request(indexUrl, { method: 'HEAD' }));
  if (!index.ok) return null;
  const canonical = new URL(url);
  canonical.pathname += '/';
  return new Response(null, {
    status: 308,
    headers: { Location: `${canonical.pathname.replace(/^\/+/u, '/')}${canonical.search}` }
  });
}

/** Static routing only. Authentication, payments, and application data stay on Convex. */
export default {
  async fetch(request: Request, env: { ASSETS: AssetBinding }): Promise<Response> {
    if (!['GET', 'HEAD'].includes(request.method))
      return new Response(null, { status: 405, headers: { Allow: 'GET, HEAD' } });
    const url = new URL(request.url);
    if (url.pathname === '/app') {
      url.pathname = '/app/';
      return new Response(null, { status: 308, headers: { Location: `/app/${url.search}` } });
    }
    const assetUrl = new URL(url);
    if (assetUrl.pathname.endsWith('/')) assetUrl.pathname += 'index.html';
    const response = await env.ASSETS.fetch(new Request(assetUrl, request));
    if (response.status !== 404) return response;
    const isAppRoute =
      url.pathname.startsWith('/app/') && !url.pathname.split('/').at(-1)?.includes('.');
    if (isAppRoute) {
      url.pathname = '/app/index.html';
      return env.ASSETS.fetch(new Request(url, request));
    }
    const canonical = await landingDirectoryRedirect(url, env.ASSETS);
    if (canonical) return canonical;
    if (isLandingPage(url.pathname)) {
      url.pathname =
        url.pathname === '/it' || url.pathname.startsWith('/it/')
          ? '/it/404/index.html'
          : '/404.html';
      const page = await env.ASSETS.fetch(fallbackRequest(url, request));
      if (page.ok) return new Response(page.body, { status: 404, headers: page.headers });
    }
    return response;
  }
};
