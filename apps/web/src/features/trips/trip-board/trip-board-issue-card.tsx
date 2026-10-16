import { memo } from 'react';
import { IssueCard } from '@/features/issues/shared/issue-card';
import type { TripBoardIssue } from '@/types/trip-board';
import { assignMode } from './trip-board-assign';
import { TripBoardAssignee } from './trip-board-assignee';

const placement = { avatar: 'avatar', hover: 'hover', static: 'avatar' } as const;

/**
 * An issue card with its assignee control. It is memoised on the issue itself, so a drag that
 * only moves the lane's preview slot never re-renders the cards.
 */
export const TripBoardIssueCard = memo(function TripBoardIssueCard({
  issue,
  quiet
}: {
  issue: TripBoardIssue;
  quiet: boolean;
}) {
  const mode = assignMode(issue);
  return (
    <IssueCard
      assigneeAt={placement[mode]}
      assigneeSlot={mode === 'static' ? undefined : <TripBoardAssignee issue={issue} />}
      className={quiet ? 'bg-card/60' : undefined}
      issue={issue}
    />
  );
});
