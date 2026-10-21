import { api } from '@groam/backend/api';
import type { Id } from '@groam/backend/data-model';
import { toast } from '@groam/ui/components/toast';
import { useAction, useMutation } from 'convex/react';
import { useCallback, useMemo, useRef } from 'react';
import { ideaCloneHref } from '@/features/ideas/idea-href';
import { useCreateTripVersion } from '@/features/trips/hooks/use-trip-versions';
import { decideMove } from '@/features/trips/trip-board/trip-board-moves';
import { applyIssueMove } from '@/features/trips/trip-board/trip-board-order';
import { attempt } from '@/lib/errors';
import { useNavigate } from '@/lib/navigation/router';
import type { IssueStatus } from '@/types/issues';
import type { TripBoardDragItem, TripBoardDropTarget, TripBoardIssue } from '@/types/trip-board';

const conflictMessage =
  'This idea conflicts with the shared plan. Open it to update it before applying.';

/**
 * Runs board drops through the shared decision rules. Issue moves land instantly through an
 * optimistic update of the trip's issue list; starting an idea and applying one wait for the
 * server. Once an issue dropped into In progress has moved, its page opens so the handler can be
 * set there.
 */
export function useTripBoardMoves(tripId: Id<'trips'>) {
  const navigate = useNavigate();
  const createVersion = useCreateTripVersion(tripId);
  const moveMutation = useMutation(api.routes.trips.issues.move.run);
  const moveIssue = useMemo(
    () =>
      moveMutation.withOptimisticUpdate((store, args) => {
        const query = api.routes.trips.issues.list.run;
        const issues = store.getQuery(query, { tripId });
        if (issues) store.setQuery(query, { tripId }, applyIssueMove(issues, args));
      }),
    [moveMutation, tripId]
  );
  const mergeAction = useAction(api.routes.trips.versions.merge.run);
  const waiting = useRef(false);

  /** Starting or applying an idea is slow and not undoable, so only one runs at a time. */
  const exclusive = useCallback(async (action: () => Promise<void>) => {
    if (waiting.current) {
      toast.info('Already working on it');
      return;
    }
    waiting.current = true;
    try {
      await action();
    } finally {
      waiting.current = false;
    }
  }, []);

  const reposition = useCallback(
    async (issue: TripBoardIssue, status: IssueStatus, target: TripBoardDropTarget) => {
      if (target.unchanged) return;
      await moveIssue({
        afterIssueId: target.afterIssueId,
        beforeIssueId: target.beforeIssueId,
        issueId: issue.id,
        status
      });
      if (issue.status !== 'in_progress' && status === 'in_progress') {
        void navigate({ params: { issueId: issue.id }, to: '/issues/$issueId' });
      }
    },
    [moveIssue, navigate]
  );

  const apply = useCallback(
    (proposalId: Id<'tripProposals'>) =>
      exclusive(async () => {
        if ((await mergeAction({ proposalId })) === 'applied') {
          toast.success('Applied to the shared trip');
        } else {
          toast.warning(conflictMessage);
        }
      }),
    [exclusive, mergeAction]
  );

  const startIdea = useCallback(
    (issueId: Id<'tripIssues'>) =>
      exclusive(async () => {
        const version = await createVersion({ issueId });
        if (version) {
          void navigate(ideaCloneHref({ id: version.proposalId, sourceTripId: tripId }));
        }
      }),
    [createVersion, exclusive, navigate, tripId]
  );

  const run = useCallback(
    async (item: TripBoardDragItem, target: TripBoardDropTarget) => {
      const decision = decideMove(item, target.lane);
      if (decision.outcome === 'unavailable') return;
      if (decision.outcome === 'refused') {
        if (decision.tone === 'warning') {
          toast.warning(decision.heading ?? decision.reason, {
            description: decision.heading ? decision.reason : undefined
          });
        } else toast.info(decision.reason);
        return;
      }
      const { move } = decision;
      if (move.kind === 'applyIdea') return apply(move.proposalId);
      if (move.kind === 'startIdea') return startIdea(move.issueId);
      return reposition(move.issue, move.status, target);
    },
    [apply, reposition, startIdea]
  );

  const drop = useCallback(
    (item: TripBoardDragItem, target: TripBoardDropTarget) =>
      attempt(() => run(item, target), 'Unable to move this card'),
    [run]
  );

  return { drop };
}
