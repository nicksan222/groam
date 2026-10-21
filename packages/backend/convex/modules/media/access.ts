import { ConvexError } from 'convex/values';
import type { Id } from '#convex-generated/dataModel';
import type { MutationCtx, QueryCtx } from '#convex-generated/server';
import type { Workspace } from '#convex/modules/auth/workspace';
import type { AccessOrigin } from '#convex/modules/media/library/validators';
import { findVisibleTrip } from '#convex/modules/travel/trips/visibility';

export const MEDIA_ORIGIN_PAGE = 20;
export type MediaInspection =
  | { status: 'allowed'; origin?: AccessOrigin }
  | { status: 'denied' | 'unresolved' };

/** An origin is a database reference, never an assertion that the caller may see a file. */
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

  async fromOrigin(mediaId: Id<'media'>, origin: AccessOrigin): Promise<boolean> {
    const media = await this.ctx.db.get('media', mediaId);
    if (!media || media.organizationId !== this.workspace.organizationId) return false;
    if (origin.kind === 'attachment') {
      const pin = await this.ctx.db.get('attachments', origin.id);
      return !!pin && pin.mediaId === mediaId && (await this.tripAllowed(pin.tripId));
    }
    const message = await this.ctx.db.get('discussionMessages', origin.id);
    if (!message || message.organizationId !== this.workspace.organizationId) return false;
    let contains = message.mediaIds?.includes(mediaId) ?? false;
    if (!contains) {
      const refs = await this.ctx.db
        .query('discussionMessageMedia')
        .withIndex('by_messageId', (q) => q.eq('messageId', message._id))
        .take(5);
      contains = refs.some((ref) => ref.mediaId === mediaId);
    }
    if (!contains) return false;
    return this.discussionAllowed(message.discussionId);
  }

  private async discussionAllowed(discussionId: Id<'discussions'>): Promise<boolean> {
    const discussion = await this.ctx.db.get('discussions', discussionId);
    if (!discussion || discussion.organizationId !== this.workspace.organizationId) return false;
    return 'tripId' in discussion && discussion.tripId ? this.tripAllowed(discussion.tripId) : true;
  }

  private async messageAllowed(messageId: Id<'discussionMessages'>): Promise<boolean> {
    const message = await this.ctx.db.get('discussionMessages', messageId);
    if (!message || message.organizationId !== this.workspace.organizationId) return false;
    return this.discussionAllowed(message.discussionId);
  }

  async inspect(mediaId: Id<'media'>): Promise<MediaInspection> {
    const media = await this.ctx.db.get('media', mediaId);
    if (!media || media.organizationId !== this.workspace.organizationId)
      return { status: 'denied' };
    if (media.purpose === 'groupLogo') return { status: 'allowed' };
    const [pins, messages] = await Promise.all([
      this.ctx.db
        .query('attachments')
        .withIndex('by_mediaId', (q) => q.eq('mediaId', mediaId))
        .take(MEDIA_ORIGIN_PAGE + 1),
      this.ctx.db
        .query('discussionMessageMedia')
        .withIndex('by_mediaId', (q) => q.eq('mediaId', mediaId))
        .take(MEDIA_ORIGIN_PAGE + 1)
    ]);
    if (!pins.length && !messages.length) return { status: 'allowed' };
    for (const pin of pins.slice(0, MEDIA_ORIGIN_PAGE)) {
      // oxlint-disable-next-line react-doctor/async-await-in-loop -- Bounded ordered origin discovery stops at the first grant.
      if (await this.tripAllowed(pin.tripId))
        return { status: 'allowed', origin: { kind: 'attachment', id: pin._id } };
    }
    for (const ref of messages.slice(0, MEDIA_ORIGIN_PAGE)) {
      // oxlint-disable-next-line react-doctor/async-await-in-loop -- The indexed reference proves media binding; check only its actual message and discussion.
      if (await this.messageAllowed(ref.messageId))
        return { status: 'allowed', origin: { kind: 'message', id: ref.messageId } };
    }
    return {
      status:
        pins.length > MEDIA_ORIGIN_PAGE || messages.length > MEDIA_ORIGIN_PAGE
          ? 'unresolved'
          : 'denied'
    };
  }

  async canRead(mediaId: Id<'media'>, origin?: AccessOrigin): Promise<boolean> {
    if (origin) return this.fromOrigin(mediaId, origin);
    const result = await this.inspect(mediaId);
    if (result.status === 'unresolved')
      throw new ConvexError({
        code: 'MEDIA_ACCESS_UNRESOLVED',
        mediaId,
        message: 'Use media.discover to resolve an access origin'
      });
    return result.status === 'allowed';
  }
}
