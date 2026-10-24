import { useState } from 'react';
import { CreateIssueDialog } from '@/features/issues/shared/create-issue-dialog';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { TripPlanPage } from '@/features/trips/trip-detail/trip-plan-page';
import { TripDayPlanner } from '@/features/trips/trip-planner/trip-day-planner';
import { useNavigate } from '@/lib/navigation/router';
import type { IssueFlagTarget } from '@/types/issues';
import { TripYourTurn } from './trip-your-turn';

/**
 * A shared trip's Plan: the agreed itinerary day by day, under a slim "your turn" strip. The
 * calendar is its own section. `day` (from `?day=N`) scrolls that day into view. Each card can be
 * flagged, which opens an issue about it; an archived trip is read-only, so it has no Flag.
 */
export function TripPlanPanel({ day, trip }: { day?: number; trip: TripDetail }) {
  const navigate = useNavigate();
  const [flagging, setFlagging] = useState<IssueFlagTarget | null>(null);
  const archived = trip.archivedAt !== null;
  return (
    <>
      <TripPlanPage
        day={day}
        itinerary={<TripDayPlanner onFlag={archived ? undefined : setFlagging} trip={trip} />}
        lead={<TripYourTurn trip={trip} />}
        trip={trip}
      />
      {flagging ? (
        <CreateIssueDialog
          about={flagging}
          onClose={() => setFlagging(null)}
          onCreated={(issueId) => {
            setFlagging(null);
            void navigate({ params: { issueId }, to: '/issues/$issueId' });
          }}
          open
          tripId={trip.id}
        />
      ) : null}
    </>
  );
}
