import { v } from 'convex/values';
import { query } from './_generated/server';

/**
 * What the workspace guard needs about a session, read in one call. Better Auth's API would make
 * several and build a whole auth instance for every guarded function.
 */
export const access = query({
  args: { sessionId: v.string(), userId: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      activeOrganizationId: v.union(v.null(), v.string()),
      expiresAt: v.number(),
      role: v.union(v.null(), v.string()),
      userName: v.string()
    })
  ),
  handler: async (ctx, { sessionId, userId }) => {
    const sessionDocId = ctx.db.normalizeId('session', sessionId);
    const userDocId = ctx.db.normalizeId('user', userId);
    if (!sessionDocId || !userDocId) return null;
    const [session, user] = await Promise.all([
      ctx.db.get('session', sessionDocId),
      ctx.db.get('user', userDocId)
    ]);
    if (!session || !user || session.userId !== userId) return null;

    const activeOrganizationId = session.activeOrganizationId ?? null;
    const member = activeOrganizationId
      ? await ctx.db
          .query('member')
          .withIndex('by_organizationId_and_userId', (q) =>
            q.eq('organizationId', activeOrganizationId).eq('userId', userId)
          )
          .first()
      : null;
    return {
      activeOrganizationId,
      expiresAt: session.expiresAt,
      role: member?.role ?? null,
      userName: user.name
    };
  }
});
