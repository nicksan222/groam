import type { CreateTripPlan } from '@groam/app-actions/backend';
import { buildTripPlans } from './build-trip-plans';
import { seedActivityTitles } from './seed-activity-titles';

function seedActivitiesFor(
  stops: Array<{ endDay?: number; name: string; startDay?: number }>
): CreateTripPlan['activities'] {
  return stops.flatMap((stop, destinationIndex) => {
    const dayNumber = stop.startDay ?? 1;
    const lastDay = stop.endDay ?? dayNumber;
    const middleDay = Math.min(lastDay, dayNumber + 1);
    return [
      {
        destinationIndex,
        input: {
          notes: `Explore ${stop.name} at an easy pace. Keep this optional if arrival is delayed; use step-free routes where possible.`,
          schedule: { day: dayNumber, timeBlock: 'morning' as const },
          title: seedActivityTitles[0]
        }
      },
      {
        destinationIndex,
        input: {
          notes:
            'Illustrative dinner plan: check vegetarian options, step-free access and the cancellation policy before making a reservation. Nothing is booked.',
          schedule: { day: Math.max(dayNumber, lastDay - 1), timeBlock: 'evening' as const },
          title: seedActivityTitles[1]
        }
      },
      {
        destinationIndex,
        input: {
          title: 'Check in, unpack, and orient the group',
          notes:
            'Save the lodging address offline. Check luggage storage and access before arrival; no reservation is implied by this example.',
          schedule: { day: dayNumber, timeBlock: 'afternoon' as const }
        }
      },
      {
        destinationIndex,
        input: {
          title: `Market breakfast in ${stop.name.split(',')[0]}`,
          notes:
            'Budget for an inexpensive breakfast. One vegetarian and one gluten-free option needed; split up for free time afterwards.',
          schedule: {
            day: middleDay,
            timeBlock: 'morning' as const,
            startTime: '08:30',
            endTime: '09:30'
          }
        }
      },
      {
        destinationIndex,
        input: {
          title: 'Culture stop or indoor weather backup',
          notes:
            'Choose the shortlist from linked research. Confirm opening days and ticket terms; keep the afternoon flexible if the group needs rest.',
          schedule: { day: middleDay, timeBlock: 'afternoon' as const }
        }
      },
      {
        destinationIndex,
        input: {
          title: 'Pack up and leave a transfer buffer',
          notes:
            'Check the next departure with the operator. Allow time for bags, mobility needs, and a meal; this is an example plan, not a confirmed timetable.',
          schedule: {
            day: lastDay,
            timeBlock: 'morning' as const,
            startTime: '10:00',
            endTime: '11:00'
          }
        }
      }
    ];
  });
}

export function buildWorkspaceSeedPlans(tripCount: number): CreateTripPlan[] {
  return buildTripPlans(tripCount).map(buildWorkspaceSeedPlan);
}

function buildWorkspaceSeedPlan(plan: ReturnType<typeof buildTripPlans>[number], index: number) {
  const known = plan.create.destination.status === 'known' ? plan.create.destination : undefined;
  const primary = known
    ? {
        dayNotes:
          'Base for the first part of the trip. Balance booked activities with independent time.',
        endDay:
          plan.additionalDestinations[0]?.schedule?.startDay === undefined
            ? (plan.create.duration?.totalDays ?? 5)
            : plan.additionalDestinations[0].schedule.startDay,
        startDay: 1
      }
    : undefined;
  const activities = seedActivitiesFor([
    ...(known ? [{ endDay: primary?.endDay, name: known.name, startDay: 1 }] : []),
    ...plan.additionalDestinations.map((stop) => ({
      endDay: stop.schedule?.endDay,
      name: stop.name,
      startDay: stop.schedule?.startDay
    }))
  ]);
  const proposal = workspaceProposal(plan.archived, index, known);
  return {
    activities,
    additionalDestinations: plan.additionalDestinations,
    archived: plan.archived,
    create: plan.create,
    ...(primary ? { primary } : {}),
    ...(proposal ? { proposal } : {})
  };
}

function workspaceProposal(archived: boolean, index: number, known: { name: string } | undefined) {
  if (archived || index % 3 !== 0 || !known) return undefined;
  return {
    notes:
      'Swap one busy afternoon for an accessible indoor option. Keep the existing dinner slot, budget, and travel buffers; review the source information before applying.',
    title:
      index % 2 === 0
        ? 'Add a weather-safe cultural afternoon'
        : 'Give the arrival day more breathing room'
  };
}
