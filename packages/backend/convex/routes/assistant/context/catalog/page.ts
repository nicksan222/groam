import {
  type PaginationResult,
  paginationOptsValidator,
  paginationResultValidator
} from 'convex/server';
import { internal } from '#convex-generated/api';
import { query } from '#convex-generated/server';
import {
  type AssistantContextCatalogItem,
  assistantContextCatalogItemValidator
} from '#convex/modules/assistant/model/index';

export const run = query({
  args: { paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(assistantContextCatalogItemValidator),
  handler: async (ctx, args): Promise<PaginationResult<AssistantContextCatalogItem>> =>
    await ctx.runQuery(internal.modules.assistant.model.index.contextCatalogPage, args)
});
