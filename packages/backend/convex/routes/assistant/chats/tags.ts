import type { AssistantContextTag } from '@groam/ai-contracts/agents/registry';
import { v } from 'convex/values';
import {
  type AssistantContextTagReference,
  assistantContextTagReferenceValidator,
  assistantContextTagValidator
} from '#convex/modules/assistant/model/index';
import { internal } from '#convex-generated/api';
import { mutation } from '#convex-generated/server';

export const run = mutation({
  args: {
    tags: v.array(assistantContextTagReferenceValidator),
    threadId: v.string()
  },
  returns: v.array(assistantContextTagValidator),
  handler: async (
    ctx,
    args: { tags: AssistantContextTagReference[]; threadId: string }
  ): Promise<AssistantContextTag[]> =>
    await ctx.runMutation(internal.modules.assistant.model.index.setContextTags, args)
});
