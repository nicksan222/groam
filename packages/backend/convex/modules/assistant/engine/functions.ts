import { vResultValidator, vWorkflowId } from '@convex-dev/workflow';
import { ConvexError, v } from 'convex/values';
import type { Doc } from '#convex-generated/dataModel';
import { internalMutation, internalQuery, type MutationCtx } from '#convex-generated/server';
import { aiRateLimiter } from '#convex/modules/ai/limits';
import { AgentEngine } from '#convex/modules/assistant/engine/index';
import {
  RUN_EXHAUSTED_ERROR,
  RUN_STALLED_ERROR,
  type RunOutcome
} from '#convex/modules/assistant/engine/schema';
import { AssistantErrors } from '#convex/modules/assistant/errors/index';
import { AgentRuns } from '#convex/modules/assistant/runs/index';
import { AgentRunValidators } from '#convex/modules/assistant/runs/schema';
import { assistantScreenValidator } from '#convex/modules/assistant/validators/index';
import { conditionLabel } from '#convex/modules/assistant/waits/conditions/index';
import { AgentWaits } from '#convex/modules/assistant/waits/index';
import { requireWorkspace } from '#convex/modules/auth/workspace';
import { Discussions } from '#convex/modules/discussions/threads/index';

/** queued|running → running. Null when the run was stopped or already finished. */
export const claimTurn = internalMutation({
  args: { runId: v.id('agentRuns') },
  returns: v.union(AgentRunValidators.run, v.null()),
  handler: async (ctx, { runId }) => {
    const claimed = await AgentRuns.claimTurn(ctx, runId);
    return claimed ? AgentRuns.presentRun(claimed) : null;
  }
});

/** Chat turns need the stored screen and prompt, which the run view does not expose. */
export const turnContext = internalQuery({
  args: { runId: v.id('agentRuns') },
  returns: v.object({
    promptMessageId: v.union(v.string(), v.null()),
    screen: v.union(assistantScreenValidator, v.null())
  }),
  handler: async (ctx, { runId }) => {
    const run = await ctx.db.get('agentRuns', runId);
    return {
      promptMessageId: run?.promptMessageId ?? null,
      screen: run?.screen ?? null
    };
  }
});

/** Stores the reply text so `onComplete` can finish the run and the discussion request. */
export const recordReply = internalMutation({
  args: { runId: v.id('agentRuns'), text: v.string() },
  returns: v.null(),
  handler: async (ctx, { runId, text }) => {
    await ctx.db.patch('agentRuns', runId, { report: text, updatedAt: Date.now() });
    return null;
  }
});

/**
 * The turn ended with an active wait: mark the run `waiting`, complete the chat request so the
 * thread is not stuck "responding", and hand the event id to the workflow. Null when the run did
 * not call `waitFor` or was stopped meanwhile.
 */
export const suspend = internalMutation({
  args: { runId: v.id('agentRuns') },
  returns: v.union(v.object({ eventId: v.string() }), v.null()),
  handler: async (ctx, { runId }) => {
    const run = await ctx.db.get('agentRuns', runId);
    if (!run?.activeWaitId || run.status !== 'running') return null;
    const wait = await ctx.db.get('agentWaits', run.activeWaitId);
    if (!wait) return null;
    const label = await conditionLabel(ctx, wait.condition);
    if (run.discussionId && run.promptMessageId) {
      await Discussions.finishAssistantResponse(ctx, {
        discussionId: run.discussionId,
        expectedUpdatedAt: run.discussionUpdatedAt ?? 0,
        finishRun: false,
        promptMessageId: run.promptMessageId,
        responseText: run.report?.trim() || `Waiting for ${label}.`,
        runId
      });
    }
    await ctx.db.patch('agentRuns', runId, {
      headline: `Waiting for ${label}`,
      // The request is answered; a resumed turn prompts with its own hidden note.
      promptMessageId: undefined,
      status: 'waiting',
      updatedAt: Date.now()
    });
    return { eventId: wait.eventId };
  }
});

function outcomeOf(result: {
  kind: 'canceled' | 'failed' | 'success';
  error?: string;
  returnValue?: unknown;
}): RunOutcome {
  if (result.kind === 'success') return result.returnValue as RunOutcome;
  if (result.kind === 'canceled') return { kind: 'aborted' };
  console.error('agent run workflow failed:', result.error);
  return { error: RUN_STALLED_ERROR, kind: 'failed' };
}

function terminalOf(outcome: RunOutcome): {
  error?: string;
  status: 'aborted' | 'complete' | 'failed';
} {
  switch (outcome.kind) {
    case 'done':
      return { status: 'complete' };
    case 'aborted':
      return { status: 'aborted' };
    case 'exhausted':
      return { error: RUN_EXHAUSTED_ERROR, status: 'failed' };
    case 'failed':
      return { error: outcome.error, status: 'failed' };
  }
}

