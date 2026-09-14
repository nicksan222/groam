import { Button } from '@groam/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@groam/ui/components/dialog';
import { FormField } from '@groam/ui/components/form-field';
import { Input } from '@groam/ui/components/input';
import { useState } from 'react';
import { updateTripDuration } from '@/features/trips/trip-detail/update-trip-duration';
import { TripDurationPlanner } from '@/features/trips/trip-overview/trip-duration-planner';
import { useAsyncPending } from '@/features/workspace/hooks/use-async-pending';
import type { ItineraryEditorProps } from '@/types/itinerary-editor';
export function EditorTripDates({
  trip,
  updateTrip,
  onClose
}: Pick<ItineraryEditorProps, 'trip' | 'updateTrip'> & { onClose: () => void }) {
  const [length, setLength] = useState(String(trip.totalDurationDays ?? 3));
  const pending = useAsyncPending();
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
            Choose the duration and optional start date for this idea.
          </DialogDescription>
        </DialogHeader>
        {!trip.startDate ? (
          <div className="space-y-3 rounded-xl border border-border p-4">
            <FormField
              label="Trip length in days"
              description="Keep the dates flexible. You can choose them later."
            >
              <Input
                type="number"
                min={minimumDays}
                max={365}
                value={length}
                onChange={(event) => setLength(event.target.value)}
                disabled={pending.isPending}
              />
            </FormField>
            <Button
              disabled={
                pending.isPending ||
                !Number.isInteger(Number(length)) ||
                Number(length) < minimumDays ||
                Number(length) > 365
              }
              onClick={() =>
                void pending.run(async () => {
                  if (await updateTripDuration(trip, { update: updateTrip }, Number(length)))
                    onClose();
                })
              }
            >
              Save trip length
            </Button>
          </div>
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
