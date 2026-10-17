import { v } from 'convex/values';
import { workspaceMutation } from '#convex/modules/auth/workspace';
import { Polls } from '#convex/modules/polls/index';
import { PollValidators } from '#convex/modules/polls/schema';

export const run = workspaceMutation({
  args: PollValidators.createInput,
  returns: v.id('polls'),
  handler: (ctx, input) =>
    Polls.create(ctx, ctx.workspace, input, {
      kind: 'user',
      name: ctx.workspace.viewerName,
      userId: ctx.workspace.userId
    })
});