/** A stale re-claim started a newer run for the same prompt; that run owns the request now. */
async function superseded(ctx: MutationCtx, run: Doc<'agentRuns'>): Promise<boolean> {
  const { discussionId, promptMessageId } = run;
  if (!discussionId) return false;
  const running = await ctx.db
    .query('agentRuns')
    .withIndex('by_discussionId_and_status_and_updatedAt', (query) =>
      query.eq('discussionId', discussionId).eq('status', 'running')
    )
    .order('desc')
    .take(20);
  return running.some(
    (other) => other._id !== run._id && other.promptMessageId === promptMessageId
  );
}

/**
 * The chat side of a finished run. A first turn finishes the request it answers; a resumed turn
 * (its request was answered when it suspended) posts its reply as the chat's last message.
 */
async function finishDiscussionTurn(
  ctx: MutationCtx,
  run: Doc<'agentRuns'>,
  { error, status }: ReturnType<typeof terminalOf>
): Promise<void> {
  const { discussionId, promptMessageId } = run;
  if (!discussionId || run.researchTask) return;
  if (promptMessageId) {
    if (await superseded(ctx, run)) return;
    await Discussions.finishAssistantResponse(ctx, {
      discussionId,
      error,
      expectedUpdatedAt: run.discussionUpdatedAt ?? 0,
      promptMessageId,
      responseText: status === 'complete' ? (run.report ?? '') : null,
      runId: run._id
    });
    return;
  }
  if (status !== 'complete' || !run.report) return;
  await Discussions.recordAssistantReply(ctx, {
    agentId: run.agentId,
    discussionId,
    expectedUpdatedAt: run.discussionUpdatedAt ?? 0,
    text: run.report
  });
}

/** The single writer of a run's terminal status. */
export const onComplete = internalMutation({
  args: {
    context: v.object({ runId: v.id('agentRuns') }),
    result: vResultValidator,
    workflowId: vWorkflowId
  },
  returns: v.null(),
  handler: async (ctx, { context, result }) => {
    const run = await ctx.db.get('agentRuns', context.runId);
    if (!run) return null;
    const { error, status } = terminalOf(outcomeOf(result));
    // A run that ends (stopped, failed, turn limit) never resumes: close its wait silently.
    if (run.activeWaitId) {
      await AgentWaits.cancel(ctx, {
        notify: false,
        reason: 'the run ended',
        waitId: run.activeWaitId
      });
    }
    await finishDiscussionTurn(ctx, run, { error, status });
    // Idempotent: a no-op once the discussion finish wrote it, and the only write when the
    // discussion or its request is gone or was re-claimed.
    await AgentRuns.finish(ctx, {
      runId: run._id,
      status,
      ...(error ? { error } : {}),
      ...(status === 'complete' && run.report ? { report: run.report } : {})
    });
    return null;
  }
});

/** The agent monitor's start for a queued standalone run, as the signed-in caller. */
export const startStandalone = internalMutation({
  args: { runId: v.id('agentRuns') },
  returns: v.null(),
  handler: async (ctx, { runId }) => {
    const workspace = await requireWorkspace(ctx);
    const stored = await ctx.db.get('agentRuns', runId);
    if (!stored || stored.organizationId !== workspace.organizationId) {
      throw new ConvexError('Agent run not found');
    }
    if (stored.surface !== 'standalone') {
      throw new ConvexError('Only standalone runs start from the agent monitor');
    }
    if (stored.workflowId) return null;
    try {
      await aiRateLimiter.limit(ctx, 'tripAssistantMessage', {
        key: workspace.tokenIdentifier,
        throws: true
      });
    } catch (error: unknown) {
      throw new ConvexError(AssistantErrors.message(error));
    }
    return await AgentEngine.start(ctx, runId);
  }
});

/**
 * Claims a queued run for an inline turn (manual idea review, which answers its caller
 * directly). Never claims a run a workflow owns, so the two paths cannot run the same turn.
 */
export const claimInline = internalMutation({
  args: { runId: v.id('agentRuns') },
  returns: v.union(AgentRunValidators.run, v.null()),
  handler: async (ctx, { runId }) => {
    const run = await ctx.db.get('agentRuns', runId);
    if (run?.status !== 'queued' || run.workflowId) return null;
    const claimed = await AgentRuns.claimTurn(ctx, runId);
    return claimed ? AgentRuns.presentRun(claimed) : null;
  }
});

/** Terminal write for an inline turn; workflow runs finish in `onComplete` instead. */
export const finishInline = internalMutation({
  args: {
    error: v.optional(v.string()),
    report: v.optional(v.string()),
    runId: v.id('agentRuns'),
    status: v.union(v.literal('complete'), v.literal('failed'), v.literal('aborted'))
  },
  returns: v.null(),
  handler: (ctx, args) => AgentRuns.finish(ctx, args)
});
