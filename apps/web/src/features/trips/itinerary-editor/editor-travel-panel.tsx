import { Button } from '@groam/ui/components/button';
import Shell from '@groam/ui/components/shell/client';
import { activityTransferChangeKey } from '@/features/trips/hooks/itinerary-proposal-changes';
import { useItineraryProposalChangeList } from '@/features/trips/hooks/use-itinerary-proposal-changes';
import { ItineraryProposalHighlight } from '@/features/trips/itinerary-proposal-highlight/itinerary-proposal-highlight';
import {
  activityDaysNeedReordering,
  activityReorderClearsTravel
} from '@/features/trips/trip-activity/trip-activity-order';
import { BoundaryConnection } from '@/features/trips/trip-destinations/boundary-connection';
import { DestinationTravelLeg } from '@/features/trips/trip-destinations/destination-travel-leg';
import { TripTransferEditor } from '@/features/trips/trip-destinations/trip-transfer-editor';
import { useAsyncPending } from '@/features/workspace/hooks/use-async-pending';
import { useConfirm } from '@/features/workspace/workspace-shell/use-confirm-dialog';
import type { Destination, TripActivityActions, TripDetail } from '@/types/trips';

export function EditorTravelPanel({
  trip,
  destination,
  actions
}: {
  trip: TripDetail;
  destination: Destination;
  actions: TripActivityActions;
}) {
  const index = trip.destinations.findIndex((item) => item.id === destination.id);
  const changes = useItineraryProposalChangeList();
  const pending = useAsyncPending();
  const confirm = useConfirm();
  const reorder = async () => {
    if (
      activityReorderClearsTravel(destination.activities) &&
      !(await confirm(
        'Reorder activity days?',
        'Connections between activities that are no longer neighbors will be removed.'
      ))
    )
      return;
    await pending.run(() => actions.reorderActivities(destination.id));
  };
  return (
    <div className="space-y-5">
      {index === 0 ? (
        <BoundaryConnection
          actions={actions}
          boundary="arrival"
          canManage
          currency={trip.currency}
          destination={destination}
          maximumDay={destination.startDay ?? 1}
          minimumDay={1}
          startDate={trip.startDate}
          transfer={trip.arrivalTransfer}
        />
      ) : null}
      <Shell.Card as="section" padding="md">
        <h3 className="text-sm font-semibold">Getting around {destination.name}</h3>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          Connect activities with walking, transit, or other travel.
        </p>
        {activityDaysNeedReordering(destination.activities) ? (
          <Button
            disabled={pending.isPending}
            variant="outline"
            className="mt-3"
            onClick={() => void reorder()}
          >
            Reorder activity days
          </Button>
        ) : null}
        {destination.activities.length < 2 ? (
          <p className="mt-5 text-sm text-muted-foreground">
            Add at least two activities to plan travel between them.
          </p>
        ) : null}
        {destination.activities.map((activity, activityIndex) => {
          const next = destination.activities[activityIndex + 1];
          if (!next) return null;
          const transfer =
            activity.transferToNext?.toActivityId === next.id ? activity.transferToNext : null;
          if (activity.endDayNumber > next.dayNumber && !transfer)
            return (
              <p key={activity.id} className="mt-4 text-sm text-muted-foreground">
                {activity.title} and {next.title} overlap. Adjust their days before connecting them.
              </p>
            );
          return (
            <div className="mt-5" key={activity.id}>
              <p className="mb-2 text-sm font-medium">
                {activity.title} → {next.title}
              </p>
              <ItineraryProposalHighlight
                change={
                  transfer
                    ? (changes?.find(
                        (change) => change.key === activityTransferChangeKey(transfer)
                      ) ?? null)
                    : null
                }
              >
                <TripTransferEditor
                  canManage
                  currency={trip.currency}
                  fromLabel={activity.title}
                  toLabel={next.title}
                  kind="activity"
                  maximumDay={next.dayNumber}
                  minimumDay={activity.endDayNumber}
                  onRemove={() =>
                    transfer ? actions.removeActivityTransfer(transfer.id) : Promise.resolve(false)
                  }
                  onSave={(input) => actions.setActivityTransfer(activity.id, next.id, input)}
                  transfer={transfer}
                  tripStartDate={trip.startDate}
                />
              </ItineraryProposalHighlight>
            </div>
          );
        })}
      </Shell.Card>
      <DestinationTravelLeg
        actions={actions}
        canManage
        currency={trip.currency}
        destination={destination}
        nextDestination={trip.destinations[index + 1]}
        startDate={trip.startDate}
        tripDayCount={trip.totalDurationDays}
      />
      {index === trip.destinations.length - 1 ? (
        <BoundaryConnection
          actions={actions}
          boundary="departure"
          canManage
          currency={trip.currency}
          destination={destination}
          maximumDay={trip.totalDurationDays ?? destination.endDay ?? 1}
          minimumDay={destination.endDay ?? 1}
          startDate={trip.startDate}
          transfer={trip.departureTransfer}
        />
      ) : null}
    </div>
  );
}
