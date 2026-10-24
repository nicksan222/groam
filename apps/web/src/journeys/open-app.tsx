import { arrange, forgetPreviousVisit, registerAppHost } from '@groam/app-actions/vitest';
import { authClient, resetAuthClientCache } from '@groam/auth/client';
import { env } from '@groam/env/web-client';
import { render } from '@groam/vitest-config/react';
import { ConvexReactClient } from 'convex/react';
import { onTestFinished } from 'vite-plus/test';
import { AppRoot } from '@/app-root';
import { JourneyPages } from '@/journeys/journey-pages';
import { settleWrites } from '@/journeys/settle-writes';
import { useAuthFormStore } from '@/lib/stores/auth-form-store';

let mounted: { app: Awaited<ReturnType<typeof render>>; client: ConvexReactClient } | undefined;

async function unmountApp(): Promise<void> {
  const current = mounted;
  mounted = undefined;
  if (!current) return;
  // A real reload sends what the page already wrote; closing the client would drop it instead.
  await settleWrites(current.client);
  await current.app.unmount();
  await current.client.close();
}

/**
 * Mounts the whole app at `path`, replacing any mounted app. The auth client outlives the mounted
 * app and only refetches for subscribers, so once the app subscribes it refetches what it cached,
 * as a page load that started it over would.
 */
async function mountApp(path: string): Promise<void> {
  await unmountApp();
  // A page load starts the auth form over; its store would otherwise outlive the remount.
  useAuthFormStore.getState().reset();
  history.replaceState(null, '', path);
  const client = new ConvexReactClient(env.convexUrl, { expectAuth: true });
  mounted = {
    app: await render(<JourneyPages root={(page) => <AppRoot client={client}>{page}</AppRoot>} />),
    client
  };
  resetAuthClientCache();
  onTestFinished(unmountApp);
}

// The driver reloads a page by mounting the app again.
registerAppHost({ open: mountApp });

/** Leaves the page and signs the browser out, so no mounted query outlives the session. */
async function leaveSession(): Promise<void> {
  await unmountApp();
  // A real sign-out also resets the auth client's in-memory session.
  await authClient.signOut();
  await forgetPreviousVisit();
}

/**
 * Signs in as this file's owner (or `as`) and mounts the whole app at `path`.
 * Calling it again with another `as` switches the person using the browser.
 */
export async function openApp(
  path = '/trips',
  options: { as?: { email: string; password: string } } = {}
): Promise<void> {
  const account = await arrange.account();
  const credentials = options.as ?? account.credentials;
  const { data: current } = await authClient.getSession();
  // Someone returning to the app stays signed in; switching people signs the browser out first.
  if (current?.user.email !== credentials.email) {
    await leaveSession();
    const { error } = await authClient.signIn.email({
      email: credentials.email,
      password: credentials.password
    });
    if (error) throw new Error(`Signing in as ${credentials.email} failed: ${error.message}`);
  }
  // A new session has no active group until one is opened, which the app only does from the
  // trip list; sign-in through the API skips that, and a deep link needs it from the start.
  await authClient.organization.setActive({ organizationId: account.organizationId });
  await mountApp(path);
}

/** Mounts the whole app with nobody signed in, as a visitor sees it. */
export async function openSignedOutApp(path = '/'): Promise<void> {
  await leaveSession();
  await mountApp(path);
}
