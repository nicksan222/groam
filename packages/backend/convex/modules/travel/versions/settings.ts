import { ConvexError } from 'convex/values';
import {
  assertOrganizationManager,
  isOrganizationManager,
  requireWorkspace
} from '#convex/modules/auth/workspace';
import type { MutationCtx, QueryCtx } from '#convex-generated/server';

export const DEFAULT_REQUIRED_PROPOSAL_APPROVALS = 1;
export const MAX_REQUIRED_PROPOSAL_APPROVALS = 10;

/** Organization-wide idea review thresholds. */
// biome-ignore lint/complexity/noStaticOnlyClass: callers use this class, not loose functions
export class ReviewSettings {
  static async forOrganization(ctx: MutationCtx | QueryCtx, organizationId: string) {
    const settings = await ctx.db
      .query('tripReviewSettings')
      .withIndex('by_organizationId', (query) => query.eq('organizationId', organizationId))
      .unique();
    return {
      requiredApprovals: settings?.requiredApprovals ?? DEFAULT_REQUIRED_PROPOSAL_APPROVALS
    };
  }

  static async get(ctx: QueryCtx) {
    const workspace = await requireWorkspace(ctx);
    const settings = await ReviewSettings.forOrganization(ctx, workspace.organizationId);
    return {
      canManage: isOrganizationManager(workspace.organizationRole),
      requiredApprovals: settings.requiredApprovals
    };
  }

  static async set(ctx: MutationCtx, requiredApprovals: number) {
    const workspace = await requireWorkspace(ctx);
    assertOrganizationManager(workspace);
    if (
      !Number.isInteger(requiredApprovals) ||
      requiredApprovals < 1 ||
      requiredApprovals > MAX_REQUIRED_PROPOSAL_APPROVALS
    ) {
      throw new ConvexError(
        `Required approvals must be between 1 and ${MAX_REQUIRED_PROPOSAL_APPROVALS}`
      );
    }
    const existing = await ctx.db
      .query('tripReviewSettings')
      .withIndex('by_organizationId', (query) =>
        query.eq('organizationId', workspace.organizationId)
      )
      .unique();
    const value = {
      organizationId: workspace.organizationId,
      requiredApprovals,
      updatedAt: Date.now(),
      updatedBy: { name: workspace.viewerName, userId: workspace.userId }
    };
    if (existing) await ctx.db.replace('tripReviewSettings', existing._id, value);
    else await ctx.db.insert('tripReviewSettings', value);
    return null;
  }
}
