import type { TripDetail } from '@/features/trips/hooks/use-trips';

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function icsDay(startDate: string, dayNumber: number): string {
  const date = new Date(`${startDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + dayNumber - 1);
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}`;
}

function escapeIcs(value: string) {
  return value
    .replace(/\\/gu, '\\\\')
    .replace(/;/gu, '\\;')
    .replace(/,/gu, '\\,')
    .replace(/\r\n|\r|\n/gu, '\\n');
}

function icsUtcTimestamp(date: Date) {
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;
}

function foldIcsLine(line: string) {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) return line;
  const chunks: string[] = [];
  let remaining = [...line];
  let limit = 75;
  while (encoder.encode(remaining.join('')).length > limit) {
    let splitChars = remaining.length;
    while (
      splitChars > 0 &&
      encoder.encode(remaining.slice(0, splitChars).join('')).length > limit
    ) {
      splitChars -= 1;
    }
    if (splitChars === 0) splitChars = 1;
    chunks.push(remaining.slice(0, splitChars).join(''));
    remaining = remaining.slice(splitChars);
    limit = 74;
  }
  chunks.push(remaining.join(''));
  return chunks.map((chunk, index) => (index === 0 ? chunk : ` ${chunk}`)).join('\r\n');
}

function allDayEvent({
  endExclusive,
  start,
  summary,
  uid,
  dtstamp
}: {
  endExclusive: string;
  start: string;
  summary: string;
  uid: string;
  dtstamp: string;
}) {
  return [
    'BEGIN:VEVENT',
    `UID:${escapeIcs(uid)}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART;VALUE=DATE:${start}`,
    `DTEND;VALUE=DATE:${endExclusive}`,
    `SUMMARY:${escapeIcs(summary)}`,
    'END:VEVENT'
  ]
    .map(foldIcsLine)
    .join('\r\n');
}

export function tripCalendarIcs(
  trip: Pick<TripDetail, 'destinations' | 'name' | 'startDate'>,
  now = new Date()
): string | null {
  if (!trip.startDate) return null;
  const dtstamp = icsUtcTimestamp(now);
  const events: string[] = [];
  for (const destination of trip.destinations) {
    if (destination.startDay !== null && destination.endDay !== null) {
      events.push(
        allDayEvent({
          summary: `${trip.name} · ${destination.name}`,
          start: icsDay(trip.startDate, destination.startDay),
          endExclusive: icsDay(trip.startDate, destination.endDay + 1),
          uid: `groam-destination-${destination.id}@groam.local`,
          dtstamp
        })
      );
    }
    for (const activity of destination.activities) {
      events.push(
        allDayEvent({
          summary: `${destination.name} · ${activity.title}`,
          start: icsDay(trip.startDate, activity.dayNumber),
          endExclusive: icsDay(trip.startDate, activity.endDayNumber + 1),
          uid: `groam-activity-${activity.id}@groam.local`,
          dtstamp
        })
      );
    }
  }
  if (events.length === 0) return null;
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Groam//Trip//EN',
    ...events,
    'END:VCALENDAR'
  ].join('\r\n');
}

export function downloadTripCalendar(
  trip: Pick<TripDetail, 'destinations' | 'name' | 'startDate'>
): boolean {
  const ics = tripCalendarIcs(trip);
  if (!ics) return false;
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const href = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = href;
  link.download = `${trip.name.replace(/[^\w-]+/gu, '-').toLowerCase() || 'trip'}.ics`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(href);
  return true;
}
