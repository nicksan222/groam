import { v } from 'convex/values';
import { components } from '#convex-generated/api';
import { internalMutation } from '#convex-generated/server';
import { authComponent } from '#convex/modules/auth/auth';
import { resolveAuthBaseUrl } from '#convex/modules/auth/site';
import type { Workspace } from '#convex/modules/auth/workspace';
import { seedDemoContent } from './trip';

/** Called only by the user creation trigger; all component and app writes share its transaction. */
export const initialize = internalMutation({
  args: { userId: v.string() },
  returns: v.null(),
  handler: async (ctx, { userId }) => {
    const existing = await ctx.db
      .query('userDemos')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .unique();
    if (existing) return null;
    const user = await authComponent.getAnyUserById(ctx, userId);
    if (!user) return null;
    const organization = await ctx.runMutation(components.betterAuth.adapter.create, {
      input: {
        model: 'organization',
        data: { name: 'Demo group', slug: `demo-${userId}`, createdAt: Date.now() }
      }
    });
    const organizationId = organization._id;
    await ctx.runMutation(components.betterAuth.adapter.create, {
      input: {
        model: 'member',
        data: { organizationId, userId, role: 'owner', createdAt: Date.now() }
      }
    });
    const workspace: Workspace = {
      organizationId,
      organizationRole: 'owner',
      tokenIdentifier: `${resolveAuthBaseUrl()}|${userId}`,
      userId,
      viewerName: user.name,
      roster: {
        members: [
          {
            handle: user.name,
            image: user.image ?? null,
            name: user.name,
            organizationRole: 'owner',
            userId
          }
        ]
      }
    };
    await seedDemoContent({ ...ctx, workspace });
    await ctx.db.insert('userDemos', { organizationId, userId });
    return null;
  }
});
