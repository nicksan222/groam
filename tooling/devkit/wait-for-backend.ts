import { env } from '@groam/env/convex-tooling';
import { localOrigins } from './constants';
import {
  defaultWaitTimeoutMs,
  type FetchLike,
  type WaitOptions,
  waitUntil
} from './http-readiness';

const probeTimeoutMs = 750;

export type WaitForBackendOptions = WaitOptions & {
  extraReady?: () => boolean | Promise<boolean>;
  fetchBackend?: FetchLike;
};

export const isConvexBackendResponding = async (
  backendUrl: string,
  fetchBackend: FetchLike = fetch
) => {
  if (!backendUrl) return false;

  try {
    const response = await fetchBackend(new URL('/instance_name', backendUrl), {
      signal: AbortSignal.timeout(probeTimeoutMs)
    });
    return response.ok && (await response.text()).trim().length > 0;
  } catch {
    return false;
  }
};

export type WaitTimeoutEnvironment = {
  readyTimeoutSeconds?: number;
  startupTimeoutMs?: number;
};

export const resolveWaitTimeoutMs = (values: WaitTimeoutEnvironment = env) => {
  const startupTimeoutMs = values.startupTimeoutMs ?? 0;
  if (Number.isFinite(startupTimeoutMs) && startupTimeoutMs > 0) {
    return startupTimeoutMs;
  }

  const readyTimeoutSeconds = values.readyTimeoutSeconds ?? 0;
  if (Number.isFinite(readyTimeoutSeconds) && readyTimeoutSeconds > 0) {
    return readyTimeoutSeconds * 1_000;
  }

  return defaultWaitTimeoutMs;
};

export const waitForBackend = async (backendUrl: string, options: WaitForBackendOptions = {}) => {
  const fetchBackend = options.fetchBackend ?? fetch;
  await waitUntil(
    async () => {
      if (!(await isConvexBackendResponding(backendUrl, fetchBackend))) return false;
      return !options.extraReady || (await options.extraReady());
    },
    (timeoutMs) => `Convex backend did not become ready within ${timeoutMs}ms`,
    options
  );
};

const parseCliUrl = (args: string[]) => {
  const urlFlag = args.indexOf('--url');
  if (urlFlag !== -1 && args[urlFlag + 1]) {
    return args[urlFlag + 1];
  }
  return localOrigins.convexApi;
};

const parseCliTimeoutMs = (args: string[]) => {
  const timeoutFlag = args.indexOf('--timeout-ms');
  if (timeoutFlag !== -1 && args[timeoutFlag + 1]) {
    const parsed = Number(args[timeoutFlag + 1]);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return resolveWaitTimeoutMs();
};

if (import.meta.main) {
  const args = process.argv.slice(2);
  try {
    await waitForBackend(parseCliUrl(args), { timeoutMs: parseCliTimeoutMs(args) });
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
