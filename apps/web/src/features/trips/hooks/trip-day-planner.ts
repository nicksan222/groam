import { boundaryEnds, transferLabel } from '@groam/backend/convex/modules/travel/transfers/labels';
import { transportModeFor } from '@/features/trips/trip-transfer-options';
import type { IssueFlagTarget, IssueSubject } from '@/types/issues';
import type {
  PlannerDay,
  PlannerEntry,
  PlannerPeriod,
  PlannerTrip,
  TripPlanner
} from '@/types/trip-planner';
import type { Stay, TransferView } from '@/types/trips';

export const plannerPeriods: Array<{ key: PlannerPeriod; label: string }> = [
  { key: 'full_day', label: 'Flexible & all day' },
  { key: 'morning', label: 'Morning' },
  { key: 'afternoon', label: 'Afternoon' },
  { key: 'evening', label: 'Evening' }
];

function timePeriod(time: string | null, fallback: PlannerPeriod): PlannerPeriod {
  if (!time) return fallback;
  const hour = Number(time.split(':')[0]);
  return hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
}

export function entryPeriod(entry: PlannerEntry, day: number): PlannerPeriod {
  if (entry.startDay !== day) return 'full_day';
  return timePeriod(entry.startTime, entry.period);
}

export function entryTime(entry: PlannerEntry, day: number): string {
  if (entry.startDay === null) return 'Day open';
  if (entry.startDay !== day) {
    return entry.endDay === day && entry.endTime ? `Until ${entry.endTime}` : 'Continues';
  }
  if (!entry.startTime) return entry.period === 'full_day' ? 'Flexible' : 'Time open';
  if (entry.endDay !== day) return `${entry.startTime} →`;
  return entry.endTime ? `${entry.startTime}–${entry.endTime}` : entry.startTime;
}

const dayDateFormatter = new Intl.DateTimeFormat('en', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC'
});

