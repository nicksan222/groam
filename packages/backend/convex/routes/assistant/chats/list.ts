import { v } from 'convex/values';
import { AssistantChats } from '#convex/modules/assistant/chat/index';
import { assistantChatValidator } from '#convex/modules/assistant/model/index';
import { query } from '#convex-generated/server';

export const run = query({
  args: {},
  returns: v.array(assistantChatValidator),
  handler: (ctx) => AssistantChats.list(ctx)
});
