import { listSteps, type WorkflowId } from '@convex-dev/workflow';
import { components } from '#convex-generated/api';
import type { Doc } from '#convex-generated/dataModel';
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

/**
 * True once `run` is waiting and its workflow is parked on the open `awaitEvent` step. The turn
 * marks the run `waiting` before its step completes, and the workflow body only journals the
 * event step on its next pass; cancelling in between leaves that pass queued with a stale
 * generation, which logs "Invalid generation number" at an arbitrary later time.
 */
export async function isParked(
  test: ReturnType<typeof createTest>,
  run: Doc<'agentRuns'> | null
): Promise<boolean> {
  if (run?.status !== 'waiting' || !run.workflowId) return false;
  const steps = await test.run((ctx) =>
    listSteps(ctx, components.workflow, run.workflowId as WorkflowId, {
      order: 'desc',
      paginationOpts: { cursor: null, numItems: 1 }
    })
  );
  const last = steps.page[0];
  return last?.kind === 'event' && last.completedAt === undefined;
}
