import { ISSUE_STATUSES, issueStatusMeta } from '@/features/issues/issue-status';
import type { TripBoardLane } from '@/types/trip-board';

/** Lanes in reading order, which is also the order arrow keys walk through while dragging. */
export const tripBoardLaneOrder: readonly TripBoardLane[] = ['agreed', 'review', ...ISSUE_STATUSES];

export const tripBoardLanes: Record<TripBoardLane, { subtitle: string; title: string }> = {
  agreed: { subtitle: 'What the group has settled', title: 'Agreed plan' },
  closed: { subtitle: 'Settled', title: issueStatusMeta.closed.label },
  in_progress: { subtitle: 'Someone is on it', title: issueStatusMeta.in_progress.label },
  open: { subtitle: 'Questions the group still has to settle', title: issueStatusMeta.open.label },
  review: { subtitle: 'Drafts and proposals the group is voting on', title: 'Ideas' },
  wont_do: { subtitle: 'Dropped on purpose', title: issueStatusMeta.wont_do.label }
};
