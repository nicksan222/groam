import { randomBytes } from 'node:crypto';
import { convex } from '#src/convex/cli';
import type { ReleaseTarget } from '#src/release/target';

/** Payments need their webhook secret before a release can enable them. */
export function assertPaymentEnvironment(names: ReadonlySet<string>): void {
  if (names.has('STRIPE_SECRET_KEY') && !names.has('STRIPE_WEBHOOK_SECRET'))
    throw new Error('Configure STRIPE_WEBHOOK_SECRET before enabling production payments.');
}

/**
 * Keeps the backend's auth settings in line with the committed environment: SITE_URL follows
 * the web origin, and BETTER_AUTH_SECRET is generated once. An existing secret is never replaced
 * or printed.
 */
export function syncBackendSettings(target: ReleaseTarget): void {
  const names = new Set(convex(['env', 'list', '--prod', '--names-only']).split(/\s+/u));
  assertPaymentEnvironment(names);
  if (
    !names.has('SITE_URL') ||
    convex(['env', 'get', 'SITE_URL', '--prod']).trim() !== target.siteUrl
  )
    convex(['env', 'set', 'SITE_URL', '--prod'], { input: target.siteUrl });
  if (!names.has('BETTER_AUTH_SECRET'))
    convex(['env', 'set', 'BETTER_AUTH_SECRET', '--prod'], {
      input: randomBytes(32).toString('base64url')
    });
}
