const defaultSleep = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

export const defaultWaitTimeoutMs = 180_000;
const defaultIntervalMs = 2_000;
const probeTimeoutMs = 750;

export type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;

export type WaitOptions = {
  intervalMs?: number;
  now?: () => number;
  sleep?: typeof defaultSleep;
  timeoutMs?: number;
};

export async function waitUntil(
  ready: () => boolean | Promise<boolean>,
  timeoutMessage: (timeoutMs: number) => string,
  options: WaitOptions = {}
): Promise<void> {
  const sleep = options.sleep ?? defaultSleep;
  const now = options.now ?? Date.now;
  const timeoutMs = options.timeoutMs ?? defaultWaitTimeoutMs;
  const intervalMs = options.intervalMs ?? defaultIntervalMs;
  const deadline = now() + timeoutMs;

  while (now() < deadline) {
    if (await ready()) return;
    await sleep(intervalMs);
  }

  throw new Error(timeoutMessage(timeoutMs));
}

export async function isHttpOk(targetUrl: string, fetchTarget: FetchLike = fetch) {
  if (!targetUrl) return false;
  try {
    const response = await fetchTarget(targetUrl, {
      signal: AbortSignal.timeout(probeTimeoutMs)
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function waitForHttp(
  targetUrl: string,
  options: WaitOptions & { fetchTarget?: FetchLike } = {}
): Promise<void> {
  await waitUntil(
    () => isHttpOk(targetUrl, options.fetchTarget),
    (timeoutMs) => `${targetUrl} did not become ready within ${timeoutMs}ms`,
    options
  );
}
