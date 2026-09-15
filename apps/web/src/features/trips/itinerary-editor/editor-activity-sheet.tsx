import { Button } from '@groam/ui/components/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from '@groam/ui/components/sheet';
import { Spinner } from '@groam/ui/components/spinner';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';
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

export function EditorActivitySheet({
  selection,
  destination,
  trip,
  actions,
  onClose
}: {
  selection: EditorActivitySelection;
  destination: Destination;
  trip: TripDetail;
  actions: TripActivityActions;
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
  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open && !pending) onClose();
      }}
    >
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-xl">
        <SheetHeader className="border-b border-border px-6 py-5 text-left">
          <SheetTitle>{activity ? 'Edit plan' : 'Add a plan'}</SheetTitle>
          <SheetDescription>
            Day {selection.day} · {destination.name}
          </SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          <TripActivityFields editor={editor} idPrefix="planner-activity" />
        </div>
        {confirmingRemoval ? (
          <div className="space-y-3 border-t border-border bg-muted/30 p-4">
            <p className="text-sm font-medium">Remove {activity?.title} from this idea?</p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                disabled={pending}
                onClick={() => setConfirmingRemoval(false)}
              >
                Keep plan
              </Button>
              <Button variant="destructive" disabled={pending} onClick={() => void remove()}>
                Remove plan
              </Button>
            </div>
          </div>
        ) : null}
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border bg-background p-4">
          {activity ? (
            <Button
              className="mr-auto"
              variant="ghost"
              size="icon-sm"
              aria-label={`Remove ${activity.title}`}
              disabled={pending}
              onClick={() => setConfirmingRemoval(true)}
            >
              <Trash2 />
            </Button>
          ) : null}
          <Button variant="outline" disabled={pending} onClick={onClose}>
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
      </SheetContent>
    </Sheet>
  );
}
