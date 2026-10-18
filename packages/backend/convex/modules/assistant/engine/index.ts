import { cancel, getStatus, start, type WorkflowId } from '@convex-dev/workflow';
import { components, internal } from '#convex-generated/api';
import type { Doc, Id } from '#convex-generated/dataModel';
import type { MutationCtx } from '#convex-generated/server';
import { AgentWaits } from '#convex/modules/assistant/waits/index';

/**
 * Whether a workflow may take the run: queued, or a chat turn `respond` already marked running.
 * A running standalone run without a workflow is an inline review, which must not run twice.
 */
function startable(run: Doc<'agentRuns'>): boolean {
  if (run.workflowId) return false;
  return run.status === 'queued' || (run.status === 'running' && run.surface === 'chat');
}

/** Idempotent: no-op when the run already has a workflow or another path owns it. */
async function startRun(ctx: MutationCtx, runId: Id<'agentRuns'>): Promise<null> {
  const run = await ctx.db.get('agentRuns', runId);
  if (!run || !startable(run)) return null;
  const workflowId = await start(
    ctx,
    internal.modules.assistant.engine.workflow.agentRun,
    { runId },
    { context: { runId }, onComplete: internal.modules.assistant.engine.functions.onComplete }
  );
  await ctx.db.patch('agentRuns', runId, { updatedAt: Date.now(), workflowId });
  return null;
}

/**
 * Cancels the workflow if it is still in progress (a finished one already reported through
 * `onComplete`). An in-flight turn action keeps running and then sees the aborted status.
 */
async function cancelRun(ctx: MutationCtx, run: Doc<'agentRuns'>): Promise<null> {
  // Stopping is final: the wait closes without resuming the run.
  if (run.activeWaitId) {
    await AgentWaits.cancel(ctx, {
      notify: false,
      reason: 'the run was stopped',
      waitId: run.activeWaitId
    });
  }
  if (!run.workflowId) return null;
  const workflowId = run.workflowId as WorkflowId;
  const status = await getStatus(ctx, components.workflow, workflowId);
  if (status.type !== 'inProgress') return null;
  await cancel(ctx, components.workflow, workflowId);
  return null;
}

/** Lifecycle of agent runs as durable workflows. */
// oxlint-disable-next-line unicorn/no-static-only-class -- callers use this class, not loose functions
export class AgentEngine {
  static cancel = cancelRun;
  static start = startRun;
}
