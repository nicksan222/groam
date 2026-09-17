import type {
  ItineraryChange,
  ItineraryChangeField,
  ItineraryChangeFieldRow,
  ItineraryChangeKind,
  VersionedIdentity
} from '@/types/trips';

export type { ItineraryChange, ItineraryChangeFieldRow, ItineraryChangeKind, VersionedIdentity };

function versionIdentityKey(item: VersionedIdentity) {
  return item.sourceId ?? item.id;
}

export function destinationChangeKey(destination: VersionedIdentity) {
  return `destinations/${versionIdentityKey(destination)}.json`;
}

export function activityChangeKey(activity: VersionedIdentity) {
  return `activities/${versionIdentityKey(activity)}.json`;
}

export function stayChangeKey(stay: VersionedIdentity) {
  return `stays/${versionIdentityKey(stay)}.json`;
}

export function destinationTransferChangeKey(transfer: VersionedIdentity) {
  return `transfers/destination-${versionIdentityKey(transfer)}.json`;
}

export function activityTransferChangeKey(transfer: VersionedIdentity) {
  return `transfers/activity-${versionIdentityKey(transfer)}.json`;
}

export function boundaryTransferChangeKey(boundary: 'arrival' | 'departure') {
  return `transfers/boundary-${boundary}.json`;
}

export function changeByKey(changes: readonly ItineraryChange[] | null | undefined, key: string) {
  return changes?.find((change) => change.key === key) ?? null;
}

export function detailsItineraryChange(changes: readonly ItineraryChange[] | null | undefined) {
  return changes?.find((change) => change.entity === 'details') ?? null;
}

export function removedDestinationChanges(changes: readonly ItineraryChange[] | null | undefined) {
  return (changes ?? []).filter(
    (change) => change.entity === 'destination' && change.change === 'removed'
  );
}

export function unplacedRemovedChanges(
  changes: readonly ItineraryChange[] | null | undefined,
  placedKeys: Iterable<string>
) {
  const placed = new Set(placedKeys);
  return (changes ?? []).filter(
    (change) =>
      change.entity !== 'packing' && change.change === 'removed' && !placed.has(change.key)
  );
}

export function highlightBadgeLabel(kind: ItineraryChangeKind) {
  if (kind === 'added') return 'New';
  if (kind === 'removed') return 'Removed from shared trip';
  return 'Changed';
}

function formatChangeMoney(value: object): string | null {
  const amount = (value as { amount?: unknown }).amount;
  return typeof amount === 'number' ? amount.toLocaleString() : null;
}

function formatChangeDuration(value: object): string | null {
  const duration = value as {
    idealDays?: unknown;
    minimumDays?: unknown;
    minutes?: unknown;
    totalDays?: unknown;
  };
  if (typeof duration.minutes === 'number') return `${duration.minutes} min`;
  if (typeof duration.totalDays === 'number') return `${duration.totalDays} days`;
  if (typeof duration.idealDays === 'number') return `${duration.idealDays} ideal days`;
  if (typeof duration.minimumDays === 'number') return `${duration.minimumDays} minimum days`;
  return null;
}

function formatChangeDestination(value: object): string | null {
  const destination = value as { name?: unknown; status?: unknown };
  if (destination.status === 'undecided') return 'Undecided';
  return typeof destination.name === 'string' ? destination.name : null;
}

function compactValue(format: ItineraryChangeField['format'], value: unknown): string {
  if (value === undefined || value === null || value === '') return 'Not set';
  const formatted = formatChangeObject(format, value);
  if (formatted) return formatted;
  if (format === 'travelMode' && typeof value === 'string') {
    return value.replace(/_/g, ' ');
  }
  if (format === 'schedule' && typeof value === 'object')
    return formatCompactSchedule(value) ?? 'Updated';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return 'Updated';
}

function formatChangeObject(format: ItineraryChangeField['format'], value: unknown): string | null {
  if (typeof value !== 'object' || !value) return null;
  const formatters = {
    destination: formatChangeDestination,
    duration: formatChangeDuration,
    money: formatChangeMoney
  };
  const formatter = formatters[format as keyof typeof formatters];
  return formatter?.(value) ?? null;
}

function formatCompactSchedule(value: object): string | null {
  const schedule = value as { day?: unknown; endDay?: unknown; startDay?: unknown };
  if (typeof schedule.startDay === 'number' && typeof schedule.endDay === 'number')
    return `Days ${schedule.startDay}–${schedule.endDay}`;
  return typeof schedule.day === 'number' ? `Day ${schedule.day}` : null;
}

export function itineraryChangeFieldRows(change: ItineraryChange): ItineraryChangeFieldRow[] {
  const rows: ItineraryChangeFieldRow[] = [];
  let mediaCount = 0;
  for (const field of change.fields) {
    if (field.display === 'media') {
      mediaCount += 1;
      continue;
    }
    if (field.display !== 'value') continue;
    rows.push({
      after: compactValue(field.format, field.after),
      before: compactValue(field.format, field.before),
      key: field.key,
      label: field.label
    });
  }
  if (mediaCount > 0) {
    rows.push({
      after: mediaCount === 1 ? 'Attachments updated' : 'Files updated',
      before: '',
      key: 'media',
      label: mediaCount === 1 ? 'Attachments' : 'Files'
    });
  }
  return rows;
}

export function compactChangeSummary(change: ItineraryChange) {
  return itineraryChangeFieldRows(change)
    .map((row) => {
      if (row.key === 'media') return row.after;
      if (change.change === 'added') return `${row.label}: ${row.after}`;
      if (change.change === 'removed') return `${row.label}: ${row.before}`;
      if (row.before === row.after) return row.label;
      return `${row.label}: ${row.before} → ${row.after}`;
    })
    .join(' · ');
}
