import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@groam/ui/components/dialog';
import { updateTripDuration } from '@/features/trips/trip-detail/update-trip-duration';
import { TripDurationPlanner } from '@/features/trips/trip-overview/trip-duration-planner';
import type { ItineraryEditorProps } from '@/types/itinerary-editor';
import { EditorTripLengthForm } from './editor-trip-length-form';

export function EditorTripDates({
  trip,
  updateTrip,
  onClose
}: Pick<ItineraryEditorProps, 'trip' | 'updateTrip'> & { onClose: () => void }) {
  const minimumDays = Math.max(
    1,
    ...trip.destinations.flatMap((stop) => [
      stop.endDay ?? 0,
      ...stop.activities.map((activity) => activity.endDayNumber),
      ...stop.stays.map((stay) => stay.checkOutDay)
    ])
  );
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set the shape of your trip</DialogTitle>
          <DialogDescription>
            Choose how long the trip runs, and a start date if you know it.
          </DialogDescription>
        </DialogHeader>
        {!trip.startDate ? (
          <EditorTripLengthForm
            initialDays={trip.totalDurationDays ?? 3}
            minimumDays={minimumDays}
            onSave={async (days) => {
              if (await updateTripDuration(trip, { update: updateTrip }, days)) onClose();
            }}
          />
        ) : null}
        <TripDurationPlanner
          canEdit
          minimumDays={minimumDays}
          startDate={trip.startDate}
          totalDays={trip.totalDurationDays}
          onSave={async (days, date) => {
            const saved = await updateTripDuration(trip, { update: updateTrip }, days, date);
            if (saved) onClose();
            return saved;
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
