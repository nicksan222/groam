import type { createTest } from '#testing/factory';

/**
 * Workflows advance through scheduled functions. With real timers convex-test runs them on its
 * own; this polls until `predicate` holds. Deadlines hours away never fire inside the window, so
 * deadline tests call the expiry mutation directly.
 */
export async function runUntil(
  test: ReturnType<typeof createTest>,
  predicate: () => Promise<boolean>,
  timeoutMs = 10_000
): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    await test.finishInProgressScheduledFunctions();
    if (await predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error('Workflow did not settle in time');
}
