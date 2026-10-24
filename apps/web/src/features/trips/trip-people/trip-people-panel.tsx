import { Users } from '@groam/icons';
import { DashedEmpty } from '@groam/ui/components/dashed-empty';
import { PageLoading } from '@groam/ui/components/page-loading';
import { useState } from 'react';
import { useTripTravelers } from '@/features/trips/hooks/use-trip-travelers';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { TripSectionPanel } from '@/features/trips/trip-detail/trip-section-panel';
import { plannedPerTravelerLabel } from '@/features/trips/trip-overview/trip-budget-label';
import { tripMetaLine } from '@/features/trips/trip-overview/trip-window-value';
import { useWorkspace } from '@/features/workspace/workspace-shell/workspace-state';
import { testIds } from '@/lib/test-ids';
import { TripPeopleRoster } from './trip-people-roster';
import { countRoster } from './trip-roster-groups';
import { useArrival } from './use-arrival';
import { useSeatActions } from './use-seat-actions';

/**
 * The People section as a boarding manifest: your pass, how ready the group is, then Blocked,
 * Deciding, Cleared and Not going, each person once. Seats are paid or covered on their rows; a
 * person's card changes their RSVP. Inviting someone to the group is the section header's button.
 */
export function TripPeoplePanel({ trip }: { trip: TripDetail }) {
  const viewerId = useWorkspace().session.user.id;
  const { goingCount, isLoading, setStatus, travelers } = useTripTravelers(trip.id);
  const { error, notice, seats } = useSeatActions(trip, viewerId);
  const [outOpen, setOutOpen] = useState(false);
  const { announcement, arrive } = useArrival({
    expandOut: setOutOpen,
    outExpanded: outOpen,
    takesPayments: seats !== null,
    travelers
  });
  const archived = trip.archivedAt !== null;
  const canManageOthers = trip.role === 'organizer';

  return (
    <TripSectionPanel testId={testIds.tripPeoplePanel} title="People">
      {archived ? (
        <p className="text-sm text-muted-foreground" role="note">
          This trip is archived, so RSVPs and payments are read-only until it is restored.
        </p>
      ) : null}
      <p aria-live="polite" className="sr-only" role="status">
        {announcement}
      </p>
      {notice ? (
        <p className="text-sm text-muted-foreground" role="status">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {isLoading ? (
        <PageLoading label="Loading travelers…" />
      ) : travelers.length === 0 ? (
        <DashedEmpty icon={Users} title="No travelers yet">
          Members of this group show up here once they join.
        </DashedEmpty>
      ) : (
        <TripPeopleRoster
          actions={{
            archived,
            arrive,
            canChange: (traveler) => !archived && (traveler.userId === viewerId || canManageOthers),
            counts: countRoster(travelers),
            goingCount,
            isOrganizer: canManageOthers,
            onChange: setStatus,
            seats,
            viewerId
          }}
          onOutOpenChange={setOutOpen}
          outOpen={outOpen}
          perTraveler={plannedPerTravelerLabel(trip)}
          place={trip.destination?.status === 'known' ? trip.destination.name : undefined}
          summaryTestId={testIds.tripPeopleSummary}
          travelers={travelers}
          when={tripMetaLine(trip)}
        />
      )}
    </TripSectionPanel>
  );
}
