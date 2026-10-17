import { ConvexError } from 'convex/values';
import { env } from '#convex-generated/server';

const localHosts = new Set(['127.0.0.1', '::1', '[::1]', 'localhost']);

export function isLocalDevelopmentUrl(value: string | undefined): boolean {
  if (value === undefined || value.length === 0) return false;
  try {
    const url = new URL(value);
    return (
      localHosts.has(url.hostname) &&
      (url.protocol === 'http:' || url.protocol === 'https:') &&
      url.username === '' &&
      url.password === ''
    );
  } catch {
    return false;
  }
}

/** True when this Convex deployment itself is local, not when the web app is. */
export function isLocalConvexSiteUrl(convexSiteUrl: string | undefined): boolean {
  return isLocalDevelopmentUrl(convexSiteUrl ?? 'http://127.0.0.1:3211');
}

/** True for anonymous local Convex, including convex-test where site URLs are unset. */
export function isLocalBackend(): boolean {
  return isLocalConvexSiteUrl(env.CONVEX_SITE_URL);
}

/** Seed and local-reset helpers must never run against a hosted Convex deployment. */
export function assertLocalDevelopment(): void {
  assertLocalSiteUrl(env.CONVEX_SITE_URL);
}

/** Only this deployment's own site URL counts; a spoofable web-app SITE_URL never does. */
export function assertLocalSiteUrl(convexSiteUrl: string | undefined): void {
  if (isLocalDevelopmentUrl(convexSiteUrl)) return;
  throw new ConvexError('This operation is only available in local development');
}
