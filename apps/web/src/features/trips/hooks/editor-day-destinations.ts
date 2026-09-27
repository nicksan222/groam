import type { PlannerDay } from '@/types/trip-planner';
import type { Destination } from '@/types/trips';

/** An unscheduled stop can be planned on any day; scheduled stops must contain it. */
export function destinationsForDay(destinations: Destination[], day: number): Destination[] {
  return destinations.filter(
    (destination) =>
      destination.startDay === null ||
      destination.endDay === null ||
      (destination.startDay <= day && destination.endDay >= day)
  );
}

export function editorDayDestinations(day: PlannerDay, destinations: Destination[]) {
  const visible = destinations.filter(
    (stop) =>
      day.destinations.some((item) => item.id === stop.id) ||
      day.stays.some((item) => item.destination.id === stop.id) ||
      day.entries.some((entry) =>
        entry.kind === 'activity'
          ? stop.activities.some((activity) => activity.id === entry.activity.id)
          : entry.kind === 'stay' && stop.stays.some((stay) => stay.id === entry.stay.id)
      )
  );
  if (visible.length) return visible;
  return destinations.length === 1 && destinations[0].startDay === null ? destinations : [];
}
