import { isResolved } from '@groam/backend/convex/modules/travel/issues/status';
import { matchesIdeaStatus } from '@/features/ideas/hooks/idea-list-filter';
import { statusChangeRefusal } from '@/features/issues/issue-condition-rules';
import type {
  TripBoardDragItem,
  TripBoardDropDecision,
  TripBoardIdea,
  TripBoardIdeaItem,
  TripBoardIssueItem,
  TripBoardLane,
  TripBoardMove
} from '@/types/trip-board';
import { tripBoardLanes } from './trip-board-lanes';

const unavailable: TripBoardDropDecision = { outcome: 'unavailable' };

const allow = (move: TripBoardMove): TripBoardDropDecision => ({ move, outcome: 'allowed' });

const refuse = (reason: string): TripBoardDropDecision => ({ outcome: 'refused', reason });

const moveLabel = (lane: TripBoardLane) =>
  lane === 'closed' ? 'Mark done' : `Move to ${tripBoardLanes[lane].title}`;

/** Drafts, ideas in review, and ones that need an update: the ideas the Ideas lane shows. */
export const isOpenIdea = (status: TripBoardIdea['status']) => matchesIdeaStatus(status, 'pending');

export const itemTitle = (item: TripBoardDragItem) =>
  item.kind === 'issue' ? item.issue.title : item.idea.title;

export const itemId = (item: TripBoardDragItem) =>
  item.kind === 'issue' ? item.issue.id : item.idea.id;

export const itemLane = (item: TripBoardDragItem): TripBoardLane =>
  item.kind === 'issue' ? item.issue.status : 'review';

/** Whether a card can be lifted at all: archived trips are read-only, and only ideas in review can be applied. */
export function isDraggable(item: TripBoardDragItem) {
  if (item.archived) return false;
  return item.kind === 'idea'
    ? item.idea.status === 'in_review'
    : item.issue.canManage || item.canPropose;
}

/**
 * The single rulebook for the board: what dropping `item` on `lane` does. `unavailable` means the
 * lane is not a drop target for it. For issues, dropping on their own lane is a reorder.
 */
export function decideMove(item: TripBoardDragItem, lane: TripBoardLane): TripBoardDropDecision {
  return item.kind === 'idea' ? decideIdea(item, lane) : decideIssue(item, lane);
}

/** `decideMove` for a lane the card is not already in. */
export function decideTransfer(
  item: TripBoardDragItem,
  lane: TripBoardLane
): TripBoardDropDecision {
  return itemLane(item) === lane ? unavailable : decideMove(item, lane);
}

function decideIdea(item: TripBoardIdeaItem, lane: TripBoardLane): TripBoardDropDecision {
  if (lane !== 'agreed') return unavailable;
  return item.idea.canMerge
    ? allow({ kind: 'applyIdea', label: 'Apply', proposalId: item.idea.id })
    : refuse('Needs approvals before it can be applied');
}

function decideIssue(item: TripBoardIssueItem, lane: TripBoardLane): TripBoardDropDecision {
  const { issue } = item;
  if (lane === 'agreed') return unavailable;
  if (lane === 'review') {
    if (isResolved(issue.status)) return unavailable;
    if (item.link) {
      return {
        heading: 'This issue already has an idea',
        outcome: 'refused',
        reason: `“${item.link.idea.title}” is still open for it. Continue there instead`,
        tone: 'warning'
      };
    }
    return item.canPropose
      ? allow({ issueId: issue.id, kind: 'startIdea', label: 'Drop to start an idea' })
      : refuse('You can’t start ideas on this trip');
  }
  if (!issue.canManage) return refuse('You can’t move this issue');
  const refusal = statusChangeRefusal(issue.condition, issue.status, lane);
  if (refusal) return refuse(refusal);
  return allow({
    issue,
    kind: 'moveIssue',
    label: issue.status === lane ? 'Reorder' : moveLabel(lane),
    status: lane
  });
}
