import { paginationOptsValidator, paginationResultValidator } from 'convex/server';
import { workspaceQuery } from '#convex/modules/auth/workspace';
import { Polls } from '#convex/modules/polls/index';
import { PollValidators } from '#convex/modules/polls/schema';

export const run = workspaceQuery({
  args: { paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(PollValidators.openItem),
  handler: (ctx, { paginationOpts }) => Polls.pageOpen(ctx, ctx.workspace, paginationOpts)
});
