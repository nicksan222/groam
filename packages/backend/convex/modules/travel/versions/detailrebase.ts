import { ConvexError, type Infer, v } from 'convex/values';
import { TripVersionModel } from '#convex/modules/travel/trips/schema';
import { detailResolutionArgs } from '#convex/modules/travel/versions/detailresolution';
import { VersionedModel } from '#convex/modules/travel/versions/fields/index';
import {
  type VersionSnapshot,
  VersionSnapshots
} from '#convex/modules/travel/versions/snapshot/index';

export const detailRebaseValidator = v.object(detailResolutionArgs);
export type DetailRebase = Infer<typeof detailRebaseValidator>;

export function withResolvedDetails(
  current: VersionSnapshot,
  proposed: VersionSnapshot,
  details: DetailRebase
): VersionSnapshot {
  const keys = details.choices.map(({ key }) => key);
  if (keys.length === 0 || new Set(keys).size !== keys.length) {
    throw new ConvexError('Choose each detail exactly once');
  }
  const shared = VersionSnapshots.parse(current).trip;
  const mine = VersionSnapshots.parse(proposed).trip;
  const next = { ...shared };
  for (const { key, choice } of details.choices) {
    if (choice === 'mine') Object.assign(next, { [key]: mine[key] });
  }
  return {
    files: proposed.files.map((file) =>
      file.path === 'trip.json'
        ? {
            ...file,
            value: VersionedModel.serialize(TripVersionModel, {
              ...next,
              budget: next.budget ?? null,
              cover: next.cover ?? null,
              dateNotes: next.dateNotes ?? null,
              duration: next.duration ?? null,
              startDate: next.startDate ?? null
            })
          }
        : file
    )
  };
}
