import { v } from 'convex/values';
import { workspaceQuery } from '#convex/modules/auth/workspace';
import { DiscussionAccess } from '#convex/modules/discussions/threads/entity';
import { recordByReference, referenceTable } from '#convex/modules/references/index';

export const run = workspaceQuery({
  args: { table: referenceTable, reference: v.string() },
  returns: v.union(
    v.object({
      id: v.string(),
      /** Discussions only: lets the web app route a research to its trip page. */
      kind: v.optional(v.union(v.literal('group'), v.literal('assistant'), v.literal('research'))),
      shortId: v.string(),
      tripId: v.optional(v.id('trips'))
    }),
    v.null()
  ),
  handler: async (ctx, { table, reference }) => {
    const record = await recordByReference(ctx, table, reference);
    if (!record || record.organizationId !== ctx.workspace.organizationId) return null;
    if (table === 'discussions') {
      const discussionId = ctx.db.normalizeId('discussions', record._id);
      if (!discussionId) return null;
      try {
        const { discussion } = await DiscussionAccess.forWorkspace(
          ctx,
          discussionId,
          ctx.workspace
        );
        return {
          id: record._id,
          kind: discussion.kind,
          shortId: record.shortId,
          ...('tripId' in discussion && discussion.tripId ? { tripId: discussion.tripId } : {})
        };
      } catch {
        return null;
      }
    }
    return { id: record._id, shortId: record.shortId };
  }
});
