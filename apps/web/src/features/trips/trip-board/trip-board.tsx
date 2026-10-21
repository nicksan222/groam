import { cn } from '@groam/ui/lib/utils';
import { useMemo } from 'react';
import { CreateIssueDialog } from '@/features/issues/issue-list/create-issue-dialog';
import { useTripBoardFullscreen } from '@/features/trips/hooks/use-trip-board-fullscreen';
import { useTripBoardMoves } from '@/features/trips/hooks/use-trip-board-moves';
import { useTripIssues } from '@/features/trips/hooks/use-trip-issues';
import { useTripVersions } from '@/features/trips/hooks/use-trip-versions';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { useOpenState } from '@/features/workspace/hooks/use-open-state';
import { useOptionalWorkspace } from '@/features/workspace/workspace-shell/workspace-state';
import { useNavigate } from '@/lib/navigation/router';
import { agreedCardCount, agreedDays } from './agreed-days';
import { TripBoardAgreedLane } from './trip-board-agreed-lane';
import { TripBoardContext } from './trip-board-context';
import { TripBoardDnd } from './trip-board-dnd';
import { TripBoardFullscreenToggle } from './trip-board-fullscreen-toggle';
import { TripBoardHistoryLink } from './trip-board-history-link';
import { TripBoardIssueLane } from './trip-board-issue-lane';
import { TripBoardIssuesFooter } from './trip-board-issues-footer';
import { tripBoardLinks } from './trip-board-links';
import { TripBoardMandatoryProgress } from './trip-board-mandatory-progress';
import { isOpenIdea } from './trip-board-moves';
import { issuesByLane } from './trip-board-order';
import { TripBoardReviewLane } from './trip-board-review-lane';
import { TripBoardScroller } from './trip-board-scroller';

/**
 * The shared trip as a Trello-style planning board: agreed plan, ideas, then the four
 * issue lanes. Cards drag between and within lanes; every drop goes through `decideMove`.
 */
export function TripBoard({
  onStartIdea,
  startingIdea = false,
  trip
}: {
  onStartIdea?: () => void;
  startingIdea?: boolean;
  trip: TripDetail;
}) {
  const navigate = useNavigate();
  const viewerUserId = useOptionalWorkspace()?.session.user.id;
  const { proposals } = useTripVersions(trip.id);
  const { issues } = useTripIssues(trip.id);
  const { drop } = useTripBoardMoves(trip.id);
  const createIssue = useOpenState(false);
  const fullscreen = useTripBoardFullscreen();

  const archived = Boolean(trip.archivedAt);
  const { canPropose } = trip.permissions;
  const ideasInReview = useMemo(
    () => proposals?.filter((idea) => isOpenIdea(idea.status)),
    [proposals]
  );
  const links = useMemo(() => tripBoardLinks(ideasInReview, issues), [ideasInReview, issues]);
  const board = useMemo(
    () => ({ links, rights: { archived, canPropose }, tripId: trip.id, viewerUserId }),
    [archived, canPropose, links, trip.id, viewerUserId]
  );
  const lanes = useMemo(() => issues && issuesByLane(issues), [issues]);
  const days = useMemo(() => agreedDays(trip), [trip]);
  const counts = {
    agreed: agreedCardCount(days),
    closed: lanes?.issues.closed.length,
    in_progress: lanes?.issues.in_progress.length,
    open: lanes?.issues.open.length,
    review: ideasInReview?.length,
    wont_do: lanes?.issues.wont_do.length
  };
  const appliedCount = proposals?.filter((idea) => idea.status === 'merged').length ?? 0;

  return (
    <TripBoardContext.Provider value={board}>
      <div
        className={cn(
          'flex min-h-0 flex-1 flex-col bg-background',
          fullscreen.active && 'fixed inset-0 z-40 pt-2'
        )}
      >
        {fullscreen.active ? (
          <div className="flex justify-end px-6">
            <TripBoardFullscreenToggle />
          </div>
        ) : null}
        <TripBoardDnd onDrop={(item, target) => void drop(item, target)} order={lanes?.order}>
          <TripBoardScroller counts={counts}>
            <TripBoardAgreedLane days={days} trip={trip} />
            <TripBoardReviewLane
              appliedCount={appliedCount}
              ideas={ideasInReview}
              onStartIdea={onStartIdea}
              startingIdea={startingIdea}
            />
            <TripBoardIssueLane
              empty="Nothing to decide. The group has settled everything for now."
              footer={<TripBoardIssuesFooter onNewIssue={createIssue.openPanel} />}
              issues={lanes?.issues.open}
              meta={<TripBoardMandatoryProgress issues={issues} />}
              status="open"
            />
            <TripBoardIssueLane
              empty="Nobody is on anything right now. Drop a card here when someone picks it up."
              issues={lanes?.issues.in_progress}
              status="in_progress"
            />
            <TripBoardIssueLane
              empty="Nothing settled yet."
              footer={<TripBoardHistoryLink tripId={trip.id} />}
              issues={lanes?.issues.closed}
              status="closed"
            />
            <TripBoardIssueLane
              empty="Nothing dropped. Drop a card here to set it aside."
              issues={lanes?.issues.wont_do}
              status="wont_do"
            />
          </TripBoardScroller>
        </TripBoardDnd>
      </div>
      <CreateIssueDialog
        onClose={createIssue.closePanel}
        onCreated={(issueId) => {
          createIssue.closePanel();
          void navigate({ params: { issueId }, to: '/issues/$issueId' });
        }}
        open={createIssue.open}
        tripId={trip.id}
      />
    </TripBoardContext.Provider>
  );
}
