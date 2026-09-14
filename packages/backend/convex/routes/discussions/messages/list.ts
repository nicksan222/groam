import { vStreamArgs } from '@convex-dev/agent';
import { paginationOptsValidator } from 'convex/server';
import { v } from 'convex/values';
import { Discussions } from '#convex/modules/discussions/threads/index';
import { query } from '#convex-generated/server';

export const run = query({
  args: {
    discussionId: v.id('discussions'),
    paginationOpts: paginationOptsValidator,
    streamArgs: vStreamArgs,
    threadId: v.string()
  },
  handler: (ctx, args) => Discussions.listMessages(ctx, args)
});
