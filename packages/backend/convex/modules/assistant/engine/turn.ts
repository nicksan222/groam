import { v } from 'convex/values';
import { internalAction } from '#convex-generated/server';
import {
  type TurnResult,
  turnResultValidator,
  waitResumeValidator
} from '#convex/modules/assistant/engine/schema';
import { AgentTurns } from '#convex/modules/assistant/engine/turns';

/** One model turn of a run. Free to change between deploys; the workflow only sees ids. */
export const run = internalAction({
  args: { resume: v.optional(waitResumeValidator), runId: v.id('agentRuns') },
  returns: turnResultValidator,
  handler: (ctx, args): Promise<TurnResult> => AgentTurns.run(ctx, args)
});
