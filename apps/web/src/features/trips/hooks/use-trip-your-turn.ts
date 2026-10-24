import type { Id } from '@groam/backend/data-model';
import { useMemo } from 'react';
import { useTripOpenPolls } from '@/features/polls/hooks/use-polls';
import { buildQueueItems } from '@/features/trip-queue/queue-items';
import { useTripIssues } from '@/features/trips/hooks/use-trip-issues';
import { useTripVersions } from '@/features/trips/hooks/use-trip-versions';
import {
  leftOutByKind,
  mandatoryProgress,
  yourTurnItems,
  yourTurnLimit
} from '@/features/trips/trip-plan/your-turn';
import { useOptionalWorkspace } from '@/features/workspace/workspace-shell/workspace-state';

const none: never[] = [];

/**
 * What Plan's "your turn" strip shows: up to three of the viewer's open issues, ideas, and polls, the
 * mandatory-issue progress, and whether both lists have loaded. It reads the same lists as the
 * sidebar's counts (polls over their first page). `more` counts what
 * the strip leaves out, by the section that lists it.
 */
export function useTripYourTurn(tripId: Id<'trips'>, archived: boolean) {
  const viewerUserId = useOptionalWorkspace()?.session.user.id;
  const { issues } = useTripIssues(tripId);
  const { proposals } = useTripVersions(tripId);
  const { isLoading: pollsLoading, polls } = useTripOpenPolls(tripId);
  const waiting = useMemo(
    () =>
      yourTurnItems(
        buildQueueItems({
          archived,
          ideas: proposals ?? none,
          issues: issues ?? none,
          polls,
          tripId,
          viewerUserId
        })
      ),
    [archived, issues, polls, proposals, tripId, viewerUserId]
  );
  return {
    isLoading: issues === undefined || proposals === undefined || pollsLoading,
    items: waiting.slice(0, yourTurnLimit),
    more: leftOutByKind(waiting),
    progress: useMemo(() => mandatoryProgress(issues), [issues]),
    total: waiting.length
  };
}
