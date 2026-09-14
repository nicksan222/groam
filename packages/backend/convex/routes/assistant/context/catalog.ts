import { v } from 'convex/values';
import {
  type AssistantContextCatalogItem,
  assistantContextCatalogItemValidator
} from '#convex/modules/assistant/model/index';
import { internal } from '#convex-generated/api';
import { query } from '#convex-generated/server';

export const run = query({
  args: {},
  returns: v.array(assistantContextCatalogItemValidator),
  handler: async (ctx): Promise<AssistantContextCatalogItem[]> =>
    await ctx.runQuery(internal.modules.assistant.model.index.contextCatalog, {})
});
