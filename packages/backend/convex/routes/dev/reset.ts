import { v } from 'convex/values';
import { assertLocalDevelopment } from '#convex/modules/dev/local';
import { clearApplicationTables } from '#convex/modules/dev/reset';
import { mutation } from '#convex-generated/server';

export const run = mutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    assertLocalDevelopment();
    return await clearApplicationTables(ctx);
  }
});
