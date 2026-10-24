import { Trash2, X } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import { Form } from '@groam/ui/components/form';
import { FormActions } from '@groam/ui/components/form-actions';
import { FormField } from '@groam/ui/components/form-field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@groam/ui/components/select';
import { useFormSubmit } from '@groam/ui/hooks/use-form-submit';
import { useEffect, useRef, useState } from 'react';
import { activityDaysForDestination } from '@/features/trips/hooks/editor-day-destinations';
import {
  activityFormForEdit,
  canSubmitTripActivity
} from '@/features/trips/hooks/trip-activity-form-state';
import { useTripActivityEditor } from '@/features/trips/hooks/use-trip-activity-editor';
import { TripActivityFields } from '@/features/trips/trip-activity/trip-activity-fields';
import { testIds } from '@/lib/test-ids';
import type { EditorActivitySelection } from '@/types/itinerary-editor';
import type { Destination, TripActivityActions, TripDetail } from '@/types/trips';

function shouldCollapseDetails(
  selection: EditorActivitySelection,
  activity: Destination['activities'][number] | undefined
): boolean {
  return Boolean(selection.inline && (!activity || activity.dayNumber === activity.endDayNumber));
}

/** Activity editing stays in the day and time block that the traveler selected. */
export function EditorActivityForm({
  selection,
  destination,
  destinations,
  trip,
  actions,
  onChooseDestination,
  onClose,
  onUploadingChange
}: {
  selection: EditorActivitySelection;
  destination: Destination;
  destinations: Destination[];
  trip: TripDetail;
  actions: TripActivityActions;
  onChooseDestination: (id: Destination['id']) => void;
  onClose: () => void;
  onUploadingChange: (uploading: boolean) => void;
}) {
  const activity = destination.activities.find((item) => item.id === selection.activityId);
  const editor = useTripActivityEditor({
    ...actions,
    destination,
    currency: trip.currency,
    tripDayCount: trip.totalDurationDays ?? selection.day,
    tripStartDate: trip.startDate,
    onUploadingChange,
    initial: activity
      ? activityFormForEdit(activity)
      : {
          isOpen: true,
          dayNumber: String(selection.day),
          endDayNumber: String(selection.day),
          timeBlock: selection.period
        }
  });
  const formRef = useRef<HTMLElement>(null);
  useEffect(() => {
    formRef.current?.scrollIntoView?.({ block: 'nearest' });
  }, []);
  const form = useFormSubmit();
  // Removing has its own lifecycle, so only Save spins while saving.
  const removal = useFormSubmit();
  const [confirmingRemoval, setConfirmingRemoval] = useState(false);
  const pending = editor.isPending || editor.isUploading || form.isPending || removal.isPending;
  const save = form.handle(async () => {
    if (await editor.submit()) onClose();
  });
  const remove = async () => {
    if (!activity) return;
    await removal.run(async () => {
      if (await actions.removeActivity(activity.id)) onClose();
    });
  };
  const label = activity ? `Edit ${activity.title}` : `Add an activity to Day ${selection.day}`;
  return (
    <section
      aria-label={label}
      className="border-t border-primary/30 bg-card px-4 py-6 shadow-sm sm:px-6"
      data-testid={testIds.activityInlineEditor}
      ref={formRef}
    >
      <Form
        actions={
          <FormActions
            className="border-t border-border pt-4"
            isPending={form.isPending || editor.isPending}
            leading={
              activity ? (
                <ActivityRemoval
                  confirming={confirmingRemoval}
                  disabled={pending}
                  onConfirm={() => void remove()}
                  onDismiss={() => setConfirmingRemoval(false)}
                  onRequest={() => setConfirmingRemoval(true)}
                  title={activity.title}
                />
              ) : null
            }
            onCancel={onClose}
            submitDisabled={pending || !canSubmitTripActivity(editor)}
            submitLabel={activity ? 'Save' : 'Add to day'}
            submitTestId={testIds.activitySubmit}
          />
        }
        density="relaxed"
        error={form.error ?? removal.error ?? editor.error}
        isPending={pending}
        onSubmit={save}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h5 className="text-base font-semibold">
              {activity ? 'Edit activity' : 'Add activity'}
            </h5>
            <p className="mt-1 text-xs text-muted-foreground">
              {activity && activity.endDayNumber !== activity.dayNumber
                ? `Days ${activity.dayNumber}–${activity.endDayNumber}`
                : `Day ${selection.day}`}{' '}
              · {destination.name}
            </p>
          </div>
          <Button
            aria-label="Close activity editor"
            disabled={pending}
            onClick={onClose}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <X />
          </Button>
        </div>
        {!activity && destinations.length > 1 ? (
          <FormField className="max-w-sm" label="Destination">
            <Select
              disabled={pending}
              onValueChange={(id) => {
                const next = destinations.find((stop) => stop.id === id);
                if (next) {
                  editor.patch(
                    activityDaysForDestination(
                      editor.dayNumber,
                      editor.endDayNumber,
                      next,
                      selection.day
                    )
                  );
                  onChooseDestination(next.id);
                }
              }}
              value={destination.id}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {destinations.map((stop) => (
                  <SelectItem key={stop.id} value={stop.id}>
                    {stop.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        ) : null}
        <TripActivityFields compact={shouldCollapseDetails(selection, activity)} editor={editor} />
      </Form>
    </section>
  );
}

/** Remove beside the form buttons, with a one-step "are you sure" in the same place. */
function ActivityRemoval({
  confirming,
  disabled,
  onConfirm,
  onDismiss,
  onRequest,
  title
}: {
  confirming: boolean;
  disabled: boolean;
  onConfirm: () => void;
  onDismiss: () => void;
  onRequest: () => void;
  title: string;
}) {
  if (!confirming) {
    return (
      <Button
        aria-label={`Remove ${title}`}
        disabled={disabled}
        onClick={onRequest}
        size="sm"
        type="button"
        variant="ghost"
      >
        <Trash2 /> Remove
      </Button>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <p className="text-sm font-medium">Remove {title} from this idea?</p>
      <Button disabled={disabled} onClick={onDismiss} size="sm" type="button" variant="outline">
        Keep plan
      </Button>
      <Button disabled={disabled} onClick={onConfirm} size="sm" type="button" variant="destructive">
        Remove plan
      </Button>
    </div>
  );
}
