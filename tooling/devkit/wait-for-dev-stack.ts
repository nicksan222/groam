import { localOrigins, localPorts } from './constants';
import { type FetchLike, isHttpOk, waitForHttp } from './http-readiness';
import {
  isConvexBackendResponding,
  resolveWaitTimeoutMs,
  waitForBackend
} from './wait-for-backend';

export type DevStackUrls = {
  dashboard: string;
  vite: string;
};

const defaultDevStackUrls = (): DevStackUrls => ({
  dashboard: `${localOrigins.dashboard}/`,
  vite: `${localOrigins.viteLoopback}/`
});

export const isDevStackResponding = async (
  backendUrl: string,
  urls: DevStackUrls = defaultDevStackUrls(),
  fetchTarget: FetchLike = fetch
) => {
  const [backend, vite] = await Promise.all([
    isConvexBackendResponding(backendUrl, fetchTarget),
    isHttpOk(urls.vite, fetchTarget)
  ]);
  return backend && vite;
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

  await waitForBackend(backendUrl, {
    fetchBackend: options.fetchBackend,
    now: options.now,
    sleep: options.sleep,
    timeoutMs: options.timeoutMs
  });
  await waitForHttp(urls.vite, {
    fetchTarget: options.fetchBackend,
    now: options.now,
    sleep: options.sleep,
    timeoutMs: options.timeoutMs
  });

  return {
    dashboardReady: await isHttpOk(urls.dashboard, options.fetchBackend ?? fetch)
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
