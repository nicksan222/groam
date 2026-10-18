import Shell from '@groam/ui/components/shell/client';
import { MapPin } from 'lucide-react';
import { destinationMoveClearsTravel } from '@/features/trips/hooks/trip-destination-form-state';
import { DestinationControls } from '@/features/trips/trip-destinations/destination-controls';
import { DestinationScheduleEditor } from '@/features/trips/trip-destinations/destination-schedule-editor';
import { useAsyncPending } from '@/features/workspace/hooks/use-async-pending';
import { useConfirm } from '@/features/workspace/workspace-shell/use-confirm-dialog';
import { testIds } from '@/lib/test-ids';
import type { ItineraryEditorProps } from '@/types/itinerary-editor';
import type { Destination } from '@/types/trips';
import { EditorDestinationPhoto } from './editor-destination-photo';

export function EditorRouteStop({
  destination,
  trip,
  moveDestination,
  removeDestination,
  updateDestination
}: Pick<
  ItineraryEditorProps,
  'trip' | 'moveDestination' | 'removeDestination' | 'updateDestination'
> & { destination: Destination }) {
  const index = trip.destinations.findIndex((item) => item.id === destination.id);
  const previous = trip.destinations[index - 1];
  const next = trip.destinations[index + 1];
  const pending = useAsyncPending();
  const confirm = useConfirm();
  const move = async (direction: 'earlier' | 'later') => {
    const clears = destinationMoveClearsTravel(
      trip.destinations,
      index,
      trip.arrivalTransfer !== null,
      trip.departureTransfer !== null
    );
    if (
      clears[direction] &&
      !(await confirm(`Move ${destination.name}?`, 'Affected travel details will be cleared.'))
    )
      return;
    await pending.run(() => moveDestination(destination.id, direction));
  };
  const remove = async () => {
    if (
      await confirm(
        `Remove ${destination.name}?`,
        'Its activities, stays, and connected travel will also be removed from this idea.'
      )
    )
      await pending.run(() => removeDestination(destination.id));
  };
  return (
    <Shell.Card
      as="section"
      data-testid={testIds.destinationCard}
      data-place-name={destination.name}
      className="overflow-hidden"
    >
      <div className="flex flex-wrap items-start gap-3 p-4">
        <EditorDestinationPhoto
          src={destination.coverUrl}
          name={destination.name}
          className="h-20 w-24 shrink-0 rounded-lg"
        />
        <div className="min-w-0 flex-1 py-1">
          <p className="flex items-center gap-1.5 text-xs font-medium text-primary">
            <MapPin aria-hidden="true" className="size-3" />
            Stop {index + 1}
          </p>
          <h3 className="mt-1 break-words text-sm font-semibold">{destination.name}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {destination.startDay && destination.endDay
              ? destination.startDay === destination.endDay
                ? `Day ${destination.startDay}`
                : `Days ${destination.startDay}–${destination.endDay}`
              : 'Choose its place in your trip'}
          </p>
        </div>
        <DestinationControls
          canManage
          name={destination.name}
          nextName={next?.name}
          previousName={previous?.name}
          isMoving={null}
          isRemoving={pending.isPending}
          onMove={(direction) => void move(direction)}
          onRemove={() => void remove()}
        />
      </div>
      <div className="border-t border-border p-4">
        <DestinationScheduleEditor
          canManage
          destination={destination}
          destinations={trip.destinations}
          minimumDay={
            trip.destinations.slice(0, index).findLast((stop) => stop.endDay !== null)?.endDay ?? 1
          }
          maximumDay={
            trip.destinations.slice(index + 1).find((stop) => stop.startDay !== null)?.startDay ??
            trip.totalDurationDays
          }
          startDate={trip.startDate}
          tripDayCount={trip.totalDurationDays}
          updateDestination={updateDestination}
        />
      </div>
    </Shell.Card>
  );
}
