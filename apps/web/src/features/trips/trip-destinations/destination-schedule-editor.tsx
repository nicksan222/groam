import { Button } from '@groam/ui/components/button';
import { FormField } from '@groam/ui/components/form-field';
import { Input } from '@groam/ui/components/input';
import { Spinner } from '@groam/ui/components/spinner';
import { CalendarDays, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import {
  canSaveDestinationSchedule,
  destinationScheduleDraft,
  destinationScheduleFromDraft,
  destinationScheduleHasChanged
} from '@/features/trips/hooks/trip-destination-form-state';
import { useAsyncPending } from '@/features/workspace/hooks/use-async-pending';
import { testIds } from '@/lib/test-ids';
import type { Destination, UpdateDestination } from './destination-types';
import { ScheduledDestinationDays } from './scheduled-destination-days';

export function DestinationScheduleEditor({
  canManage,
  destination,
  destinations,
  maximumDay,
  minimumDay,
  startDate,
  tripDayCount,
  updateDestination
}: {
  canManage: boolean;
  destination: Destination;
  destinations: readonly Destination[];
  maximumDay: number | null;
  minimumDay: number;
  startDate: null | string;
  tripDayCount: number | null;
  updateDestination: UpdateDestination;
}) {
  const [draft, setDraft] = useState(() => destinationScheduleDraft(destination));
  const pending = useAsyncPending();
  const hasChanged = destinationScheduleHasChanged(draft, destination);
  const reset = () => setDraft(destinationScheduleDraft(destination));
  const save = async () => {
    if (!canSaveDestinationSchedule(draft) || !hasChanged) return;
    await pending.run(async () => {
      await updateDestination(destination.id, destinationScheduleFromDraft(draft));
    });
  };

  if (!canManage) {
    if (!destination.dayNotes) return null;
    return <p className="mt-2 text-sm text-muted-foreground">{destination.dayNotes}</p>;
  }

  return (
    <details className="group/schedule mx-2 mt-4 rounded-xl border border-border sm:mx-3">
      <summary
        aria-label={`Schedule & notes for ${destination.name}`}
        className="flex cursor-pointer list-none items-center gap-2 rounded-xl px-3 py-3 text-xs font-medium transition-colors hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden"
      >
        <CalendarDays aria-hidden className="size-3.5 text-primary" />
        Schedule & notes
        {destination.dayNotes && (
          <span className="ml-2 hidden min-w-0 flex-1 truncate font-normal text-muted-foreground sm:block">
            {destination.dayNotes}
          </span>
        )}
        <ChevronDown
          aria-hidden
          className="ml-auto size-3.5 shrink-0 text-muted-foreground transition-transform group-open/schedule:rotate-180 motion-reduce:transition-none"
        />
      </summary>
      <div
        className="grid gap-3 border-t border-border p-3"
        data-testid={testIds.destinationEditSchedule}
      >
        <ScheduledDestinationDays
          canManage={canManage}
          destination={destination}
          destinations={destinations}
          endDay={draft.endDay}
          isPending={pending.isPending}
          maximumDay={maximumDay}
          minimumDay={minimumDay}
          setEndDay={(endDay) => setDraft((current) => ({ ...current, endDay }))}
          setStartDay={(startDay) => setDraft((current) => ({ ...current, startDay }))}
          startDate={startDate}
          startDay={draft.startDay}
          tripDayCount={tripDayCount}
        />
        <FormField label="Notes for this stop">
          <Input
            disabled={pending.isPending}
            maxLength={240}
            onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
            placeholder="Arrival, reservations, neighborhood…"
            value={draft.notes}
          />
        </FormField>
        <div className="flex justify-end gap-2">
          <Button
            disabled={pending.isPending || !hasChanged}
            onClick={reset}
            type="button"
            variant="ghost"
          >
            Cancel
          </Button>
          <Button
            data-testid={testIds.destinationSaveSchedule}
            disabled={pending.isPending || !hasChanged || !canSaveDestinationSchedule(draft)}
            onClick={() => void save()}
            type="button"
          >
            {pending.isPending && <Spinner />} {hasChanged ? 'Save schedule' : 'Saved'}
          </Button>
        </div>
      </div>
    </details>
  );
}
