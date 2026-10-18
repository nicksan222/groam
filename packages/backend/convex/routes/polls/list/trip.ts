import { paginationOptsValidator, paginationResultValidator } from 'convex/server';
import { v } from 'convex/values';
import { workspaceQuery } from '#convex/modules/auth/workspace';
import { Polls } from '#convex/modules/polls/index';
import { PollValidators } from '#convex/modules/polls/schema';

export const run = workspaceQuery({
  args: {
    paginationOpts: paginationOptsValidator,
    status: PollValidators.status,
    tripId: v.id('trips')
  },
  returns: paginationResultValidator(PollValidators.view),
  handler: (ctx, args) => Polls.listForTrip(ctx, ctx.workspace, args)
});
