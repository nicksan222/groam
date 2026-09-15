import type { VisualDiffField } from '@/features/trips/trip-versions/proposal-types';

const mediumDateTime = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });
const relativeCommentTime = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

export function isEmptyDiffField(field: VisualDiffField, side: 'after' | 'before') {
  if (field.display === 'media') {
    return (side === 'before' ? field.mediaBefore : field.mediaAfter).length === 0;
  }
  const value = side === 'before' ? field.before : field.after;
  if (value === undefined || value === null || value === '') return true;
  return Array.isArray(value) && value.length === 0;
}

export function formatDiffValue(format: VisualDiffField['format'], value: unknown): string | null {
  if (value === null || value === undefined || format === null || format === 'text') return null;
  if (format === 'date' && typeof value === 'string') {
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.valueOf()) ? value : mediumDateTime.format(date);
  }
  if (format === 'money' && typeof value === 'object') {
    const amount = (value as { amount?: unknown }).amount;
    return typeof amount === 'number' ? amount.toLocaleString() : null;
  }
  if (format === 'duration' && typeof value === 'object') {
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
  }
  if (format === 'destination' && typeof value === 'object') {
    const destination = value as { name?: unknown; status?: unknown };
    return destination.status === 'undecided'
      ? 'Undecided'
      : typeof destination.name === 'string'
        ? destination.name
        : null;
  }
  if (format === 'travelMode' && typeof value === 'string') {
    return fieldLabel(value);
  }
  if (format === 'schedule' && typeof value === 'object') return formatSchedule(value);
  return null;
}

function formatSchedule(value: object) {
  const schedule = value as Record<string, unknown>;
  const entries = Object.entries(schedule).filter(
    ([, item]) => item !== undefined && item !== null
  );
  return entries
    .map(([key, item]) =>
      key === 'timeBlock' ? fieldLabel(String(item)) : `${fieldLabel(key)} ${String(item)}`
    )
    .join(' · ');
}

export function formatVisualValue(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (value === null || value === undefined) return 'Not set';
  if (typeof value !== 'object') return String(value);
  return Object.entries(value as Record<string, unknown>)
    .filter(([, nested]) => nested !== undefined && nested !== null)
    .map(([key, nested]) => `${fieldLabel(key)}: ${formatVisualValue(nested)}`)
    .join(' · ');
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fieldLabel(value: string) {
  return value
    .replace(/([a-z])([A-Z])/gu, '$1 $2')
    .replace(/[_-]+/gu, ' ')
    .replace(/^./u, (character) => character.toLocaleUpperCase());
}

export function formatDate(timestamp: number) {
  return mediumDateTime.format(timestamp);
}

export function formatCommentTime(timestamp: number, now = Date.now()) {
  const deltaMs = timestamp - now;
  const minutes = Math.round(deltaMs / 60_000);
  if (Math.abs(minutes) < 1) return 'just now';
  if (Math.abs(minutes) < 60) return relativeCommentTime.format(minutes, 'minute');
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return relativeCommentTime.format(hours, 'hour');
  const days = Math.round(hours / 24);
  if (Math.abs(days) < 30) return relativeCommentTime.format(days, 'day');
  return mediumDateTime.format(timestamp);
}
