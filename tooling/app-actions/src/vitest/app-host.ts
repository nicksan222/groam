import { currentPath } from './queries';

/** What a journey's mounted app offers the driver: remounting it at another URL. */
export type AppHost = { open(path: string): Promise<void> };

let host: AppHost | undefined;

/** The app test setup registers how to (re)mount the app; the driver never imports app code. */
export function registerAppHost(next: AppHost): void {
  host = next;
}

function appHost(): AppHost {
  if (!host) throw new Error('No app host is registered; import @/testing/open-app first');
  return host;
}

/** A full page load of `path` (a path under the app or an absolute URL), keeping the session. */
export async function openAppPath(path: string): Promise<void> {
  const target = URL.canParse(path) ? new URL(path) : undefined;
  await appHost().open(
    target ? `${target.pathname}${target.search}${target.hash}` : `/${path.replace(/^\//u, '')}`
  );
}

/** Reloads the page: the app unmounts and mounts again at the same URL. */
export function reloadAppPage(): Promise<void> {
  return appHost().open(currentPath());
}
