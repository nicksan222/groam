import type { ItineraryChange } from '@/features/trips/hooks/itinerary-proposal-changes';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import type { ResolutionMedia, ResolutionRow } from '@/types/detail-resolution';

export type { ResolutionMedia, ResolutionRow } from '@/types/detail-resolution';

function detailValue(trip: TripDetail, key: string): string {
  switch (key) {
    case 'name':
      return trip.name;
    case 'currency':
      return trip.currency;
    case 'dateNotes':
      return trip.dateNotes || 'Not set';
    case 'startDate':
      return trip.startDate || 'Not set';
    case 'budget':
      return trip.initialBudget === null ? 'Not set' : trip.initialBudget.toLocaleString();
    case 'destination':
      return trip.destination.status === 'known'
        ? [trip.destination.name, trip.destination.countryCode].filter(Boolean).join(' · ')
        : 'Undecided';
    case 'duration':
      return [
        `Total days: ${trip.totalDurationDays ?? 'Not set'}`,
        `Ideal days: ${trip.idealDurationDays ?? 'Not set'}`,
        `Minimum days: ${trip.minimumDurationDays ?? 'Not set'}`
      ].join('\n');
    case 'cover':
      return trip.coverUrl ? 'Trip cover' : 'No cover';
    default:
      return 'Not set';
  }
}
function coverMedia(trip: TripDetail): ResolutionMedia[] {
  return trip.coverUrl
    ? [
        {
          id: trip.coverUrl,
          url: trip.coverUrl,
          name: 'Trip cover',
          contentType: 'image/*',
          size: 0
        }
      ]
    : [];
}

export function buildDetailResolutionRows({
  change,
  mineAttachments,
  sharedAttachments,
  sharedTrip,
  trip
}: {
  change: ItineraryChange;
  mineAttachments: ResolutionMedia[];
  sharedAttachments: ResolutionMedia[];
  sharedTrip?: TripDetail | null;
  trip: TripDetail;
}): ResolutionRow[] {
  return change.fields.map((field) =>
    buildResolutionRow({ field, mineAttachments, sharedAttachments, sharedTrip, trip })
  );
}

function buildResolutionRow({
  field,
  mineAttachments,
  sharedAttachments,
  sharedTrip,
  trip
}: {
  field: ItineraryChange['fields'][number];
  mineAttachments: ResolutionMedia[];
  sharedAttachments: ResolutionMedia[];
  sharedTrip?: TripDetail | null;
  trip: TripDetail;
}): ResolutionRow {
  const media = field.display === 'media';
  const mineMedia = field.key === 'cover' ? coverMedia(trip) : mineAttachments;
  const sharedMedia =
    field.key === 'cover' && sharedTrip ? coverMedia(sharedTrip) : sharedAttachments;
  const fileLabel = field.key === 'cover' ? 'image' : 'files';
  return {
    key: field.key,
    label: field.label,
    media,
    mineMedia: media ? mineMedia : [],
    sharedMedia: media ? sharedMedia : [],
    mine: media ? `${mineMedia.length} ${fileLabel}` : detailValue(trip, field.key),
    shared: media
      ? `${sharedMedia.length} ${fileLabel}`
      : sharedTrip
        ? detailValue(sharedTrip, field.key)
        : 'Loading…'
  };
}
