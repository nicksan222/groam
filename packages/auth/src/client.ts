import { env } from '@groam/env/auth-client';
import { createGroamAuthClient } from './client-factory';

export const authClient = createGroamAuthClient(env.convexSiteUrl);

export type AuthClient = typeof authClient;

/**
 * Makes the shared client fetch the session and group data again instead of serving what it
 * cached. A page load does this by starting over; only tests that remount the app in one page
 * need it, since Better Auth already refreshes the session after its own auth requests.
 */
export function resetAuthClientCache(): void {
  for (const signal of ['$sessionSignal', '$activeOrgSignal', '$listOrg']) {
    authClient.$store.notify(signal);
  }
}
