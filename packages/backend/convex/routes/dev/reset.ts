import { v } from 'convex/values';
import { mutation } from '#convex-generated/server';
import { assertLocalDevelopment } from '#convex/modules/dev/local';
import { clearApplicationTables } from '#convex/modules/dev/reset';

export const run = mutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    assertLocalDevelopment();
    return await clearApplicationTables(ctx);
  }
});
