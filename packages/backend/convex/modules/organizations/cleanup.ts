import { v } from 'convex/values';
import { Discussions } from '#convex/modules/discussions/threads/index';
import { Media } from '#convex/modules/media/library/index';
import { OrganizationInvitations } from '#convex/modules/organizations/invitations/index';
import { deleteTripBatch } from '#convex/modules/travel/trips/index';
import { internal } from '#convex-generated/api';
import { internalMutation, type MutationCtx } from '#convex-generated/server';

const DELETE_BATCH_SIZE = 50;

type OrganizationCleanupArgs = { organizationId: string };

class OrganizationCleanup {
  constructor(
    private readonly ctx: MutationCtx,
    private readonly args: OrganizationCleanupArgs
  ) {}

  async run(): Promise<null> {
    if (await this.removeNextTrip()) return await this.continueInNextTransaction();
    if (await this.removeDiscussionBatch()) return await this.continueInNextTransaction();
    if (await this.removeMediaBatch()) return await this.continueInNextTransaction();
    if (await this.removeInvitationCodeBatch()) return await this.continueInNextTransaction();
    return null;
  }

  private async continueInNextTransaction(): Promise<null> {
    await this.ctx.scheduler.runAfter(
      0,
      internal.modules.organizations.cleanup.removeOrganizationData,
      this.args
    );
    return null;
  }

  private async removeNextTrip(): Promise<boolean> {
    const trip = await this.ctx.db
      .query('trips')
      .withIndex('by_organizationId_and_updatedAt', (query) =>
        query.eq('organizationId', this.args.organizationId)
      )
      .first();
    if (!trip) return false;
    await deleteTripBatch(this.ctx, trip);
    return true;
  }

  private async removeDiscussionBatch(): Promise<boolean> {
    return await Discussions.deleteOrganizationBatch(
      this.ctx,
      this.args.organizationId,
      DELETE_BATCH_SIZE
    );
  }

  private async removeMediaBatch(): Promise<boolean> {
    return await Media.deleteOrganizationBatch(
      this.ctx,
      this.args.organizationId,
      DELETE_BATCH_SIZE
    );
  }

  private async removeInvitationCodeBatch(): Promise<boolean> {
    return await OrganizationInvitations.deleteOrganization(
      this.ctx,
      this.args.organizationId,
      DELETE_BATCH_SIZE
    );
  }
}

export const removeOrganizationData = internalMutation({
  args: { organizationId: v.string() },
  returns: v.null(),
  handler: (ctx, args) => new OrganizationCleanup(ctx, args).run()
});