export function plannerDate(startDate: string | null, day: number): string | null {
  if (!startDate) return null;
  const date = new Date(`${startDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + day - 1);
  return dayDateFormatter.format(date);
}

export function buildTripPlanner(trip: PlannerTrip): TripPlanner {
  const entries: PlannerEntry[] = [];
  trip.destinations.forEach((destination, index) => {
    addDestinationEntries(entries, destination, trip.destinations[index + 1]);
  });
  const first = trip.destinations[0];
  const last = trip.destinations.at(-1);
  if (first && last) {
    const ends = (boundary: 'arrival' | 'departure') =>
      boundaryEnds(boundary, first.name, last.name);
    addTravel(entries, trip.arrivalTransfer, (id) => ({ id, type: 'boundary_transfer' }), {
      ...ends('arrival'),
      topic: (mode) => `the arrival ${mode}`
    });
    addTravel(entries, trip.departureTransfer, (id) => ({ id, type: 'boundary_transfer' }), {
      ...ends('departure'),
      topic: (mode) => `the departure ${mode}`
    });
  }
  const days = plannerDays(trip, entries);
  return {
    days,
    entries,
    unscheduledDestinations: trip.destinations.filter(
      (destination) => destination.startDay === null
    ),
    unscheduledTravel: entries.filter((entry) => entry.startDay === null)
  };
}

function addTravel<TransferId extends string>(
  entries: PlannerEntry[],
  transfer: (TransferView & { id: TransferId }) | null,
  subjectOf: (id: TransferId) => IssueSubject,
  route: { from: string; to: string; topic?: (mode: string) => string }
) {
  if (!transfer) return;
  const mode = transportModeFor(transfer.mode).label.toLowerCase();
  entries.push({
    key: `travel-${transfer.id}`,
    kind: 'travel',
    transfer,
    title: transferLabel(transfer.mode, route.from, route.to),
    location: 'Travel',
    startDay: transfer.timing?.startDay ?? null,
    endDay: transfer.timing?.endDay ?? null,
    startTime: transfer.timing?.startTime ?? null,
    endTime: transfer.timing?.endTime ?? null,
    period: 'full_day',
    flag: {
      label: transferLabel(transfer.mode, route.from, route.to),
      subject: subjectOf(transfer.id),
      topic: route.topic ? route.topic(mode) : `the ${mode} to ${route.to}`
    }
  });
}

function addDestinationEntries(
  entries: PlannerEntry[],
  destination: PlannerTrip['destinations'][number],
  nextDestination: PlannerTrip['destinations'][number] | undefined
) {
  for (const stay of destination.stays) addStayEntries(entries, destination.name, stay);
  destination.activities.forEach((activity, index) => {
    entries.push({
      key: `activity-${activity.id}`,
      kind: 'activity',
      activity,
      title: activity.title,
      location: destination.name,
      startDay: activity.dayNumber,
      endDay: activity.endDayNumber,
      startTime: activity.startTime,
      endTime: activity.endTime,
      period: activity.timeBlock,
      flag: {
        label: activity.title,
        subject: { id: activity.id, type: 'activity' },
        topic: activity.title
      }
    });
    const next = destination.activities[index + 1];
    if (next)
      addTravel(entries, activity.transferToNext, (id) => ({ id, type: 'activity_transfer' }), {
        from: activity.title,
        to: next.title
      });
  });
  if (nextDestination)
    addTravel(entries, destination.transferToNext, (id) => ({ id, type: 'destination_transfer' }), {
      from: destination.name,
      to: nextDestination.name
    });
}

function addStayEntries(
  entries: PlannerEntry[],
  location: string,
  stay: PlannerTrip['destinations'][number]['stays'][number]
) {
  for (const event of ['check_in', 'check_out'] as const) {
    const checkIn = event === 'check_in';
    const day = checkIn ? stay.checkInDay : stay.checkOutDay;
    entries.push({
      key: `${event}-${stay.id}`,
      kind: 'stay',
      event,
      stay,
      title: `${checkIn ? 'Check in' : 'Check out'} · ${stay.title}`,
      location,
      startDay: day,
      endDay: day,
      startTime: checkIn ? stay.checkInTime : stay.checkOutTime,
      endTime: null,
      period: 'full_day',
      flag: stayFlagTarget(stay)
    });
  }
}

function plannerDays(trip: PlannerTrip, entries: PlannerEntry[]): PlannerDay[] {
  const lastDay = Math.max(
    trip.totalDurationDays ?? 0,
    ...trip.destinations.flatMap((destination) => [
      destination.endDay ?? 0,
      ...destination.stays.map((stay) => stay.checkOutDay)
    ]),
    ...entries.map((entry) => entry.endDay ?? 0)
  );
  return Array.from({ length: lastDay }, (_, index) => buildPlannerDay(index + 1, trip, entries));
}

function buildPlannerDay(day: number, trip: PlannerTrip, entries: PlannerEntry[]): PlannerDay {
  const destinations = trip.destinations.filter(
    (destination) =>
      destination.startDay !== null &&
      destination.endDay !== null &&
      destination.startDay <= day &&
      destination.endDay >= day
  );
  const stays = trip.destinations.flatMap((destination) =>
    destination.stays.flatMap((stay) =>
      stay.checkInDay <= day && stay.checkOutDay > day ? [{ stay, destination }] : []
    )
  );
  const dayEntries = entries.filter(
    (entry) =>
      entry.startDay !== null &&
      entry.endDay !== null &&
      entry.startDay <= day &&
      entry.endDay >= day
  );
  dayEntries.sort((a, b) =>
    (a.startDay === day ? (a.startTime ?? '99:99') : '00:00').localeCompare(
      b.startDay === day ? (b.startTime ?? '99:99') : '00:00'
    )
  );
  return { day, destinations, entries: dayEntries, stays };
}

/** Flagging a stay, from its overnight card or a check-in or check-out: the stay, not the event. */
export function stayFlagTarget(stay: Pick<Stay, 'id' | 'title'>): IssueFlagTarget {
  return { label: stay.title, subject: { id: stay.id, type: 'stay' }, topic: stay.title };
}
