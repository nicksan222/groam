import { env } from '#convex-generated/server';

/** Better Auth's own origin: the deployment's HTTP actions, or the local backend's. */
export const resolveAuthBaseUrl = () => env.CONVEX_SITE_URL ?? 'http://127.0.0.1:3211';

/** The frontend origin that auth links and passkeys belong to. */
export const resolveAuthSiteUrl = () => env.SITE_URL ?? resolveAuthBaseUrl();

/**
 * A page of the frontend, kept under the site's own path (a hosted app lives at `<origin>/app`).
 * Client `callbackURL`s must be absolute (built from this or the app's base URL): a relative one
 * resolves against the origin and loses the `/app` prefix.
 */
export function authSiteLink(path: string, siteUrl: string) {
  const site = new URL(siteUrl);
  const base = `${site.origin}${site.pathname.replace(/\/$/u, '')}/`;
  return new URL(path.replace(/^\//u, ''), base).href;
}
