import { v } from 'convex/values';
import { workspaceQuery } from '#convex/modules/auth/workspace';
import { recordByReference, referenceTable } from '#convex/modules/references/index';

export const run = workspaceQuery({
  args: { table: referenceTable, reference: v.string() },
  returns: v.union(v.object({ id: v.string(), shortId: v.string() }), v.null()),
  handler: async (ctx, { table, reference }) => {
    const record = await recordByReference(ctx, table, reference);
    if (!record || record.organizationId !== ctx.workspace.organizationId) return null;
    if (table === 'discussions') {
      const discussionId = ctx.db.normalizeId('discussions', record._id);
      if (!discussionId) return null;
      const member = await ctx.db
        .query('discussionMembers')
        .withIndex('by_discussionId_and_userId', (q) =>
          q.eq('discussionId', discussionId).eq('userId', ctx.workspace.userId)
        )
        .unique();
      if (!member) return null;
    }
    return { id: record._id, shortId: record.shortId ?? record._id };
  }
});
