import { isResolved } from '@groam/backend/convex/modules/travel/issues/status';
import type { Id } from '@groam/backend/data-model';
import type { IssueStatus } from '@/types/issues';
import type { TripBoardIssue, TripBoardLane } from '@/types/trip-board';

/**
 * Issues grouped by lane, each lane keeping the order the server returned (rank order), with the
 * ids of each lane's cards in the same order.
 */
export function issuesByLane(issues: readonly TripBoardIssue[]) {
  const lanes: Record<IssueStatus, TripBoardIssue[]> = {
    closed: [],
    in_progress: [],
    open: [],
    wont_do: []
  };
  for (const issue of issues) lanes[issue.status].push(issue);
  const ids = (cards: TripBoardIssue[]) => cards.map(({ id }) => id);
  return {
    issues: lanes,
    order: {
      closed: ids(lanes.closed),
      in_progress: ids(lanes.in_progress),
      open: ids(lanes.open),
      wont_do: ids(lanes.wont_do)
    }
  };
}

/**
 * Where a lifted card lands, from the same facts the sortable preview uses so the card drops where
 * it was shown. `laneIds` is the target lane's cards top to bottom (with the lifted one if it is
 * already there) and `overId` the card under it (`null` for the bare lane).
 *
 * The slot is counted among the lane's other cards. Over a card of its own lane the lifted card
 * takes that card's place, exactly as dnd-kit's list strategy shifts it, whichever half it is
 * over. From another lane it lands in the gap beside the over card, chosen by `below`: whether
 * the lifted card's centre is past that card's centre. Over the bare lane it goes last.
 */
export function locateDrop<T extends string>({
  activeId,
  below,
  lane,
  laneIds,
  overId
}: {
  activeId: string;
  below: boolean;
  lane: TripBoardLane;
  laneIds: readonly T[];
  overId: string | null;
}) {
  const own = laneIds.findIndex((id) => id === activeId);
  const over = laneIds.findIndex((id) => id === overId);
  const others = laneIds.filter((id) => id !== activeId);
  const index = over === -1 ? others.length : over + (own === -1 && below ? 1 : 0);
  return {
    afterIssueId: others[index],
    beforeIssueId: others[index - 1],
    index,
    lane,
    unchanged: own === index
  };
}

/**
 * Applies a board move to a rank-ordered issue list, mirroring what the server will do, so the
 * card lands where it was dropped before the mutation returns. The lane order is the filtered
 * list order, so placing the card after `beforeIssueId` (or before `afterIssueId`) is enough.
 * Status-derived fields move with it: `closedAt` is set while the new status is resolved and
 * cleared otherwise.
 */
export function applyIssueMove(
  issues: readonly TripBoardIssue[],
  move: {
    afterIssueId?: Id<'tripIssues'>;
    beforeIssueId?: Id<'tripIssues'>;
    issueId: Id<'tripIssues'>;
    status: IssueStatus;
  }
): TripBoardIssue[] {
  const moving = issues.find((issue) => issue.id === move.issueId);
  if (!moving) return [...issues];
  const moved = {
    ...moving,
    closedAt: isResolved(move.status) ? (moving.closedAt ?? Date.now()) : null,
    status: move.status
  };
  const rest = issues.filter((issue) => issue.id !== move.issueId);
  const before = move.beforeIssueId
    ? rest.findIndex((issue) => issue.id === move.beforeIssueId)
    : -1;
  if (before !== -1) return rest.toSpliced(before + 1, 0, moved);
  const after = move.afterIssueId ? rest.findIndex((issue) => issue.id === move.afterIssueId) : -1;
  if (after !== -1) return rest.toSpliced(after, 0, moved);
  return [...rest, moved];
}
