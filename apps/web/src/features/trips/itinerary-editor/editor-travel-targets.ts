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
  if (day === 1 && first && !trip.arrivalTransfer)
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
  if (last && !trip.departureTransfer && day === (trip.totalDurationDays ?? last.endDay))
    choices.push({ label: `Getting home from ${last.name}`, target: { kind: 'departure' } });
  return choices;
}
