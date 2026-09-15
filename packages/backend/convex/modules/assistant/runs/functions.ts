import { v } from 'convex/values';
import { AgentRuns } from '#convex/modules/assistant/runs/index';
import { AgentRunValidators } from '#convex/modules/assistant/runs/schema';
import { agentRunEventKindValidator } from '#convex/modules/assistant/validators/index';
import { requireWorkspace } from '#convex/modules/auth/workspace';
import { internalMutation, internalQuery } from '#convex-generated/server';

export const getInternal = internalQuery({
  args: {
    organizationId: v.optional(v.string()),
    runId: v.id('agentRuns')
  },
  returns: v.union(AgentRunValidators.run, v.null()),
  handler: async (ctx, { organizationId, runId }) => {
    const run = await ctx.db.get('agentRuns', runId);
    if (!run) return null;
    if (organizationId !== undefined && run.organizationId !== organizationId) return null;
    return AgentRuns.presentRun(run);
  }
});

export const claimRun = internalMutation({
  args: { runId: v.id('agentRuns') },
  returns: v.union(AgentRunValidators.run, v.null()),
  handler: async (ctx, { runId }) => {
    const claimed = await AgentRuns.claim(ctx, runId);
    return claimed ? AgentRuns.presentRun(claimed) : null;
  }
});

export const finishRun = internalMutation({
  args: {
    error: v.optional(v.string()),
    report: v.optional(v.string()),
    runId: v.id('agentRuns'),
    status: v.union(v.literal('complete'), v.literal('failed'), v.literal('aborted'))
  },
  returns: v.null(),
  handler: (ctx, args) => AgentRuns.finish(ctx, args)
});

export const recordEvent = internalMutation({
  args: {
    detail: v.optional(v.string()),
    kind: agentRunEventKindValidator,
    label: v.string(),
    runId: v.id('agentRuns')
  },
  returns: v.null(),
  handler: (ctx, args) => AgentRuns.appendEvent(ctx, args)
});

export const recordToolEvents = internalMutation({
  args: {
    events: v.array(
      v.object({
        input: v.optional(v.string()),
        label: v.string(),
        ok: v.boolean(),
        output: v.optional(v.string()),
        toolName: v.string()
      })
    ),
    runId: v.id('agentRuns')
  },
  returns: v.null(),
  handler: (ctx, { events, runId }) => AgentRuns.appendToolEvents(ctx, { events, runId })
});

export const recordStepEvents = internalMutation({
  args: {
    events: v.array(
      v.union(
        v.object({
          detail: v.string(),
          kind: v.literal('thought'),
          label: v.string()
        }),
        v.object({
          input: v.optional(v.string()),
          kind: v.literal('tool'),
          label: v.string(),
          ok: v.boolean(),
          output: v.optional(v.string()),
          toolName: v.string()
        })
      )
    ),
    runId: v.id('agentRuns')
  },
  returns: v.null(),
  handler: (ctx, { events, runId }) => AgentRuns.appendStepEvents(ctx, { events, runId })
});

export const queueReviewForViewer = internalMutation({
  args: {
    proposalId: v.id('tripProposals'),
    title: v.string(),
    tripId: v.id('trips')
  },
  returns: v.id('agentRuns'),
  handler: async (ctx, args) => {
    const workspace = await requireWorkspace(ctx);
    return await AgentRuns.queueReviewRun(ctx, {
      createdBy: { name: workspace.viewerName, userId: workspace.userId },
      organizationId: workspace.organizationId,
      proposalId: args.proposalId,
      title: args.title,
      tripId: args.tripId
    });
  }
});
