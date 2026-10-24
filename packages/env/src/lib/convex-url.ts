const LOCAL_CONVEX_PORT_OFFSET = 1;

/** Resolve the HTTP-action origin paired with a Convex realtime deployment. */
export function resolveConvexSiteUrl(cloudUrl: string, configuredSiteUrl = ''): string {
  if (configuredSiteUrl) return new URL(configuredSiteUrl).origin;

  const url = new URL(cloudUrl);
  if (url.hostname.endsWith('.convex.cloud')) {
    url.hostname = url.hostname.replace(/\.convex\.cloud$/u, '.convex.site');
    url.pathname = '/';
    url.search = '';
    url.hash = '';
    return url.origin;
  }

  if (
    (url.hostname === '127.0.0.1' || url.hostname === 'localhost') &&
    url.port !== '' &&
    Number.isInteger(Number(url.port))
  ) {
    url.port = String(Number(url.port) + LOCAL_CONVEX_PORT_OFFSET);
    return url.origin;
  }

  throw new Error('VITE_CONVEX_SITE_URL is required for a nonstandard Convex deployment URL');
}
