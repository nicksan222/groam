import type { TripAssistantContext } from '#convex/modules/assistant/model/schema';
import { getTrip, groupMemberCount } from '#convex/modules/travel/trips/index';
import type { Id } from '#convex-generated/dataModel';
import type { QueryCtx } from '#convex-generated/server';

/** Compact trip snapshot the assistant tools use as tagged context. */
// biome-ignore lint/complexity/noStaticOnlyClass: callers use this class, not loose functions
export class AssistantTripContext {
  static async load(ctx: QueryCtx, tripId: Id<'trips'>): Promise<TripAssistantContext> {
    const [trip, memberCount] = await Promise.all([
      getTrip(ctx, tripId),
      groupMemberCount(ctx, tripId)
    ]);
    return {
      archived: trip.archivedAt !== null,
      canEdit: trip.permissions.canEdit,
      costTargets: [
        ...(trip.arrivalTransfer
          ? [
              {
                amount: trip.arrivalTransfer.costAmount,
                id: trip.arrivalTransfer.id,
                kind: 'boundary_transfer' as const,
                label: 'Arrival travel',
                split: trip.arrivalTransfer.costSplit
              }
            ]
          : []),
        ...trip.destinations.flatMap((destination, destinationIndex) => [
          ...destination.stays.map((stay) => ({
            amount: stay.costAmount,
            id: stay.id,
            kind: 'stay' as const,
            label: `${stay.title} in ${destination.name}`,
            split: stay.costSplit
          })),
          ...destination.activities.flatMap((activity) => [
            {
              amount: activity.costAmount,
              id: activity.id,
              kind: 'activity' as const,
              label: `${activity.title} in ${destination.name}`,
              split: activity.costSplit
            },
            ...(activity.transferToNext
              ? [
                  {
                    amount: activity.transferToNext.costAmount,
                    id: activity.transferToNext.id,
                    kind: 'activity_transfer' as const,
                    label: `Travel after ${activity.title} in ${destination.name}`,
                    split: activity.transferToNext.costSplit
                  }
                ]
              : [])
          ]),
          ...(destination.transferToNext
            ? [
                {
                  amount: destination.transferToNext.costAmount,
                  id: destination.transferToNext.id,
                  kind: 'destination_transfer' as const,
                  label: `Travel from ${destination.name} to ${trip.destinations[destinationIndex + 1]?.name ?? 'the next stop'}`,
                  split: destination.transferToNext.costSplit
                }
              ]
            : [])
        ]),
        ...(trip.departureTransfer
          ? [
              {
                amount: trip.departureTransfer.costAmount,
                id: trip.departureTransfer.id,
                kind: 'boundary_transfer' as const,
                label: 'Return travel',
                split: trip.departureTransfer.costSplit
              }
            ]
          : [])
      ],
      currency: trip.currency,
      dateNotes: trip.dateNotes,
      destinations: trip.destinations.map((destination) => ({
        activities: destination.activities.map((activity) => ({
          cost: activity.costAmount,
          costSplit: activity.costSplit,
          day: activity.dayNumber,
          endDay: activity.endDayNumber,
          id: activity.id,
          timeBlock: activity.timeBlock,
          title: activity.title
        })),
        countryCode: destination.countryCode ?? null,
        endDay: destination.endDay,
        id: destination.id,
        name: destination.name,
        startDay: destination.startDay,
        stays: destination.stays.map((stay) => ({
          checkInDay: stay.checkInDay,
          checkOutDay: stay.checkOutDay,
          cost: stay.costAmount,
          costSplit: stay.costSplit,
          id: stay.id,
          title: stay.title
        }))
      })),
      groupMemberCount: memberCount,
      initialBudget: trip.initialBudget,
      primaryDestination: trip.destination.status === 'known' ? trip.destination.name : null,
      proposalStatus: trip.proposal?.status ?? null,
      startDate: trip.startDate,
      totalDurationDays: trip.totalDurationDays,
      totalPlannedCost: trip.totalPlannedCost,
      tripName: trip.name
    };
  }
}
