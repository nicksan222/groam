import { listUIMessages, syncStreams, vStreamArgs } from '@convex-dev/agent';
import { paginationOptsValidator } from 'convex/server';
import { v } from 'convex/values';
import { components, internal } from '#convex-generated/api';
import { query } from '#convex-generated/server';

export const run = query({
  args: {
    paginationOpts: paginationOptsValidator,
    streamArgs: vStreamArgs,
    threadId: v.string()
  },
  handler: async (ctx, args) => {
    await ctx.runQuery(internal.modules.assistant.model.index.access, { threadId: args.threadId });
    const [messages, streams] = await Promise.all([
      listUIMessages(ctx, components.agent, args),
      syncStreams(ctx, components.agent, args)
    ]);
    return { ...messages, streams };
  }
});
