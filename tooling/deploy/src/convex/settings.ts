import { randomBytes } from 'node:crypto';
import type { VariableName } from '@groam/env/deployment';
import { convex } from '#src/convex/cli';
import type { ReleaseTarget } from '#src/release/target';

const SITE_URL = 'SITE_URL' satisfies VariableName<'convex'>;
const BETTER_AUTH_SECRET = 'BETTER_AUTH_SECRET' satisfies VariableName<'convex'>;

/**
 * Keeps the backend's auth settings in line with the committed environment: SITE_URL follows
 * the web origin, and BETTER_AUTH_SECRET is generated once. An existing secret is never replaced
 * or printed.
 */
export function syncBackendSettings(target: ReleaseTarget): void {
  const names = new Set(convex(['env', 'list', '--prod', '--names-only']).split(/\s+/u));
  if (!names.has(SITE_URL) || convex(['env', 'get', SITE_URL, '--prod']).trim() !== target.siteUrl)
    convex(['env', 'set', SITE_URL, '--prod'], { input: target.siteUrl });
  if (!names.has(BETTER_AUTH_SECRET))
    convex(['env', 'set', BETTER_AUTH_SECRET, '--prod'], {
      input: randomBytes(32).toString('base64url')
    });
}
