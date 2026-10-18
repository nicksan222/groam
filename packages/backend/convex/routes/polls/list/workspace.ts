import { paginationOptsValidator, paginationResultValidator } from 'convex/server';
import { workspaceQuery } from '#convex/modules/auth/workspace';
import { Polls } from '#convex/modules/polls/index';
import { PollValidators } from '#convex/modules/polls/schema';

export const run = workspaceQuery({
  args: { paginationOpts: paginationOptsValidator, status: PollValidators.status },
  returns: paginationResultValidator(PollValidators.view),
  handler: (ctx, args) => Polls.listForWorkspace(ctx, ctx.workspace, args)
});
