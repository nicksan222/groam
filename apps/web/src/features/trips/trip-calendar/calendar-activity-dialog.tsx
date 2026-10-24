import { FormDialog } from '@groam/ui/components/form-dialog';
import { FormField } from '@groam/ui/components/form-field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@groam/ui/components/select';
import { useFormSubmit } from '@groam/ui/hooks/use-form-submit';
import { useState } from 'react';
import {
  activityDaysForDestination,
  destinationsForDay
} from '@/features/trips/hooks/editor-day-destinations';
import { canSubmitTripActivity } from '@/features/trips/hooks/trip-activity-form-state';
import { useTripActivityEditor } from '@/features/trips/hooks/use-trip-activity-editor';
import type { TripDestinationActivityInput } from '@/features/trips/hooks/use-trips';
import { TripActivityFields } from '@/features/trips/trip-activity/trip-activity-fields';
import { testIds } from '@/lib/test-ids';
import type { CalendarActivityDraft } from '@/types/trip-planner';
import type { Destination, TripDetail } from '@/types/trips';

/** "Day 3 · 09:00–10:00", or the days alone for a whole-day slot. */
function draftWhen(draft: CalendarActivityDraft): string {
  const days = draft.endDay > draft.day ? `Days ${draft.day}–${draft.endDay}` : `Day ${draft.day}`;
  if (!draft.startTime) return days;
  return `${days} · ${draft.startTime}${draft.endTime ? `–${draft.endTime}` : ''}`;
}

const copy = {
  add: {
    description:
      'Name it, then add the place and any details. Times can be changed under More options.',
    submitLabel: 'Add to the plan',
    title: 'Add an activity'
  },
  propose: {
    description:
      'The agreed plan changes through ideas. This starts one with the activity in it, for the group to look over.',
    submitLabel: 'Start an idea with it',
    title: 'Suggest an activity'
  }
} as const;

/**
 * The activity a traveler is planning in the slot they picked on the calendar. In an idea it is
 * added straight away (`add`); on the shared trip it starts an idea holding it (`propose`).
 */
export function CalendarActivityDialog({
  draft,
  mode,
  onClose,
  onSubmit,
  trip
}: {
  draft: CalendarActivityDraft;
  mode: 'add' | 'propose';
  onClose: () => void;
  onSubmit: (destination: Destination, input: TripDestinationActivityInput) => Promise<boolean>;
  trip: TripDetail;
}) {
  const options = destinationsForDay(trip.destinations, draft.day);
  const choices = options.length ? options : trip.destinations;
  const [destinationId, setDestinationId] = useState(choices[0]?.id);
  const destination = choices.find((stop) => stop.id === destinationId) ?? choices[0];
  if (!destination) return null;
  return (
    <CalendarActivityForm
      choices={choices}
      destination={destination}
      draft={draft}
      mode={mode}
      onChooseDestination={setDestinationId}
      onClose={onClose}
      onSubmit={onSubmit}
      trip={trip}
    />
  );
}

function CalendarActivityForm({
  choices,
  destination,
  draft,
  mode,
  onChooseDestination,
  onClose,
  onSubmit,
  trip
}: {
  choices: Destination[];
  destination: Destination;
  draft: CalendarActivityDraft;
  mode: 'add' | 'propose';
  onChooseDestination: (id: Destination['id']) => void;
  onClose: () => void;
  onSubmit: (destination: Destination, input: TripDestinationActivityInput) => Promise<boolean>;
  trip: TripDetail;
}) {
  const [uploading, setUploading] = useState(false);
  const editor = useTripActivityEditor({
    addActivity: (_, input) => onSubmit(destination, input),
    currency: trip.currency,
    destination,
    initial: {
      dayNumber: String(draft.day),
      endDayNumber: String(draft.endDay),
      endTime: draft.endTime ?? '',
      isOpen: true,
      startTime: draft.startTime ?? '',
      timeBlock: draft.timeBlock
    },
    onUploadingChange: setUploading,
    tripDayCount: trip.totalDurationDays ?? draft.endDay,
    tripStartDate: trip.startDate,
    updateActivity: async () => false
  });
  const text = copy[mode];
  const form = useFormSubmit();
  const pending = form.isPending || editor.isPending || uploading;
  const submit = form.handle(async () => {
    if (await editor.submit()) onClose();
  });
  return (
    <FormDialog
      description={text.description}
      error={form.error ?? editor.error}
      isPending={pending}
      onClose={() => {
        if (!pending) onClose();
      }}
      onSubmit={submit}
      open
      size="tall"
      submitDisabled={!canSubmitTripActivity(editor)}
      submitLabel={text.submitLabel}
      testId={testIds.tripCalendarActivityDialog}
      title={text.title}
    >
      <p className="text-sm font-medium" data-testid={testIds.tripCalendarActivityWhen}>
        {draftWhen(draft)}
        {choices.length > 1 ? null : ` · ${destination.name}`}
      </p>
      {choices.length > 1 ? (
        <FormField className="max-w-sm" label="Destination">
          <StopSelect
            choices={choices}
            disabled={pending}
            onChange={(id) => {
              const next = choices.find((stop) => stop.id === id);
              if (!next) return;
              editor.patch(
                activityDaysForDestination(editor.dayNumber, editor.endDayNumber, next, draft.day)
              );
              onChooseDestination(next.id);
            }}
            value={destination.id}
          />
        </FormField>
      ) : null}
      <TripActivityFields compact editor={editor} />
    </FormDialog>
  );
}

/** Select that takes the `id` FormField generates, so the "Destination" label targets the trigger. */
function StopSelect({
  choices,
  disabled,
  id,
  onChange,
  value
}: {
  choices: Destination[];
  disabled: boolean;
  id?: string;
  onChange: (id: Destination['id']) => void;
  value: Destination['id'];
}) {
  return (
    <Select
      disabled={disabled}
      onValueChange={(next) => onChange(next as Destination['id'])}
      value={value}
    >
      <SelectTrigger id={id}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {choices.map((stop) => (
          <SelectItem key={stop.id} value={stop.id}>
            {stop.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
