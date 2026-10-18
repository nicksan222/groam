import { transportModeFor } from '@/features/trips/trip-transfer-options';
import type {
  PlannerDay,
  PlannerEntry,
  PlannerPeriod,
  PlannerTrip,
  TripPlanner
} from '@/types/trip-planner';
import type { TransferView } from '@/types/trips';

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
  if (first) addTravel(entries, trip.arrivalTransfer, 'Arrival', first.name);
  if (last) addTravel(entries, trip.departureTransfer, last.name, 'Departure');
  const days = plannerDays(trip, entries);
  return {
    days,
    unscheduledDestinations: trip.destinations.filter(
      (destination) => destination.startDay === null
    ),
    unscheduledTravel: entries.filter((entry) => entry.startDay === null)
  };
}

function addTravel(
  entries: PlannerEntry[],
  transfer: (TransferView & { id: string }) | null,
  from: string,
  to: string
) {
  if (!transfer) return;
  entries.push({
    key: `travel-${transfer.id}`,
    kind: 'travel',
    transfer,
    title: `${transportModeFor(transfer.mode).label} · ${from} → ${to}`,
    location: 'Travel',
    startDay: transfer.timing?.startDay ?? null,
    endDay: transfer.timing?.endDay ?? null,
    startTime: transfer.timing?.startTime ?? null,
    endTime: transfer.timing?.endTime ?? null,
    period: 'full_day'
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
      period: activity.timeBlock
    });
    const next = destination.activities[index + 1];
    if (next) addTravel(entries, activity.transferToNext, activity.title, next.title);
  });
  if (nextDestination)
    addTravel(entries, destination.transferToNext, destination.name, nextDestination.name);
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
      stay,
      title: `${checkIn ? 'Check in' : 'Check out'} · ${stay.title}`,
      location,
      startDay: day,
      endDay: day,
      startTime: checkIn ? stay.checkInTime : stay.checkOutTime,
      endTime: null,
      period: 'full_day'
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
