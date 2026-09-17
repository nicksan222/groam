import { ConvexError, type Infer } from 'convex/values';
import { TripTargetKind } from '#convex/modules/travel/targets/kind';
import '#convex/modules/travel/targets/kinds/index';
import type { TripTargetValidators } from '#convex/modules/travel/targets/schema';
import type { Doc, Id } from '#convex-generated/dataModel';
import type { MutationCtx, QueryCtx } from '#convex-generated/server';

type AttachmentTarget = Infer<typeof TripTargetValidators.attachable>;
export type ReadCtx = MutationCtx | QueryCtx;

export type { AttachmentTarget };

export type AttachmentReferenceWithMedia = Doc<'attachmentReferences'> & {
  mediaId: Id<'media'>;
};

export type AttachmentView = {
  contentType: string;
  id: Id<'attachments'>;
  mediaId: Id<'media'>;
  name: string;
  position: number;
  size: number;
  url: string | null;
};

function singularLabel(label: string): string {
  return label.endsWith('ies') ? `${label.slice(0, -3)}y` : label.replace(/s$/u, '');
}

function maxPerTargetScan(): number {
  return Math.max(0, ...TripTargetKind.attachable().map((kind) => kind.attachments.maxPerTarget));
}

async function referencesForTarget(
  ctx: ReadCtx,
  tripId: Id<'trips'>,
  target: AttachmentTarget,
  maximum = maxPerTargetScan()
) {
  return await ctx.db
    .query('attachmentReferences')
    .withIndex('by_tripId_and_target_type_and_target_id_and_position', (query) =>
      query.eq('tripId', tripId).eq('target.type', target.type).eq('target.id', target.id)
    )
    .take(maximum + 1);
}

async function deleteOrphan(ctx: MutationCtx, attachmentId: Id<'attachments'>): Promise<void> {
  const reference = await ctx.db
    .query('attachmentReferences')
    .withIndex('by_attachmentId', (query) => query.eq('attachmentId', attachmentId))
    .first();
  if (!reference) {
    await ctx.db.delete('attachments', attachmentId);
  }
}

async function attachmentIdForMedia(
  ctx: MutationCtx,
  tripId: Id<'trips'>,
  mediaId: Id<'media'>
): Promise<Id<'attachments'>> {
  const existing = await ctx.db
    .query('attachments')
    .withIndex('by_tripId_and_mediaId', (query) =>
      query.eq('tripId', tripId).eq('mediaId', mediaId)
    )
    .unique();
  if (existing) return existing._id;
  return await ctx.db.insert('attachments', { mediaId, tripId });
}

function withMedia(
  reference: Doc<'attachmentReferences'>,
  attachment: Doc<'attachments'> | null
): AttachmentReferenceWithMedia[] {
  return attachment ? [{ ...reference, mediaId: attachment.mediaId }] : [];
}

/**
 * Pin library media onto a trip target (trip, destination, activity, stay, transfer).
 * `attachments` rows are shared per (trip, media); `attachmentReferences` are the ordered pins.
 */
// biome-ignore lint/complexity/noStaticOnlyClass: callers use this class, not loose functions
export class Attachments {
  static limitFor(target: AttachmentTarget): number {
    const kind = TripTargetKind.of(target.type);
    if (!kind || !TripTargetKind.isAttachable(kind)) throw new ConvexError('Trip target not found');
    return kind.attachments.maxPerTarget;
  }

  static async forTarget(
    ctx: ReadCtx,
    tripId: Id<'trips'>,
    target: AttachmentTarget,
    maximum: number
  ) {
    const references = await referencesForTarget(ctx, tripId, target, maximum);
    if (references.length > maximum) throw new ConvexError('Attachment limit exceeded');
    const attachments = await Promise.all(
      references.map((reference) => ctx.db.get('attachments', reference.attachmentId))
    );
    return references.flatMap((reference, index) =>
      withMedia(reference, attachments[index] ?? null)
    );
  }

