import { assistantAgents } from '@groam/ai/agents';
import { ConvexError, v } from 'convex/values';
import type { Doc, Id } from '#convex-generated/dataModel';
import type { MutationCtx } from '#convex-generated/server';
import { AgentWaits } from '#convex/modules/assistant/waits/index';
import { internalWorkspaceMutation } from '#convex/modules/auth/workspace';
import { kindPolicy } from '#convex/modules/discussions/kinds/index';
import { Polls } from '#convex/modules/polls/index';
import { type PollCreateInput, PollValidators } from '#convex/modules/polls/schema';

/**
 * The run's shared chat (and its trip), else the active trip, else the group. A private
 * assistant chat is never the poll's home: nobody else could see or vote on it there.
 */
async function pollScope(
  ctx: MutationCtx,
  run: Doc<'agentRuns'>,
  activeTripId: Id<'trips'> | undefined
): Promise<Pick<PollCreateInput, 'discussionId' | 'tripId'>> {
  const discussion = run.discussionId ? await ctx.db.get('discussions', run.discussionId) : null;
  if (discussion && kindPolicy(discussion.kind).audience !== 'owner') {
    return { discussionId: discussion._id };
  }
  const tripId = activeTripId ?? run.tripId;
  return tripId ? { tripId } : {};
}

/** createPoll: asks the group and, with `waitFor`, suspends the calling run on the poll. */
export const createPoll = internalWorkspaceMutation({
  args: {
    activeTripId: v.optional(v.id('trips')),
    multiSelect: v.boolean(),
    options: v.array(v.string()),
    question: v.string(),
    waitFor: v.optional(v.object({ deadlineAt: v.number(), rule: v.array(PollValidators.rule) }))
  },
  returns: v.object({
    pollId: v.id('polls'),
    waitId: v.union(v.id('agentWaits'), v.null())
  }),
  handler: async (ctx, { activeTripId, multiSelect, options, question, waitFor }) => {
    const runId = ctx.workspace.runId;
    const run = runId ? await ctx.db.get('agentRuns', runId) : null;
    if (!runId || !run) throw new ConvexError('Only an agent run can create a poll this way');
    const pollId = await Polls.create(
      ctx,
      ctx.workspace,
      { ...(await pollScope(ctx, run, activeTripId)), multiSelect, options, question },
      { agentId: run.agentId, kind: 'agent', name: assistantAgents[run.agentId].label, runId }
    );
    if (!waitFor) return { pollId, waitId: null };
    const { waitId } = await AgentWaits.create(ctx, {
      condition: { kind: 'poll', pollId, rule: waitFor.rule },
      deadlineAt: waitFor.deadlineAt,
      runId
    });
    return { pollId, waitId };
  }
});
