import { addIsoDays, type PlanCalendarEvent } from '@groam/ui/lib/plan-calendar';
import type {
  PlannerCalendar,
  PlannerCalendarDetail,
  PlannerEntry,
  PlannerTrip,
  TravelAnchor,
  TripPlanner
} from '@/types/trip-planner';

function clock(minutes: number): { dayOffset: number; time: string } {
  const inDay = ((minutes % 1440) + 1440) % 1440;
  const hours = String(Math.floor(inDay / 60)).padStart(2, '0');
  return {
    dayOffset: Math.floor(minutes / 1440),
    time: `${hours}:${String(inDay % 60).padStart(2, '0')}`
  };
}

/** A travel leg with a start time but no arrival ends after its stated travel time. */
function travelArrival(entry: PlannerEntry): { endDay: number | null; endTime: string | null } {
  if (entry.kind !== 'travel' || entry.endTime || !entry.startTime || entry.startDay === null)
    return { endDay: entry.endDay, endTime: entry.endTime };
  const minutes = entry.transfer.durationMinutes;
  if (minutes === null) return { endDay: entry.endDay, endTime: null };
  const [hours = 0, mins = 0] = entry.startTime.split(':').map(Number);
  const arrival = clock(hours * 60 + mins + minutes);
  return { endDay: entry.startDay + arrival.dayOffset, endTime: arrival.time };
}

function entryEvent(entry: PlannerEntry, dateOf: (day: number) => string): PlanCalendarEvent {
  const startDay = entry.startDay ?? 1;
  const { endDay, endTime } = travelArrival(entry);
  return {
    id: entry.key,
    title: entry.title,
    tone: entry.kind,
    location: entry.location,
    ...(entry.kind === 'activity' && entry.activity.notes ? { notes: entry.activity.notes } : {}),
    startDate: dateOf(startDay),
    endDate: dateOf(endDay ?? startDay),
    startTime: entry.startTime,
    endTime
  };
}

/**
 * The calendar event for one planner entry, or null when it has no day. A stay is one span from
 * check-in to check-out, kept on its check-in entry instead of two separate moments.
 */
function plannerEntryEvent(
  entry: PlannerEntry,
  dateOf: (day: number) => string
): PlanCalendarEvent | null {
  if (entry.startDay === null) return null;
  if (entry.kind !== 'stay') return entryEvent(entry, dateOf);
  if (!entry.key.startsWith('check_in-')) return null;
  return {
    id: `stay-${entry.stay.id}`,
    title: entry.stay.title,
    tone: 'stay',
    location: entry.location,
    ...(entry.stay.notes ? { notes: entry.stay.notes } : {}),
    startDate: dateOf(entry.stay.checkInDay),
    endDate: dateOf(entry.stay.checkOutDay)
  };
}

/**
 * Travel nobody timed still happens: a leg between plans leaves once the first ends, a leg between
 * stops on the last day at the first stop, and the trip's own arrival and departure on its first
 * and last days. Keyed like planner entries, `travel-<id>`.
 */
function travelAnchors(trip: PlannerTrip, lastDay: number): Map<string, TravelAnchor> {
  const anchors = new Map<string, TravelAnchor>();
  trip.destinations.forEach((destination, index) => {
    destination.activities.forEach((activity, at) => {
      const day = activity.endDayNumber ?? activity.dayNumber;
      if (activity.transferToNext && destination.activities[at + 1] && day !== null)
        anchors.set(`travel-${activity.transferToNext.id}`, { day, time: activity.endTime });
    });
    const next = trip.destinations[index + 1];
    const day = destination.endDay ?? next?.startDay ?? null;
    if (destination.transferToNext && next && day !== null)
      anchors.set(`travel-${destination.transferToNext.id}`, { day, time: null });
  });
  const firstDay = trip.destinations[0]?.startDay ?? 1;
  if (trip.arrivalTransfer)
    anchors.set(`travel-${trip.arrivalTransfer.id}`, { day: firstDay, time: null });
  if (trip.departureTransfer)
    anchors.set(`travel-${trip.departureTransfer.id}`, { day: lastDay, time: null });
  return anchors;
}

/** A travel leg without a day, placed where its anchor says it leaves. */
function anchoredEntry(entry: PlannerEntry, anchors: Map<string, TravelAnchor>): PlannerEntry {
  if (entry.kind !== 'travel' || entry.startDay !== null) return entry;
  const anchor = anchors.get(entry.key);
  if (!anchor) return entry;
  return {
    ...entry,
    startDay: anchor.day,
    endDay: anchor.day,
    startTime: anchor.time,
    endTime: null
  };
}

/** Where an undated trip's Day 1 sits on the grid: a Monday, so a week view starts on it. */
const UNDATED_ANCHOR = '2001-01-01';

/**
 * A trip as calendar events: each destination and stay as one span across its days,
 * activities and travel at their times. Travel without a day goes where it leaves from (see
 * `travelAnchors`); other plans without a day stay off it. An undated trip is laid out from a
 * placeholder Monday and marked `undated`, so only "Day N" is shown.
 */
export function buildTripPlanCalendar(
  trip: PlannerTrip & { startDate: string | null },
  planner: TripPlanner
): PlannerCalendar {
  const tripStartDate = trip.startDate;
  const startDate = tripStartDate ?? UNDATED_ANCHOR;
  const lastDay = Math.max(1, planner.days.length);
  const anchors = travelAnchors(trip, lastDay);
  const dateOf = (day: number) => addIsoDays(startDate, day - 1);
  const events: PlanCalendarEvent[] = [];
  const details: Record<string, PlannerCalendarDetail> = {};
  const destinations = new Map(
    planner.days.flatMap((day) => day.destinations).map((place) => [place.id, place])
  );
  for (const destination of destinations.values()) {
    if (destination.startDay === null || destination.endDay === null) continue;
    const id = `place-${destination.id}`;
    events.push({
      id,
      title: destination.name,
      tone: 'place',
      ...(destination.dayNotes ? { notes: destination.dayNotes } : {}),
      startDate: dateOf(destination.startDay),
      endDate: dateOf(destination.endDay)
    });
    details[id] = { kind: 'place', destination };
  }
  for (const planned of planner.entries) {
    const entry = anchoredEntry(planned, anchors);
    const event = plannerEntryEvent(entry, dateOf);
    if (!event) continue;
    events.push(event);
    details[event.id] = { kind: 'entry', entry };
  }
  return {
    startDate,
    endDate: dateOf(lastDay),
    events,
    details,
    undated: !tripStartDate
  };
}
