import { localOrigins, localPorts } from './constants';
import { type FetchLike, isHttpOk, waitUntil } from './http-readiness';
import { isConvexBackendResponding, resolveWaitTimeoutMs } from './wait-for-backend';

export type DevStackUrls = {
  auth: string;
  dashboard: string;
  vite: string;
};

const defaultDevStackUrls = (): DevStackUrls => ({
  auth: `${localOrigins.convexSite}/api/auth/get-session`,
  dashboard: `${localOrigins.dashboard}/`,
  vite: `${localOrigins.viteLoopback}/`
});

export const isDevStackResponding = async (
  backendUrl: string,
  urls: DevStackUrls = defaultDevStackUrls(),
  fetchTarget: FetchLike = fetch
) => {
  const [auth, backend, vite] = await Promise.all([
    isHttpOk(urls.auth, fetchTarget),
    isConvexBackendResponding(backendUrl, fetchTarget),
    isHttpOk(urls.vite, fetchTarget)
  ]);
  return auth && backend && vite;
};

export const waitForDevStack = async (
  backendUrl: string,
  options: {
    fetchBackend?: FetchLike;
    now?: () => number;
    sleep?: (milliseconds: number) => Promise<unknown>;
    timeoutMs?: number;
    urls?: DevStackUrls;
  } = {}
) => {
  const urls = options.urls ?? defaultDevStackUrls();
  const fetchTarget = options.fetchBackend ?? fetch;

  await waitUntil(
    () => isDevStackResponding(backendUrl, urls, fetchTarget),
    (timeoutMs) => `Dev stack did not become ready within ${timeoutMs}ms`,
    options
  );

  return {
    dashboardReady: await isHttpOk(urls.dashboard, fetchTarget)
  };
};

if (import.meta.main) {
  const args = process.argv.slice(2);
  const once = args.includes('--once');
  const backendUrl = localOrigins.convexApi;
  const urls = defaultDevStackUrls();

  try {
    if (once) {
      if (!(await isDevStackResponding(backendUrl, urls))) {
        process.exit(1);
      }
    } else {
      const { dashboardReady } = await waitForDevStack(backendUrl, {
        timeoutMs: resolveWaitTimeoutMs()
      });
      const dashboardNote = dashboardReady
        ? `dashboard :${localPorts.dashboard}`
        : `dashboard :${localPorts.dashboard} (starting)`;
      console.info(
        `Dev stack is ready — Convex :${localPorts.convexApi}, web :${localPorts.web}, ${dashboardNote}.`
      );
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
