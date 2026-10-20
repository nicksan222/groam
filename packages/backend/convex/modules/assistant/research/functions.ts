import { ConvexError, v } from 'convex/values';
import { internal } from '#convex-generated/api';
import { internalAction, internalMutation, internalQuery } from '#convex-generated/server';
import { queueResearch } from '#convex/modules/assistant/research/queue';
import { ResearchSession } from '#convex/modules/assistant/research/session';
import { AgentRuns } from '#convex/modules/assistant/runs/index';
import {
  researchEffortValidator,
  researchResultValidator
} from '#convex/modules/assistant/runs/schema';
import {
  internalWorkspaceMutation,
  internalWorkspaceQuery,
  requireActor,
  runActorArgs
} from '#convex/modules/auth/workspace';
import { ResearchAssistant } from '#convex/modules/discussions/research/assistant';
import { loadTripContext } from '#convex/modules/travel/trips/ctx';

export const queue = internalWorkspaceMutation({
  args: {
    tripId: v.id('trips'),
    topic: v.string(),
    effort: researchEffortValidator,
    sourceRunId: v.optional(v.id('agentRuns'))
  },
  returns: v.id('agentRuns'),
  handler: (ctx, args) => queueResearch(ctx, { ...args, start: false })
});

/** Rechecks current trip access using the run's creator, including background execution. */
export const context = internalWorkspaceQuery({
  args: { runId: v.id('agentRuns') },
  returns: v.object({ context: v.string(), organizationId: v.string() }),
  handler: async (ctx, { runId }) => {
    const run = await ctx.db.get('agentRuns', runId);
    if (
      !run?.researchTask ||
      !run.tripId ||
      run.organizationId !== ctx.workspace.organizationId ||
      run.createdBy.userId !== ctx.workspace.userId
    )
      throw new ConvexError('Research run not found');
    const { trip } = await loadTripContext(ctx, run.tripId, ctx.workspace);
    if (trip.archive !== undefined) throw new ConvexError('This trip is archived');
    const research = run.discussionId ? await ResearchAssistant.read(ctx, run.discussionId) : null;
    const destinations = await ctx.db
      .query('tripDestinations')
      .withIndex('by_tripId_and_position', (q) => q.eq('tripId', trip._id))
      .take(20);
    return {
      context: JSON.stringify({
        tripName: trip.name,
        destination: trip.destination,
        currency: trip.currency,
        budget: trip.budget ?? null,
        dateNotes: trip.dateNotes ?? null,
        startDate: trip.startDate ?? null,
        duration: trip.duration ?? null,
        destinations: destinations.map(({ name, schedule, dayNotes }) => ({
          name,
          schedule,
          notes: dayNotes
        })),
        research
      }),
      organizationId: run.organizationId
    };
  }
});

export const saveResult = internalMutation({
  args: { runId: v.id('agentRuns'), result: researchResultValidator },
  returns: v.null(),
  handler: async (ctx, { runId, result }) => {
    const run = await ctx.db.get('agentRuns', runId);
    if (run?.status === 'running')
      await ctx.db.patch('agentRuns', runId, { researchResult: result, updatedAt: Date.now() });
    return null;
  }
});

/** A delegated researcher must stop spending its parent's budget when that parent stops. */
export const active = internalQuery({
  args: { runId: v.id('agentRuns') },
  returns: v.boolean(),
  handler: async (ctx, { runId }) => {
    const run = await ctx.db.get('agentRuns', runId);
    if (run?.status !== 'running') return false;
    const parent = run.researchTask?.parentRunId;
    return !parent || (await ctx.db.get('agentRuns', parent))?.status === 'running';
  }
});

/** Atomic parent cancellation check and child finish. */
export const finish = internalMutation({
  args: { runId: v.id('agentRuns'), report: v.string() },
  returns: v.boolean(),
  handler: async (ctx, { runId, report }) => {
    const run = await ctx.db.get('agentRuns', runId);
    if (run?.status !== 'running') return false;
    const parent = run.researchTask?.parentRunId;
    if (parent && (await ctx.db.get('agentRuns', parent))?.status !== 'running') {
      await AgentRuns.finish(ctx, { runId, status: 'aborted' });
      return false;
    }
    await AgentRuns.finish(ctx, { runId, report, status: 'complete' });
    return true;
  }
});

/** Parent tools get a finished report before continuing their own agent loop. */
export const delegate = internalAction({
  args: {
    ...runActorArgs,
    tripId: v.id('trips'),
    topic: v.string(),
    effort: researchEffortValidator
  },
  returns: v.object({
    runId: v.id('agentRuns'),
    report: v.string(),
    sources: v.array(v.object({ url: v.string(), title: v.string() })),
    effort: researchEffortValidator,
    incomplete: v.boolean()
  }),
  handler: async (
    ctx,
    args
  ): Promise<{
    runId: import('#convex-generated/dataModel').Id<'agentRuns'>;
    report: string;
    sources: { url: string; title: string }[];
    effort: 'quick' | 'standard' | 'deep';
    incomplete: boolean;
  }> => {
    await requireActor(ctx, args.asRun);
    const { asRun, ...task } = args;
    const runId = await ctx.runMutation(internal.modules.assistant.research.functions.queue, {
      ...task,
      ...(asRun ? { asRun, sourceRunId: asRun } : {})
    });
    const completed = await ResearchSession.inline(ctx, runId);
    if (!completed) throw new ConvexError('The research did not complete');
    return { runId, effort: args.effort, ...completed };
  }
});
