import type { Id } from '@groam/backend/data-model';
import { useTripOpenPolls } from '@/features/polls/hooks/use-polls';
import { useTripResearches } from '@/features/research/hooks/use-trip-researches';
import { buildQueueItems } from '@/features/trip-queue/queue-items';
import { useTripIssues } from '@/features/trips/hooks/use-trip-issues';
import { useTripVersions } from '@/features/trips/hooks/use-trip-versions';
import { useOptionalWorkspace } from '@/features/workspace/workspace-shell/workspace-state';
import type { QueueItem, QueueKind } from '@/types/queue';
import type { TabCounts } from '@/types/trips';

/**
 * Per queue, what waits on the viewer (else what is open) for Ideas, Issues, and Polls, plus
 * unread research; each appears once its list has loaded. Polls
 * count over the first page of open polls.
 */
export function useTripSectionCounts(tripId: Id<'trips'>, archived = false): TabCounts {
  const viewerUserId = useOptionalWorkspace()?.session.user.id;
  const { issues } = useTripIssues(tripId);
  const { proposals } = useTripVersions(tripId);
  const { isLoading: pollsLoading, polls } = useTripOpenPolls(tripId);
  const { isLoading: researchLoading, researches } = useTripResearches(tripId);
  const items = buildQueueItems({
    archived,
    ideas: proposals ?? [],
    issues: issues ?? [],
    polls,
    tripId,
    viewerUserId
  });
  return {
    ...(proposals ? { ideas: queueCount(items, 'idea') } : {}),
    ...(issues ? { issues: queueCount(items, 'issue') } : {}),
    ...(pollsLoading ? {} : { polls: queueCount(items, 'poll') }),
    ...(researchLoading
      ? {}
      : { research: researches.filter((research) => research.unread).length })
  };
}

/** What waits on the viewer in one queue, else what is open in it. */
function queueCount(items: readonly QueueItem[], kind: QueueKind) {
  const ofKind = items.filter((item) => item.kind === kind);
  const waiting = ofKind.filter((item) => item.yourTurn).length;
  return waiting > 0
    ? { count: waiting, waiting: true }
    : { count: ofKind.filter((item) => !item.settled).length, waiting: false };
}
