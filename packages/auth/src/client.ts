import { env } from '@groam/env/auth-client';
import { createGroamAuthClient } from './client-factory';

export const authClient = createGroamAuthClient(env.convexSiteUrl);

export type AuthClient = typeof authClient;

/**
 * Makes the shared client fetch the session and group data again instead of serving what it
 * cached. A page load does this by starting over; tests that remount the app in one page need it.
 */
export function resetAuthClientCache(): void {
  for (const signal of ['$sessionSignal', '$activeOrgSignal', '$listOrg']) {
    authClient.$store.notify(signal);
  }
}
