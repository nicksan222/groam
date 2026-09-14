import type { CreateTripPlan } from '@groam/app-actions/backend';
import { buildTripPlans } from './build-trip-plans';
import { seedActivityTitles } from './seed-activity-titles';

function seedActivitiesFor(
  stops: Array<{ endDay?: number; name: string; startDay?: number }>
): CreateTripPlan['activities'] {
  return stops.flatMap((stop, destinationIndex) => {
    const dayNumber = stop.startDay ?? 1;
    return [
      {
        destinationIndex,
        input: {
          notes: `A relaxed introduction to ${stop.name}`,
          schedule: { day: dayNumber, timeBlock: 'morning' as const },
          title: seedActivityTitles[0]
        }
      },
      {
        destinationIndex,
        input: {
          notes: 'Pick a local favorite and book if needed',
          schedule: { day: stop.endDay ?? dayNumber, timeBlock: 'evening' as const },
          title: seedActivityTitles[1]
        }
      }
    ];
  });
}

export function buildWorkspaceSeedPlans(tripCount: number): CreateTripPlan[] {
  return buildTripPlans(tripCount).map((plan, index) => {
    const known = plan.create.destination.status === 'known' ? plan.create.destination : undefined;
    const primary = known
      ? { dayNotes: 'Arrive and explore the first stop', endDay: 2, startDay: 1 }
      : undefined;
    const activities = seedActivitiesFor([
      ...(known ? [{ endDay: 2, name: known.name, startDay: 1 }] : []),
      ...plan.additionalDestinations.map((stop) => ({
        endDay: stop.schedule?.endDay,
        name: stop.name,
        startDay: stop.schedule?.startDay
      }))
    ]);
    const proposal =
      !plan.archived && index % 3 === 0 && known
        ? {
            notes: 'A proposed addition for the group to review',
            title: index % 2 === 0 ? 'Add a local highlight' : 'Refine the first day'
          }
        : undefined;
    return {
      activities,
      additionalDestinations: plan.additionalDestinations,
      archived: plan.archived,
      create: plan.create,
      ...(primary ? { primary } : {}),
      ...(proposal ? { proposal } : {})
    };
  });
}
