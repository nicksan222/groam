import type { Id } from '@groam/backend/data-model';
import { toast } from '@groam/ui/components/toast';
import { useEffect } from 'react';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { jumpToDay } from '@/features/trips/trip-destinations/trip-jump-targets';
import {
  PENDING_CALENDAR_ACTIVITY_TTL_MS,
  usePendingCalendarActivityStore
} from '@/lib/stores/pending-calendar-activity-store';
import type { TripActivityActions } from '@/types/trips';

/**
 * Adds an activity planned on the shared trip's calendar to the idea started for it, once that
 * idea's working copy is open and editable. The idea's stops point back to the shared ones, so
 * the activity lands on the copy of the stop it was planned at; a stale activity is dropped.
 */
export function usePendingCalendarActivity({
  addActivity,
  proposalId,
  trip
}: {
  addActivity: TripActivityActions['addActivity'] | undefined;
  /** The idea open here; only the activity planned for it applies. */
  proposalId: Id<'tripProposals'> | undefined;
  trip: Pick<TripDetail, 'destinations' | 'permissions'>;
}) {
  const activity = usePendingCalendarActivityStore((state) => state.activity);
  const clear = usePendingCalendarActivityStore((state) => state.clear);
  useEffect(() => {
    if (!activity || !proposalId || activity.proposalId !== proposalId) return;
    if (Date.now() - activity.createdAt > PENDING_CALENDAR_ACTIVITY_TTL_MS) {
      clear();
      return;
    }
    if (!(addActivity && trip.permissions.canEdit)) return;
    // Taken from the store, not the render: a repeated effect must find it gone and add nothing.
    if (usePendingCalendarActivityStore.getState().activity !== activity) return;
    clear();
    const stop = trip.destinations.find(
      (destination) =>
        destination.sourceId === activity.sourceDestinationId ||
        destination.id === activity.sourceDestinationId
    );
    if (!stop) {
      toast(`${activity.input.title} couldn’t be added: its stop isn’t in this idea`);
      return;
    }
    void addActivity(stop.id, activity.input).then((added) => {
      if (!added) return;
      toast.success(`Added ${activity.input.title} to this idea`);
      jumpToDay(activity.input.schedule.day);
    });
  }, [activity, addActivity, clear, proposalId, trip]);
}
