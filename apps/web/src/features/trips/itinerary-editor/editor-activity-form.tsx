import { Button } from '@groam/ui/components/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@groam/ui/components/select';
import { Spinner } from '@groam/ui/components/spinner';
import { Trash2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import {
  activityFormForEdit,
  canSubmitTripActivity
} from '@/features/trips/hooks/trip-activity-form-state';
import { useTripActivityEditor } from '@/features/trips/hooks/use-trip-activity-editor';
import { TripActivityFields } from '@/features/trips/trip-activity/trip-activity-fields';
import { useAsyncPending } from '@/features/workspace/hooks/use-async-pending';
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
  onClose
}: {
  selection: EditorActivitySelection;
  destination: Destination;
  destinations: Destination[];
  trip: TripDetail;
  actions: TripActivityActions;
  onChooseDestination: (id: Destination['id']) => void;
  onClose: () => void;
}) {
  const activity = destination.activities.find((item) => item.id === selection.activityId);
  const editor = useTripActivityEditor({
    ...actions,
    destination,
    currency: trip.currency,
    tripDayCount: trip.totalDurationDays ?? selection.day,
    tripStartDate: trip.startDate,
    initial: activity
      ? activityFormForEdit(activity)
      : {
          isOpen: true,
          dayNumber: String(selection.day),
          endDayNumber: String(selection.day),
          timeBlock: selection.period
        }
  });
  const formRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    formRef.current?.scrollIntoView?.({ block: 'nearest' });
  }, []);
  const removing = useAsyncPending();
  const [confirmingRemoval, setConfirmingRemoval] = useState(false);
  const pending = editor.isPending || editor.isUploading || removing.isPending;
  const save = async () => {
    if (await editor.submit()) onClose();
  };
  const remove = async () => {
    if (!activity) return;
    await removing.run(async () => {
      if (await actions.removeActivity(activity.id)) onClose();
    });
  };
  const label = activity ? `Edit ${activity.title}` : `Add an activity to Day ${selection.day}`;
  return (
    <section
      aria-label={label}
      className="border-t border-primary/30 bg-card px-4 py-5 shadow-sm sm:px-6"
      data-testid={testIds.activityInlineEditor}
      ref={formRef}
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h5 className="text-base font-semibold">{activity ? 'Edit activity' : 'Add activity'}</h5>
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
          variant="ghost"
        >
          <X />
        </Button>
      </div>
      {!activity && destinations.length > 1 ? (
        <div className="mb-5 max-w-sm space-y-2">
          <label className="text-sm font-medium" htmlFor={`activity-destination-${selection.day}`}>
            Destination for this activity
          </label>
          <Select
            onValueChange={(id) => onChooseDestination(id as Destination['id'])}
            value={destination.id}
          >
            <SelectTrigger aria-label="Destination" id={`activity-destination-${selection.day}`}>
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
        </div>
      ) : null}
      <TripActivityFields
        compact={shouldCollapseDetails(selection, activity)}
        editor={editor}
        idPrefix="planner-activity"
      />
      {confirmingRemoval ? (
        <div className="mt-5 space-y-3 rounded-lg border border-destructive/30 bg-muted/30 p-4">
          <p className="text-sm font-medium">Remove {activity?.title} from this idea?</p>
          <div className="flex justify-end gap-2">
            <Button
              disabled={pending}
              onClick={() => setConfirmingRemoval(false)}
              variant="outline"
            >
              Keep plan
            </Button>
            <Button disabled={pending} onClick={() => void remove()} variant="destructive">
              Remove plan
            </Button>
          </div>
        </div>
      ) : null}
      <div className="mt-6 flex flex-wrap items-center justify-end gap-2 border-t border-border pt-4">
        {activity ? (
          <Button
            aria-label={`Remove ${activity.title}`}
            className="mr-auto"
            disabled={pending}
            onClick={() => setConfirmingRemoval(true)}
            size="icon-sm"
            variant="ghost"
          >
            <Trash2 />
          </Button>
        ) : null}
        <Button disabled={pending} onClick={onClose} variant="outline">
          Cancel
        </Button>
        <Button
          data-testid={testIds.activitySubmit}
          disabled={pending || !canSubmitTripActivity(editor)}
          onClick={() => void save()}
        >
          {pending ? <Spinner /> : null}
          {activity ? 'Save changes' : 'Add to day'}
        </Button>
      </div>
    </section>
  );
}
