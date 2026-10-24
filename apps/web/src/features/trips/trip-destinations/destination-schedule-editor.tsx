import { MAX_DESTINATION_NOTES_LENGTH } from '@groam/backend/convex/modules/travel/destinations/lengths';
import { CalendarDays } from '@groam/icons';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@groam/ui/components/collapsible';
import { Form } from '@groam/ui/components/form';
import { FormActions } from '@groam/ui/components/form-actions';
import { FormField } from '@groam/ui/components/form-field';
import { Input } from '@groam/ui/components/input';
import { useFormSubmit } from '@groam/ui/hooks/use-form-submit';
import { useState } from 'react';
import {
  canSaveDestinationSchedule,
  destinationScheduleDraft,
  destinationScheduleFromDraft,
  destinationScheduleHasChanged
} from '@/features/trips/hooks/trip-destination-form-state';
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
  const pending = useFormSubmit();
  const hasChanged = destinationScheduleHasChanged(draft, destination);
  const reset = () => setDraft(destinationScheduleDraft(destination));
  const save = pending.handle(async () => {
    if (!canSaveDestinationSchedule(draft) || !hasChanged) return;
    await updateDestination(destination.id, destinationScheduleFromDraft(draft));
  });

  if (!canManage) {
    if (!destination.dayNotes) return null;
    return <p className="mt-2 text-sm text-muted-foreground">{destination.dayNotes}</p>;
  }

  return (
    <Collapsible className="mx-2 mt-4 rounded-xl border border-border sm:mx-3">
      <CollapsibleTrigger
        aria-label={`Schedule & notes for ${destination.name}`}
        className="flex w-full gap-2 rounded-xl px-3 py-3 text-left text-xs font-medium transition-colors hover:bg-muted/70"
      >
        <CalendarDays aria-hidden className="size-3.5 text-primary" />
        Schedule & notes
        {destination.dayNotes && (
          <span className="ml-2 hidden min-w-0 flex-1 truncate font-normal text-muted-foreground sm:block">
            {destination.dayNotes}
          </span>
        )}
      </CollapsibleTrigger>
      <CollapsibleContent keepMounted>
        <Form
          actions={
            <FormActions
              cancelLabel="Cancel"
              isPending={pending.isPending}
              onCancel={reset}
              submitDisabled={!hasChanged || !canSaveDestinationSchedule(draft)}
              submitLabel={hasChanged ? 'Save' : 'Saved'}
              submitTestId={testIds.destinationSaveSchedule}
            />
          }
          className="border-t border-border p-3"
          error={pending.error}
          isPending={pending.isPending}
          onSubmit={save}
          testId={testIds.destinationEditSchedule}
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
          <FormField label="Notes for this stop" maxLength={MAX_DESTINATION_NOTES_LENGTH}>
            <Input
              disabled={pending.isPending}
              onChange={(event) =>
                setDraft((current) => ({ ...current, notes: event.target.value }))
              }
              placeholder="Arrival, reservations, neighborhood…"
              value={draft.notes}
            />
          </FormField>
        </Form>
      </CollapsibleContent>
    </Collapsible>
  );
}
