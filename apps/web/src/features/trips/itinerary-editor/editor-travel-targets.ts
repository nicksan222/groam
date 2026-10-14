import type { EditorTravelTarget } from '@/types/itinerary-editor';
import type { PlannerEntry } from '@/types/trip-planner';
import type { TripDetail } from '@/types/trips';

export function targetForTravel(trip: TripDetail, entry: PlannerEntry): EditorTravelTarget | null {
  if (entry.kind !== 'travel') return null;
  if (trip.arrivalTransfer === entry.transfer) return { kind: 'arrival' };
  if (trip.departureTransfer === entry.transfer) return { kind: 'departure' };
  for (const destination of trip.destinations) {
    if (destination.transferToNext === entry.transfer)
      return { kind: 'destination', fromId: destination.id };
    for (const activity of destination.activities) {
      if (activity.transferToNext === entry.transfer)
        return { kind: 'activity', fromId: activity.id };
    }
  }
  return null;
}

export function travelChoicesForDay(
  trip: TripDetail,
  day: number
): Array<{ label: string; target: EditorTravelTarget }> {
  const choices: Array<{ label: string; target: EditorTravelTarget }> = [];
  const first = trip.destinations[0];
  const last = trip.destinations.at(-1);
  // Boundary travel may sit on any day the travel form accepts, so trips with open
  // days before the first stop or after the last one can still add it.
  if (first && !trip.arrivalTransfer && day <= (first.startDay ?? 1))
    choices.push({ label: `Getting to ${first.name}`, target: { kind: 'arrival' } });
  trip.destinations.forEach((destination, index) => {
    const next = trip.destinations[index + 1];
    if (next && !destination.transferToNext && destination.endDay === day)
      choices.push({
        label: `${destination.name} → ${next.name}`,
        target: { kind: 'destination', fromId: destination.id }
      });
    destination.activities.forEach((activity, activityIndex) => {
      const following = destination.activities[activityIndex + 1];
      if (following && !activity.transferToNext && activity.endDayNumber === day)
        choices.push({
          label: `${activity.title} → ${following.title}`,
          target: { kind: 'activity', fromId: activity.id }
        });
    });
  });
  if (
    last &&
    !trip.departureTransfer &&
    day >= (last.endDay ?? 1) &&
    day <= (trip.totalDurationDays ?? last.endDay ?? 1)
  )
    choices.push({ label: `Getting home from ${last.name}`, target: { kind: 'departure' } });
  return choices;
}

/** The day an untimed transfer is shown on, so it stays editable in the day editor. */
export function untimedTravelDay(trip: TripDetail, target: EditorTravelTarget): number {
  if (target.kind === 'arrival') return trip.destinations[0]?.startDay ?? 1;
  if (target.kind === 'departure') return trip.destinations.at(-1)?.endDay ?? 1;
  for (const destination of trip.destinations) {
    if (target.kind === 'destination' && destination.id === target.fromId)
      return destination.endDay ?? 1;
    const activity =
      target.kind === 'activity'
        ? destination.activities.find((item) => item.id === target.fromId)
        : undefined;
    if (activity) return activity.endDayNumber ?? activity.dayNumber ?? 1;
  }
  return 1;
}