  static async forTrip(ctx: ReadCtx, tripId: Id<'trips'>) {
    const groups = await Promise.all(
      TripTargetKind.attachable().map(async (kind) => {
        const maximum = kind.attachments.maxPerTrip;
        const references = await ctx.db
          .query('attachmentReferences')
          .withIndex('by_tripId_and_target_type_and_target_id_and_position', (query) =>
            query.eq('tripId', tripId).eq('target.type', kind.type as AttachmentTarget['type'])
          )
          .take(maximum + 1);
        if (references.length > maximum) throw new ConvexError('Trip attachment limit exceeded');
        return references;
      })
    );
    const references = groups.flat();
    const attachmentIds = [...new Set(references.map((reference) => reference.attachmentId))];
    const attachments = await Promise.all(
      attachmentIds.map((attachmentId) => ctx.db.get('attachments', attachmentId))
    );
    const attachmentById = new Map(
      attachments.flatMap((attachment) =>
        attachment ? [[attachment._id, attachment] as const] : []
      )
    );
    return references.flatMap((reference) =>
      withMedia(reference, attachmentById.get(reference.attachmentId) ?? null)
    );
  }

  static async viewForTarget(
    ctx: ReadCtx,
    {
      tripId,
      target,
      maximum,
      organizationId
    }: {
      tripId: Id<'trips'>;
      target: AttachmentTarget;
      maximum: number;
      organizationId: string;
    }
  ): Promise<AttachmentView[]> {
    const references = await Attachments.forTarget(ctx, tripId, target, maximum);
    const rows = await Promise.all(
      references.map(async (reference) => {
        const [attachment, media] = await Promise.all([
          ctx.db.get('attachments', reference.attachmentId),
          ctx.db.get('media', reference.mediaId)
        ]);
        if (!attachment || !media || media.organizationId !== organizationId) return null;
        return {
          contentType: media.contentType,
          id: attachment._id,
          mediaId: media._id,
          name: media.name,
          position: reference.position,
          size: media.size,
          url: await ctx.storage.getUrl(media.storageId)
        } satisfies AttachmentView;
      })
    );
    return rows.filter((row) => row !== null);
  }

  static async mediaIsAttached(ctx: ReadCtx, mediaId: Id<'media'>): Promise<boolean> {
    return (
      (await ctx.db
        .query('attachments')
        .withIndex('by_mediaId', (query) => query.eq('mediaId', mediaId))
        .first()) !== null
    );
  }

  static async removeTarget(ctx: MutationCtx, tripId: Id<'trips'>, target: AttachmentTarget) {
    const references = await referencesForTarget(ctx, tripId, target);
    for (const reference of references) await ctx.db.delete(reference._id);
    for (const reference of references) {
      await deleteOrphan(ctx, reference.attachmentId);
    }
  }

  /** Replace the ordered pin list. Same ids in the same order is a no-op. */
  static async setTarget(
    ctx: MutationCtx,
    {
      tripId,
      target,
      mediaIds,
      organizationId,
      maximum,
      label = 'Attachments'
    }: {
      tripId: Id<'trips'>;
      target: AttachmentTarget;
      mediaIds: Id<'media'>[] | undefined;
      organizationId: string;
      maximum: number;
      label?: string;
    }
  ): Promise<boolean> {
    const ids = mediaIds ?? [];
    const singular = singularLabel(label);
    if (ids.length > maximum) {
      throw new ConvexError(`${label} support up to ${maximum} attachments`);
    }
    if (new Set(ids).size !== ids.length) {
      throw new ConvexError(`${singular} attachments must be unique`);
    }

    const [media, existing] = await Promise.all([
      Promise.all(ids.map((mediaId) => ctx.db.get('media', mediaId))),
      Attachments.forTarget(ctx, tripId, target, maximum)
    ]);
    if (media.some((item) => !item || item.organizationId !== organizationId)) {
      throw new ConvexError(`${singular} attachment not found`);
    }
    if (
      existing.length === ids.length &&
      existing.every((reference, index) => reference.mediaId === ids[index])
    ) {
      return false;
    }

    for (const reference of existing) await ctx.db.delete(reference._id);
    for (const reference of existing) await deleteOrphan(ctx, reference.attachmentId);

    for (const [position, mediaId] of ids.entries()) {
      await ctx.db.insert('attachmentReferences', {
        attachmentId: await attachmentIdForMedia(ctx, tripId, mediaId),
        position,
        target,
        tripId
      });
    }
    return true;
  }
}
