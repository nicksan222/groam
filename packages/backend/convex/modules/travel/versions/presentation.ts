import { ConvexError } from 'convex/values';
import { TripActivityVersionModel } from '#convex/modules/travel/activities/schema';
import { TripDestinationVersionModel } from '#convex/modules/travel/destinations/schema';
import { TripPackingVersionModel } from '#convex/modules/travel/packing/schema';
import { TripStayVersionModel } from '#convex/modules/travel/stays/schema';
import { TripTransferVersionModel } from '#convex/modules/travel/transfers/schema';
import { TripVersionModel } from '#convex/modules/travel/trips/schema';
import type { Id } from '#convex-generated/dataModel';
import type { QueryCtx } from '#convex-generated/server';
import type { TripVersionChange } from './diff';
import type { VersionDiffFieldTag, VersionDiffValueFormat } from './fields/index';

const MAX_PRESENTED_MEDIA_PER_FIELD = 10;
const MAX_PRESENTED_MEDIA_PER_PROPOSAL = 500;

export type PresentedMedia = {
  contentType: string;
  id: string;
  name: string;
  size: number;
  url: string | null;
};

export type PresentedVersionField = {
  after: unknown;
  before: unknown;
  display: 'media' | 'value';
  format: VersionDiffValueFormat | null;
  key: string;
  label: string;
  mediaAfter: PresentedMedia[];
  mediaBefore: PresentedMedia[];
};

type PresentMedia = (value: unknown) => Promise<PresentedMedia[]>;

const fieldsByEntity: Record<TripVersionChange['entity'], Record<string, VersionDiffFieldTag>> = {
  activity: TripActivityVersionModel.presentation,
  destination: TripDestinationVersionModel.presentation,
  details: TripVersionModel.presentation,
  packing: TripPackingVersionModel.presentation,
  stay: TripStayVersionModel.presentation,
  transfer: TripTransferVersionModel.presentation
};

function parse(value: string | null): Record<string, unknown> {
  if (!value) return {};
  try {
    const parsed: unknown = JSON.parse(value);
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function mediaIds(ctx: QueryCtx, value: unknown): Id<'media'>[] {
  if (!Array.isArray(value)) return [];
  if (value.length > MAX_PRESENTED_MEDIA_PER_FIELD) {
    throw new ConvexError('Attachment limit exceeded');
  }
  return value.flatMap((item) => {
    if (typeof item !== 'string') return [];
    const id = ctx.db.normalizeId('media', item);
    return id ? [id] : [];
  });
}

function coverStorageId(value: unknown): Id<'_storage'> | null {
  if (typeof value !== 'object' || value === null) return null;
  const asset = (value as { asset?: unknown }).asset;
  if (typeof asset !== 'object' || asset === null) return null;
  const storageId = (asset as { storageId?: unknown }).storageId;
  return typeof storageId === 'string' ? (storageId as Id<'_storage'>) : null;
}

function createMediaPresenter(ctx: QueryCtx, organizationId: string): PresentMedia {
  const mediaCache = new Map<Id<'media'>, Promise<PresentedMedia | null>>();
  const coverCache = new Map<Id<'_storage'>, Promise<PresentedMedia | null>>();

  const libraryMedia = (id: Id<'media'>) => {
    const cached = mediaCache.get(id);
    if (cached) return cached;
    if (mediaCache.size >= MAX_PRESENTED_MEDIA_PER_PROPOSAL) {
      throw new ConvexError('This proposal has too many media changes to preview at once');
    }
    const pending = ctx.db.get('media', id).then(async (media) => {
      if (!media || media.organizationId !== organizationId) return null;
      return {
        contentType: media.contentType,
        id: media._id,
        name: media.name,
        size: media.size,
        url: await ctx.storage.getUrl(media.storageId)
      };
    });
    mediaCache.set(id, pending);
    return pending;
  };

  const coverMedia = (id: Id<'_storage'>) => {
    const cached = coverCache.get(id);
    if (cached) return cached;
    const pending = ctx.db.system.get('_storage', id).then(async (stored) =>
      stored
        ? {
            contentType: stored.contentType ?? 'image/*',
            id: stored._id,
            name: 'Trip cover',
            size: stored.size,
            url: await ctx.storage.getUrl(stored._id)
          }
        : null
    );
    coverCache.set(id, pending);
    return pending;
  };

  return async (value) => {
    const coverId = coverStorageId(value);
    const media = coverId
      ? [await coverMedia(coverId)]
      : await Promise.all(mediaIds(ctx, value).map(libraryMedia));
    return media.filter((item) => item !== null);
  };
}

function changedKeys(change: TripVersionChange, before: object, after: object): string[] {
  return change.change === 'modified'
    ? change.fields
    : [...new Set([...Object.keys(before), ...Object.keys(after)])];
}

function sanitizedValue(format: VersionDiffValueFormat, value: unknown): unknown {
  if (format !== 'destination' || typeof value !== 'object' || value === null) return value ?? null;
  const destination = value as { name?: unknown; status?: unknown };
  return destination.status === 'undecided'
    ? { status: 'undecided' }
    : { name: typeof destination.name === 'string' ? destination.name : '' };
}

async function presentField({
  change,
  key,
  before,
  after,
  presentMedia
}: {
  change: TripVersionChange;
  key: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  presentMedia: PresentMedia;
}): Promise<PresentedVersionField | null> {
  const tag = fieldsByEntity[change.entity][key];
  if (!tag) throw new ConvexError(`Versioned field ${change.entity}.${key} has no presentation`);
  if (tag.display === 'hidden') return null;
  const display = tag.display;
  return {
    after: display === 'value' ? sanitizedValue(tag.format, after[key]) : null,
    before: display === 'value' ? sanitizedValue(tag.format, before[key]) : null,
    display,
    format: display === 'value' ? tag.format : null,
    key,
    label: tag.label,
    mediaAfter: display === 'media' ? await presentMedia(after[key]) : [],
    mediaBefore: display === 'media' ? await presentMedia(before[key]) : []
  };
}

async function presentVersionChanges(
  ctx: QueryCtx,
  changes: TripVersionChange[],
  organizationId: string
): Promise<
  Array<
    Omit<TripVersionChange, 'after' | 'before' | 'fields'> & {
      fields: PresentedVersionField[];
    }
  >
> {
  const presentMedia = createMediaPresenter(ctx, organizationId);
  return await Promise.all(
    changes.map(async (change) => {
      const before = parse(change.before);
      const after = parse(change.after);
      const fields = await Promise.all(
        changedKeys(change, before, after).map((key) =>
          presentField({ after, before, change, key, presentMedia })
        )
      );
      return {
        change: change.change,
        entity: change.entity,
        fields: fields.filter((field) => field !== null),
        key: change.key,
        label: change.label
      };
    })
  );
}

/** Hydrates snapshot diffs with field labels, formats, and media URLs. */
// biome-ignore lint/complexity/noStaticOnlyClass: callers use this class, not loose functions
export class VersionPresentation {
  static present = presentVersionChanges;
}
