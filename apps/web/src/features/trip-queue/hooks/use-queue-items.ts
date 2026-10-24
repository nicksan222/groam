import type { Id } from '@groam/backend/data-model';
import { useMemo } from 'react';
import { buildQueueItems } from '@/features/trip-queue/queue-items';
import { useTripIssues } from '@/features/trips/hooks/use-trip-issues';
import { useTripVersions } from '@/features/trips/hooks/use-trip-versions';
import { useOptionalWorkspace } from '@/features/workspace/workspace-shell/workspace-state';
import type { PollFeed, QueueKind } from '@/types/queue';

const none: never[] = [];
const noPolls: PollFeed = {
  canLoadMore: false,
  isLoading: false,
  loadMore: () => undefined,
  polls: none
};

/**
 * The open things of one kind in a trip (its issues, ideas, or polls), the viewer's turn first.
 * Issues and ideas subscribe here; the polls arrive as `pollFeed`, which the page opens once and
 * shares with the assistant's context. It loads once its list has.
 */
export function useQueueItems({
  archived,
  kind,
  pollFeed = noPolls,
  tripId
}: {
  archived: boolean;
  kind: QueueKind;
  pollFeed?: PollFeed;
  tripId: Id<'trips'>;
}) {
  const viewerUserId = useOptionalWorkspace()?.session.user.id;
  const { issues } = useTripIssues(tripId, kind === 'issue');
  const { proposals } = useTripVersions(tripId, kind === 'idea');
  const { canLoadMore, isLoading: pollsLoading, loadMore, polls } = pollFeed;
  const isLoading = {
    idea: proposals === undefined,
    issue: issues === undefined,
    poll: pollsLoading
  }[kind];
  const items = useMemo(
    () =>
      buildQueueItems({
        archived,
        ideas: proposals ?? none,
        issues: issues ?? none,
        polls: kind === 'poll' ? polls : none,
        tripId,
        viewerUserId
      }),
    [archived, issues, kind, polls, proposals, tripId, viewerUserId]
  );
  return { canLoadMore, isLoading, items, loadMore };
}
