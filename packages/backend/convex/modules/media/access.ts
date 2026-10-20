import type { Id } from '#convex-generated/dataModel';
import type { MutationCtx, QueryCtx } from '#convex-generated/server';
import type { Workspace } from '#convex/modules/auth/workspace';
import { findVisibleTrip } from '#convex/modules/travel/trips/visibility';

const MAX_ORIGINS = 20;

/** Authorized sharing publishes a library file; guessed IDs cannot create its first public origin. */
export class MediaAccess {
  private readonly tripPermissions = new Map<Id<'trips'>, Promise<boolean>>();

  constructor(
    private readonly ctx: MutationCtx | QueryCtx,
    private readonly workspace: Workspace
  ) {}

  private tripAllowed(tripId: Id<'trips'>): Promise<boolean> {
    let permission = this.tripPermissions.get(tripId);
    if (!permission) {
      permission = findVisibleTrip(this.ctx, tripId, this.workspace).then(Boolean);
      this.tripPermissions.set(tripId, permission);
    }
    return permission;
  }

  async canRead(mediaId: Id<'media'>): Promise<boolean> {
    const media = await this.ctx.db.get('media', mediaId);
    if (!media || media.organizationId !== this.workspace.organizationId) return false;
    if (media.purpose === 'groupLogo') return true; // Already published in organization metadata.
    const [pins, messages] = await Promise.all([
      this.ctx.db
        .query('attachments')
        .withIndex('by_mediaId', (q) => q.eq('mediaId', mediaId))
        .take(MAX_ORIGINS),
      this.ctx.db
        .query('discussionMessageMedia')
        .withIndex('by_mediaId', (q) => q.eq('mediaId', mediaId))
        .take(MAX_ORIGINS)
    ]);
    // No origins means an ordinary organization library upload. Overflow never implies this.
    if (pins.length === 0 && messages.length === 0) return true;
    const tripIds = new Set(pins.map((pin) => pin.tripId));
    const origins = await Promise.all(
      messages.map(async (ref) => {
        const message = await this.ctx.db.get('discussionMessages', ref.messageId);
        if (!message) return null;
        return this.ctx.db.get('discussions', message.discussionId);
      })
    );
    for (const discussion of origins) {
      if (!discussion || discussion.organizationId !== this.workspace.organizationId) continue;
      if ('tripId' in discussion && discussion.tripId) tripIds.add(discussion.tripId);
      else return true; // Deliberate sharing to an ordinary chat publishes to the org library.
    }
    return (await Promise.all([...tripIds].map((id) => this.tripAllowed(id)))).some(Boolean);
  }
}
